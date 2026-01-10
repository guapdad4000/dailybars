// ============================================================================
// SCRATCH LAB - VINYL-THEMED VOCAL RECORDING STUDIO
// Premium feature for VIP/Pro users and Moderators/Admins
// ============================================================================

const { useState, useEffect, useRef, useCallback } = React;

const ScratchLabView = ({ user, isPremium }) => {
    // Session State
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPopped, setIsPopped] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [useCountdown, setUseCountdown] = useState(true);
    const [layers, setLayers] = useState([]);
    const [beat, setBeat] = useState(null);
    const [beatFile, setBeatFile] = useState(null);
    const [sessionActive, setSessionActive] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    
    // Playback Progress (0 to 100)
    const [progress, setProgress] = useState(0);
    const [sessionDuration, setSessionDuration] = useState(0); // Real duration in seconds
    const playbackInterval = useRef(null);
    const playbackStartTime = useRef(null);
    const lastX = useRef(0);
    const dragThreshold = useRef(false);

    // Web Audio API refs
    const audioContext = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const analyser = useRef(null);
    const dataArray = useRef(null);
    const animationFrame = useRef(null);
    const mediaStream = useRef(null);
    const beatAudioBuffer = useRef(null);
    const beatSourceNode = useRef(null);
    
    // Master playback nodes (for all layers)
    const masterGainNode = useRef(null);
    const layerSourceNodes = useRef([]);
    
    // Supabase session state
    const [sessionTitle, setSessionTitle] = useState('Untitled Session');
    const [savedSessions, setSavedSessions] = useState([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize Audio Context
    useEffect(() => {
        if (!audioContext.current) {
            audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode.current = audioContext.current.createGain();
            masterGainNode.current.connect(audioContext.current.destination);
        }
        
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    // Calculate session duration whenever layers change
    useEffect(() => {
        if (layers.length === 0) {
            setSessionDuration(0);
            return;
        }
        
        // Find longest layer or beat duration
        let maxDuration = 0;
        
        layers.forEach(layer => {
            if (layer.audioBuffer) {
                maxDuration = Math.max(maxDuration, layer.audioBuffer.duration);
            }
        });
        
        if (beatAudioBuffer.current) {
            maxDuration = Math.max(maxDuration, beatAudioBuffer.current.duration);
        }
        
        setSessionDuration(maxDuration);
    }, [layers, beatAudioBuffer.current]);

    // Handle Global Playback with REAL timing
    useEffect(() => {
        if (isPlaying && !isScrubbing && sessionDuration > 0) {
            playbackStartTime.current = audioContext.current.currentTime;
            
            const updateProgress = () => {
                if (!isPlaying) return;
                
                const elapsed = audioContext.current.currentTime - playbackStartTime.current;
                const newProgress = Math.min(100, (elapsed / sessionDuration) * 100);
                
                if (newProgress >= 100) {
                    setIsPlaying(false);
                    setProgress(0);
                    stopAllAudio();
                } else {
                    setProgress(newProgress);
                    playbackInterval.current = requestAnimationFrame(updateProgress);
                }
            };
            
            playbackInterval.current = requestAnimationFrame(updateProgress);
        } else {
            if (playbackInterval.current) {
                cancelAnimationFrame(playbackInterval.current);
            }
        }
        
        return () => {
            if (playbackInterval.current) {
                cancelAnimationFrame(playbackInterval.current);
            }
        };
    }, [isPlaying, isScrubbing, sessionDuration]);

    // Request microphone access and start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStream.current = stream;
            
            // Setup analyser for waveform visualization
            analyser.current = audioContext.current.createAnalyser();
            analyser.current.fftSize = 256;
            const bufferLength = analyser.current.frequencyBinCount;
            dataArray.current = new Uint8Array(bufferLength);
            
            const source = audioContext.current.createMediaStreamSource(stream);
            source.connect(analyser.current);
            
            // Setup MediaRecorder
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            
            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };
            
            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Convert to AudioBuffer for playback
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                
                // Generate waveform from audio buffer
                const waves = generateWaveformFromBuffer(audioBuffer);
                
                const newLayer = {
                    id: Date.now(),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    volume: 80,
                    waves: waves,
                    audioBuffer: audioBuffer,
                    audioUrl: audioUrl,
                    muted: false,
                    solo: false,
                    pan: 0
                };
                
                setLayers([newLayer, ...layers]);
                setIsPopped(true);
                
                // Stop stream
                if (mediaStream.current) {
                    mediaStream.current.getTracks().forEach(track => track.stop());
                    mediaStream.current = null;
                }
            };
            
            mediaRecorder.current.start();
            setIsRecording(true);
            
        } catch (err) {
            console.error('Microphone access denied:', err);
            alert('Microphone access is required for recording. Please enable it in your browser settings.');
        }
    };

    // Generate waveform visualization from AudioBuffer
    const generateWaveformFromBuffer = (buffer) => {
        const rawData = buffer.getChannelData(0);
        const samples = 45; // Match UI waveform bars
        const blockSize = Math.floor(rawData.length / samples);
        const waves = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[i * blockSize + j]);
            }
            const average = sum / blockSize;
            waves.push(Math.min(100, average * 200)); // Normalize to 0-100
        }
        
        return waves;
    };

    const startSession = () => {
        setIsPopped(false);
        setIsPlaying(false);
        setProgress(0);
        if (useCountdown) {
            setCountdown(3);
        } else {
            startRecording();
        }
        setHasStarted(true);
        setSessionActive(true);
    };

    const stopSession = () => {
        setIsRecording(false);
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
        setSessionActive(false);
    };

    // Playback all layers in PERFECT sync using master clock
    const playAllLayers = (startOffset = 0) => {
        if (layers.length === 0 && !beatAudioBuffer.current) return;
        
        // CRITICAL: All sources must start at EXACT same timestamp
        const masterStartTime = audioContext.current.currentTime + 0.01; // Small buffer
        layerSourceNodes.current = [];
        
        // Play beat if loaded (with looping)
        if (beatAudioBuffer.current) {
            const beatSource = audioContext.current.createBufferSource();
            beatSource.buffer = beatAudioBuffer.current;
            beatSource.loop = true; // Loop indefinitely
            beatSource.loopStart = 0;
            beatSource.loopEnd = beatAudioBuffer.current.duration;
            
            const beatGain = audioContext.current.createGain();
            beatGain.gain.value = 0.7;
            
            beatSource.connect(beatGain);
            beatGain.connect(masterGainNode.current);
            
            // Start at exact same time with optional offset
            beatSource.start(masterStartTime, startOffset);
            
            beatSourceNode.current = beatSource;
            
            // Auto-stop beat after session duration if not looping vocals
            if (sessionDuration > 0) {
                beatSource.stop(masterStartTime + sessionDuration - startOffset);
            }
        }
        
        // Play all non-muted, non-solo layers (or only solo layers if any exist)
        const hasSolo = layers.some(l => l.solo);
        
        layers.forEach((layer) => {
            // Skip if muted, or if solo exists and this isn't solo
            if (layer.muted || (hasSolo && !layer.solo)) return;
            if (!layer.audioBuffer) return;
            
            const source = audioContext.current.createBufferSource();
            source.buffer = layer.audioBuffer;
            
            const gainNode = audioContext.current.createGain();
            gainNode.gain.value = layer.volume / 100;
            
            const panNode = audioContext.current.createStereoPanner();
            panNode.pan.value = layer.pan || 0;
            
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(masterGainNode.current);
            
            // Start at EXACT same timestamp as beat
            const layerStartOffset = Math.min(startOffset, layer.audioBuffer.duration);
            source.start(masterStartTime, layerStartOffset);
            
            // Auto-stop when layer ends
            source.stop(masterStartTime + layer.audioBuffer.duration - layerStartOffset);
            
            layerSourceNodes.current.push({ source, layer });
        });
        
        playbackStartTime.current = masterStartTime;
        setIsPlaying(true);
    };

    const stopAllAudio = () => {
        // Stop all layer sources
        layerSourceNodes.current.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        layerSourceNodes.current = [];
        
        // Stop beat
        if (beatSourceNode.current) {
            try {
                beatSourceNode.current.stop();
            } catch (e) {
                // Already stopped
            }
            beatSourceNode.current = null;
        }
        
        setIsPlaying(false);
    };

    // --- SCRUBBER LOGIC ---
    const handleInteractionStart = (e) => {
        if (!isPopped) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        lastX.current = clientX;
        setIsScrubbing(true);
        dragThreshold.current = false;
    };

    const handleInteractionMove = (e) => {
        if (!isScrubbing) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - lastX.current;
        
        if (Math.abs(deltaX) > 5) {
            dragThreshold.current = true;
        }

        const sensitivity = 3; 
        setProgress(prev => {
            const next = prev + (deltaX / sensitivity);
            return Math.max(0, Math.min(100, next));
        });
        
        lastX.current = clientX;
        
        // Play audio snippet at scrub position
        if (dragThreshold.current && sessionDuration > 0) {
            const offsetSeconds = (progress / 100) * sessionDuration;
            
            // Stop current playback
            stopAllAudio();
            
            // Play short snippet at this position (0.1 seconds)
            playScrubbingAudio(offsetSeconds);
        }
    };
    
    // Play tiny audio snippet during scrubbing
    const playScrubbingAudio = (offsetSeconds) => {
        if (layers.length === 0 || !layers[0].audioBuffer) return;
        
        try {
            // Just play first non-muted layer for scrubbing preview
            const previewLayer = layers.find(l => !l.muted);
            if (!previewLayer || !previewLayer.audioBuffer) return;
            
            const source = audioContext.current.createBufferSource();
            source.buffer = previewLayer.audioBuffer;
            
            const gainNode = audioContext.current.createGain();
            gainNode.gain.value = 0.3; // Quieter during scrub
            
            source.connect(gainNode);
            gainNode.connect(masterGainNode.current);
            
            // Play 0.1 second snippet at this position
            const startTime = Math.min(offsetSeconds, previewLayer.audioBuffer.duration - 0.1);
            source.start(audioContext.current.currentTime, startTime, 0.1);
        } catch (e) {
            // Ignore scrubbing audio errors
        }
    };

    const handleInteractionEnd = () => {
        if (!isScrubbing) return;
        setIsScrubbing(false);

        if (!dragThreshold.current) {
            handleReturnToPlatter();
        }
    };

    const handleReturnToPlatter = () => {
        setIsPopped(false);
        setTimeout(() => {
            startSession();
        }, 600);
    };

    const handleMainClick = () => {
        if (isRecording) {
            stopSession();
        } else if (!isPopped) {
            startSession();
        }
    };

    // Handle beat file upload
    const handleBeatUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setBeatFile(file);
        setBeat(file.name);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
            beatAudioBuffer.current = audioBuffer;
        } catch (err) {
            console.error('Error loading beat:', err);
            alert('Failed to load beat file. Please try a different audio file.');
        }
    };

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        } else if (countdown === 0 && sessionActive && !isRecording) {
            startRecording();
            setSessionActive(false);
        }
        return () => clearTimeout(timer);
    }, [countdown, sessionActive, isRecording]);

    const getRecordStyle = () => {
        if (isScrubbing || isPopped) {
            return {
                transformOrigin: '400px 300px',
                transform: `rotate(${progress * 7.2}deg)`,
                transition: isScrubbing ? 'none' : 'transform 0.3s ease-out'
            };
        }
        if (isRecording || isPlaying) {
            return {
                transformOrigin: '400px 300px',
                animation: 'spin 2.5s linear infinite'
            };
        }
        return { transformOrigin: '400px 300px' };
    };

    const handleToggleMute = (layerId) => {
        setLayers(layers.map(l => l.id === layerId ? { ...l, muted: !l.muted } : l));
    };

    const handleToggleSolo = (layerId) => {
        setLayers(layers.map(l => l.id === layerId ? { ...l, solo: !l.solo } : l));
    };
    
    // ============================================================================
    // SUPABASE INTEGRATION
    // ============================================================================
    
    // Upload audio blob to Supabase Storage
    const uploadAudioToStorage = async (audioBlob, filename) => {
        try {
            const { data, error } = await window.supabase.storage
                .from('scratch-lab')
                .upload(`${user.username}/${filename}`, audioBlob, {
                    contentType: 'audio/webm',
                    upsert: false
                });
            
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = window.supabase.storage
                .from('scratch-lab')
                .getPublicUrl(`${user.username}/${filename}`);
            
            return urlData.publicUrl;
        } catch (err) {
            console.error('Error uploading audio:', err);
            throw err;
        }
    };
    
    // Save session to Supabase
    const saveSessionToSupabase = async () => {
        if (layers.length === 0) {
            alert('No layers to save!');
            return;
        }
        
        setIsSaving(true);
        
        try {
            // 1. Create session record
            const sessionData = {
                username: user.username,
                user_id: user.id,
                title: sessionTitle,
                beat_url: beat || null,
                beat_title: beatFile?.name || null
            };
            
            const { data: session, error: sessionError } = await api.create('scratch_sessions', sessionData);
            
            if (sessionError) throw sessionError;
            
            // 2. Upload each layer and save metadata
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                
                // Convert audioUrl blob to actual blob for upload
                const response = await fetch(layer.audioUrl);
                const audioBlob = await response.blob();
                
                // Upload audio file
                const filename = `${session.id}_layer_${i + 1}_${Date.now()}.webm`;
                const audioUrl = await uploadAudioToStorage(audioBlob, filename);
                
                // Save layer metadata
                const layerData = {
                    session_id: session.id,
                    layer_number: layers.length - i, // Newest = 1
                    audio_url: audioUrl,
                    waveform_data: layer.waves,
                    volume: layer.volume,
                    pan: layer.pan || 0,
                    muted: layer.muted || false,
                    solo: layer.solo || false,
                    duration_seconds: layer.audioBuffer.duration
                };
                
                await api.create('scratch_layers', layerData);
            }
            
            alert(`Session "${sessionTitle}" saved successfully!`);
            setShowSaveModal(false);
            
            // Reload saved sessions list
            loadSavedSessions();
            
        } catch (err) {
            console.error('Error saving session:', err);
            alert('Failed to save session. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Load saved sessions from Supabase
    const loadSavedSessions = async () => {
        try {
            const response = await api.get('scratch_sessions', { limit: 100 });
            const userSessions = response.data.filter(s => s.username === user.username);
            
            // Sort by most recent
            userSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setSavedSessions(userSessions);
        } catch (err) {
            console.error('Error loading sessions:', err);
        }
    };
    
    // Load a specific session
    const loadSession = async (sessionId) => {
        try {
            setShowLoadModal(false);
            
            // Get session metadata
            const sessionResponse = await api.get('scratch_sessions', { limit: 1000 });
            const session = sessionResponse.data.find(s => s.id === sessionId);
            
            if (!session) {
                alert('Session not found');
                return;
            }
            
            // Get layers for this session
            const layersResponse = await api.get('scratch_layers', { limit: 1000 });
            const sessionLayers = layersResponse.data.filter(l => l.session_id === sessionId);
            
            // Sort by layer number
            sessionLayers.sort((a, b) => b.layer_number - a.layer_number);
            
            // Download and decode each audio file
            const loadedLayers = [];
            
            for (const layerData of sessionLayers) {
                try {
                    // Fetch audio file
                    const audioResponse = await fetch(layerData.audio_url);
                    const audioBlob = await audioResponse.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Decode to AudioBuffer
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                    
                    loadedLayers.push({
                        id: layerData.id,
                        timestamp: new Date(layerData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        volume: layerData.volume,
                        waves: layerData.waveform_data,
                        audioBuffer: audioBuffer,
                        audioUrl: audioUrl,
                        muted: layerData.muted,
                        solo: layerData.solo,
                        pan: layerData.pan
                    });
                } catch (err) {
                    console.error('Error loading layer:', err);
                }
            }
            
            setLayers(loadedLayers);
            setSessionTitle(session.title);
            setBeat(session.beat_title);
            
            alert(`Session "${session.title}" loaded!`);
            
        } catch (err) {
            console.error('Error loading session:', err);
            alert('Failed to load session. Please try again.');
        }
    };
    
    // Load saved sessions on mount
    useEffect(() => {
        if (user?.username) {
            loadSavedSessions();
        }
    }, [user?.username]);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            width: '100%', 
            minHeight: '100vh',
            background: 'var(--white)', 
            fontFamily: 'var(--font-mono)',
            color: 'var(--black)',
            overflow: 'hidden',
            userSelect: 'none'
        }}>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                .led-blink { animation: blink 0.8s infinite; }
                .led-blink-slow { animation: blink 1.5s infinite; }

                .record-group-transition {
                    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                    transform-origin: 400px 320px;
                }
                .record-popped {
                    transform: perspective(1200px) translateY(180px) scale(3.2) rotateX(72deg);
                    z-index: 100;
                }
                .pro-shadow { 
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1), 0 10px 20px -5px rgba(0,0,0,0.05); 
                }
                input[type=range]::-webkit-slider-thumb { 
                    -webkit-appearance: none; 
                    height: 12px; 
                    width: 12px; 
                    border-radius: 50%; 
                    background: #000; 
                    cursor: pointer; 
                    border: 2px solid #fff; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2); 
                }
            `}</style>

            {/* Header Section */}
            <header style={{ 
                position: 'relative', 
                width: '100%', 
                zIndex: 30, 
                paddingTop: 16,
                paddingLeft: 24,
                paddingRight: 24,
                flexShrink: 0,
                background: 'var(--white)'
            }}>
                <div style={{ maxWidth: 448, margin: '0 auto' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: 24 
                    }}>
                        <h1 style={{ 
                            fontSize: 24, 
                            fontFamily: 'Playfair Display, serif',
                            fontWeight: 900,
                            fontStyle: 'italic',
                            letterSpacing: '-0.02em',
                            color: 'var(--black)',
                            margin: 0
                        }}>SCRATCH LAB</h1>
                        
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                onClick={() => setShowLoadModal(true)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    border: '1px solid var(--gray-light)',
                                    background: 'var(--paper)',
                                    color: 'var(--gray)',
                                    cursor: 'pointer'
                                }}
                                title="Load saved session"
                            >
                                <Icon name="FolderOpen" size={18} />
                            </button>
                            <button 
                                onClick={() => setUseCountdown(!useCountdown)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    border: useCountdown ? '1px solid var(--electric)' : '1px solid var(--gray-light)',
                                    background: useCountdown ? 'rgba(234, 179, 8, 0.1)' : 'var(--paper)',
                                    color: useCountdown ? 'var(--electric)' : 'var(--gray)',
                                    cursor: 'pointer'
                                }}
                                title="Toggle countdown"
                            >
                                <Icon name="Timer" size={18} />
                            </button>
                            <label style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: 'var(--paper)',
                                border: '1px solid var(--gray-light)',
                                color: 'var(--gray)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                                title="Upload beat"
                            >
                                <Icon name="Music" size={18} />
                                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleBeatUpload} />
                            </label>
                        </div>
                    </div>

                    {/* SVG Player Area */}
                    <div 
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: 256,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'visible'
                        }}
                        onMouseDown={handleInteractionStart}
                        onMouseMove={handleInteractionMove}
                        onMouseUp={handleInteractionEnd}
                        onMouseLeave={handleInteractionEnd}
                        onTouchStart={handleInteractionStart}
                        onTouchMove={handleInteractionMove}
                        onTouchEnd={handleInteractionEnd}
                        onClick={handleMainClick}
                    >
                        <svg viewBox="0 0 800 640" style={{ 
                            width: '100%', 
                            height: '100%', 
                            maxHeight: 260, 
                            overflow: 'visible', 
                            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.15))',
                            pointerEvents: 'none' 
                        }}>
                            <defs>
                                <linearGradient id="mahogany" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#5d4037" />
                                    <stop offset="50%" stopColor="#4e342e" />
                                    <stop offset="100%" stopColor="#3e2723" />
                                </linearGradient>
                                <linearGradient id="champagne-metal" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f5f5f5" />
                                    <stop offset="30%" stopColor="#e0e0e0" />
                                    <stop offset="70%" stopColor="#d6d6d6" />
                                    <stop offset="100%" stopColor="#bdbdbd" />
                                </linearGradient>
                                <radialGradient id="high-vinyl" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#262626" />
                                    <stop offset="90%" stopColor="#000" />
                                </radialGradient>
                            </defs>

                            <rect x="40" y="40" width="720" height="520" rx="40" fill="url(#mahogany)" />
                            <rect x="70" y="70" width="660" height="460" rx="25" fill="url(#champagne-metal)" stroke="#9e9e9e" strokeWidth="0.5" />
                            
                            <circle cx="400" cy="300" r="190" fill="rgba(0,0,0,0.1)" />
                            <circle cx="400" cy="300" r="180" fill="#212121" stroke="#000" strokeWidth="6" />

                            <circle cx="110" cy="110" r="6" fill={isRecording ? "#ff1744" : isPlaying ? "#00e676" : "#455a64"} className={isRecording || isPlaying ? 'led-blink' : ''} />
                            
                            <g transform="translate(680, 100)">
                                <circle cx="0" cy="0" r="3" fill="#00e676" className="led-blink" />
                                <circle cx="12" cy="0" r="3" fill="#ff9100" className="led-blink-slow" />
                                <circle cx="24" cy="0" r="3" fill="#2979ff" />
                            </g>

                            <g transform="translate(100, 470)">
                                <rect width="110" height="40" rx="4" fill="#000" />
                                <rect x="2" y="2" width="106" height="36" rx="2" fill="#1a1a1a" />
                                <rect x="5" y="5" width="100" height="30" fill={countdown > 0 ? "#ff1744" : isPlaying ? "#00e676" : "#455a64"} opacity="0.05" />
                                <text 
                                    x="55" y="28" 
                                    fontFamily="monospace" 
                                    fontSize="24" 
                                    fill={countdown > 0 ? "#ff1744" : isPlaying ? "#00e676" : "#333"} 
                                    textAnchor="middle" 
                                    fontWeight="bold"
                                    letterSpacing="2"
                                >
                                    {countdown > 0 ? `00:0${countdown}` : isPlaying || isScrubbing ? `${progress < 10 ? '0' : ''}${Math.floor(progress / 10)}:${progress % 10}0` : "00:00"}
                                </text>
                            </g>

                            {/* Record Group */}
                            <g className={`record-group-transition ${isPopped ? 'record-popped' : ''}`}>
                                <g style={getRecordStyle()}>
                                    <circle cx="400" cy="300" r="172" fill="url(#high-vinyl)" />
                                    {[160, 140, 120, 100, 80].map(r => (
                                        <circle key={r} cx="400" cy="300" r={r} fill="none" stroke="#111" strokeWidth="1" opacity="0.8" />
                                    ))}
                                    <circle cx="400" cy="300" r="60" fill={isRecording ? "#ff5252" : "#ff9100"} style={{ transition: 'fill 0.5s' }} />
                                    <text x="400" y="295" fontFamily="serif" fontSize="14" fill="white" textAnchor="middle" fontWeight="900" fontStyle="italic">SCRATCH</text>
                                    <text x="400" y="318" fontFamily="serif" fontSize="14" fill="white" textAnchor="middle" fontWeight="900" fontStyle="italic">LAB</text>
                                    <circle cx="400" cy="300" r="5" fill="#f5f5f5" />
                                </g>
                            </g>

                            {/* Tonearm */}
                            <g 
                                transform={isRecording || isPlaying ? "rotate(16, 650, 200)" : "rotate(0, 650, 200)"} 
                                style={{ 
                                    transition: 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                                    opacity: isPopped ? 0 : 1,
                                    transform: isPopped ? 'scale(0)' : 'scale(1)'
                                }}
                            >
                                <circle cx="650" cy="200" r="32" fill="#212121" />
                                <path d="M650 200 L 650 440 L 480 470" fill="none" stroke="#424242" strokeWidth="12" strokeLinecap="round" />
                                <rect x="440" y="460" width="45" height="28" rx="4" fill="#212121" transform="rotate(-15, 465, 475)" />
                            </g>
                        </svg>

                        {!hasStarted && !isRecording && !isPopped && (
                            <div style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                pointerEvents: 'none' 
                            }}>
                                <div style={{ 
                                    width: 56, 
                                    height: 56, 
                                    borderRadius: '50%', 
                                    background: 'rgba(0,0,0,0.05)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    animation: 'bounce 1s infinite',
                                    marginBottom: 8
                                }}>
                                    <Icon name="Mic" size={24} />
                                </div>
                                <span style={{ 
                                    color: 'var(--black)', 
                                    fontWeight: 900, 
                                    fontSize: 9, 
                                    letterSpacing: '0.3em', 
                                    textTransform: 'uppercase' 
                                }}>Press Start</span>
                            </div>
                        )}
                        
                        {isPopped && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '85%', 
                                color: 'var(--gray)', 
                                fontSize: 10, 
                                fontWeight: 900, 
                                letterSpacing: '0.2em', 
                                textTransform: 'uppercase', 
                                pointerEvents: 'none' 
                            }}>
                                Drag to Scrub • Tap to Close
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Workspace: Track Rack */}
            <main style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px 24px', 
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingBottom: 160
            }}>
                {isRecording && (
                    <div style={{ 
                        background: 'var(--paper)', 
                        border: '1px solid rgba(255, 23, 68, 0.2)',
                        borderRadius: 16, 
                        padding: 16, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16,
                        animation: 'pulse 2s infinite'
                    }}>
                        <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: 8, 
                            background: '#ff1744', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0,
                            color: 'white'
                        }}>
                            <Icon name="Activity" size={14} />
                        </div>
                        <div style={{ 
                            flex: 1, 
                            display: 'flex', 
                            alignItems: 'flex-end', 
                            gap: 1, 
                            height: 24, 
                            padding: '0 8px',
                            overflow: 'hidden' 
                        }}>
                            {Array.from({ length: 45 }).map((_, i) => (
                                <div key={i} style={{ 
                                    flex: 1, 
                                    background: '#ff5252', 
                                    borderRadius: 2,
                                    height: `${10 + Math.random() * 90}%`,
                                    transition: 'height 0.1s'
                                }} />
                            ))}
                        </div>
                        <span style={{ 
                            fontSize: 8, 
                            fontWeight: 900, 
                            letterSpacing: '0.15em', 
                            color: '#ff1744', 
                            textTransform: 'uppercase' 
                        }}>Recording...</span>
                    </div>
                )}

                {layers.length === 0 && !isRecording && (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: 192, 
                        opacity: 0.2, 
                        textAlign: 'center',
                        filter: 'grayscale(1)'
                    }}>
                        <Icon name="Disc" size={32} style={{ marginBottom: 12, animation: 'spin 8s linear infinite' }} />
                        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em' }}>Studio rack cleared. Tap record to begin.</p>
                    </div>
                )}

                {layers.map((layer, index) => (
                    <div key={layer.id} style={{ 
                        background: 'var(--white)', 
                        borderRadius: 12, 
                        padding: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        border: '1px solid var(--gray-light)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            flexShrink: 0 
                        }}>
                            <div style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: 8, 
                                background: 'var(--black)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'white', 
                                fontWeight: 900, 
                                fontSize: 10,
                                fontStyle: 'italic'
                            }}>
                                {layers.length - index}
                            </div>
                            <span style={{ 
                                fontSize: 6, 
                                color: 'var(--gray)', 
                                fontFamily: 'monospace',
                                marginTop: 4, 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em' 
                            }}>{layer.timestamp}</span>
                        </div>

                        <div style={{ 
                            flex: 1, 
                            height: 32, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            position: 'relative', 
                            overflow: 'hidden' 
                        }}>
                            {layer.waves.map((h, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        flex: 1, 
                                        borderRadius: 2,
                                        transition: 'all 0.3s',
                                        background: (isPlaying || isScrubbing) ? 'var(--electric)' : 'var(--gray-light)',
                                        height: (isPlaying || isScrubbing) ? `${Math.min(100, h * (1 + Math.random() * 0.1))}%` : `${h}%`,
                                        opacity: 0.3 + (layer.volume / 100) * 0.7
                                    }}
                                />
                            ))}
                            {(isPlaying || isScrubbing) && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    bottom: 0, 
                                    width: 2, 
                                    background: 'var(--black)', 
                                    zIndex: 10,
                                    left: `${progress}%`
                                }} />
                            )}
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12, 
                            paddingLeft: 12, 
                            borderLeft: '1px solid var(--gray-light)',
                            flexShrink: 0 
                        }}>
                            {/* Mute Button */}
                            <button 
                                onClick={() => handleToggleMute(layer.id)}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: layer.muted ? 'var(--black)' : 'transparent',
                                    color: layer.muted ? 'white' : 'var(--gray)',
                                    cursor: 'pointer',
                                    fontSize: 7,
                                    fontWeight: 900,
                                    transition: 'all 0.2s'
                                }}
                            >
                                M
                            </button>
                            
                            {/* Solo Button */}
                            <button 
                                onClick={() => handleToggleSolo(layer.id)}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: layer.solo ? 'var(--electric)' : 'transparent',
                                    color: layer.solo ? 'white' : 'var(--gray)',
                                    cursor: 'pointer',
                                    fontSize: 7,
                                    fontWeight: 900,
                                    transition: 'all 0.2s'
                                }}
                            >
                                S
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon name="Volume2" size={12} color="var(--gray-light)" />
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={layer.volume}
                                    onChange={(e) => {
                                        const next = [...layers];
                                        next[index].volume = parseInt(e.target.value);
                                        setLayers(next);
                                    }}
                                    style={{
                                        width: 64,
                                        height: 4,
                                        background: 'var(--gray-light)',
                                        borderRadius: 8,
                                        appearance: 'none',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>

                            {index === 0 && !isRecording && (
                                <button 
                                    onClick={handleReturnToPlatter}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: 'var(--black)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'var(--electric)'}
                                    onMouseLeave={(e) => e.target.style.background = 'var(--black)'}
                                >
                                    <Icon name="ArrowRight" size={14} />
                                </button>
                            )}

                            <button 
                                onClick={() => setLayers(layers.filter(l => l.id !== layer.id))}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--gray-light)',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#ff1744'}
                                onMouseLeave={(e) => e.target.style.color = 'var(--gray-light)'}
                            >
                                <Icon name="Trash2" size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </main>

            {/* Footer: Floating Transport Bar */}
            {layers.length > 0 && !isRecording && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    padding: 24, 
                    background: 'linear-gradient(to top, var(--white), var(--white), transparent)',
                    zIndex: 50 
                }}>
                    <div style={{ 
                        maxWidth: 448, 
                        margin: '0 auto', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        background: 'var(--white)', 
                        border: '1px solid var(--gray-light)',
                        padding: 8, 
                        paddingRight: 16,
                        borderRadius: 28,
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'
                    }}>
                        <button 
                            onClick={() => { 
                                if (isPlaying) {
                                    stopAllAudio();
                                } else {
                                    setProgress(0);
                                    playAllLayers();
                                }
                            }}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 16,
                                background: 'var(--black)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'transform 0.1s',
                                transform: 'scale(1)'
                            }}
                            onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            {isPlaying ? <Icon name="Pause" size={18} fill="currentColor" /> : <Icon name="Play" size={18} fill="currentColor" />}
                        </button>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ 
                                    fontSize: 7, 
                                    fontWeight: 900, 
                                    letterSpacing: '0.2em', 
                                    color: 'var(--gray)', 
                                    textTransform: 'uppercase' 
                                }}>Master Feed</span>
                            </div>
                            <div style={{ 
                                height: 4, 
                                background: 'var(--paper)', 
                                borderRadius: 8, 
                                overflow: 'hidden' 
                            }}>
                                <div style={{ 
                                    height: '100%', 
                                    background: 'var(--black)', 
                                    transition: 'width 0.075s',
                                    width: `${progress}%`
                                }} />
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowSaveModal(true)}
                            style={{
                                height: 40,
                                padding: '0 20px',
                                borderRadius: 12,
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#A16207',
                                fontWeight: 900,
                                fontSize: 8,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(234, 179, 8, 0.25)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgba(234, 179, 8, 0.15)'}
                        >
                            Export Wax
                        </button>
                    </div>
                </div>
            )}

            {/* Save Session Modal */}
            {showSaveModal && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 100, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 32, 
                    background: 'rgba(0,0,0,0.4)', 
                    backdropFilter: 'blur(4px)' 
                }}>
                    <div style={{ 
                        background: 'var(--white)', 
                        borderRadius: 24, 
                        padding: 32, 
                        width: '100%', 
                        maxWidth: 384, 
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ 
                            width: 64, 
                            height: 64, 
                            background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', 
                            color: 'white', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 24px',
                            boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)'
                        }}>
                            <Icon name="Save" size={32} />
                        </div>
                        <h2 style={{ 
                            fontSize: 20, 
                            fontFamily: 'Playfair Display, serif',
                            fontWeight: 900, 
                            fontStyle: 'italic',
                            color: 'var(--black)', 
                            marginBottom: 8,
                            letterSpacing: '-0.01em'
                        }}>Save Session</h2>
                        <p style={{ 
                            color: 'var(--gray)', 
                            marginBottom: 24, 
                            fontSize: 10, 
                            lineHeight: 1.6,
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em' 
                        }}>Save {layers.length} layer{layers.length !== 1 ? 's' : ''} to database</p>
                        
                        <input
                            type="text"
                            value={sessionTitle}
                            onChange={(e) => setSessionTitle(e.target.value)}
                            placeholder="Session title..."
                            style={{
                                width: '100%',
                                padding: 16,
                                borderRadius: 12,
                                border: '1px solid var(--gray-light)',
                                fontSize: 14,
                                fontFamily: 'inherit',
                                marginBottom: 24,
                                textAlign: 'center',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#7C3AED'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--gray-light)'}
                        />
                        
                        <button 
                            onClick={saveSessionToSupabase}
                            disabled={isSaving}
                            style={{
                                width: '100%',
                                background: isSaving ? 'var(--gray)' : 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                                color: 'white',
                                padding: 16,
                                borderRadius: 12,
                                fontWeight: 900,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                fontSize: 10,
                                border: 'none',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 6px rgba(124, 58, 237, 0.3)',
                                transition: 'transform 0.1s',
                                transform: 'scale(1)',
                                marginBottom: 12
                            }}
                            onMouseDown={(e) => !isSaving && (e.target.style.transform = 'scale(0.95)')}
                            onMouseUp={(e) => !isSaving && (e.target.style.transform = 'scale(1)')}
                        >
                            {isSaving ? 'Saving...' : 'Save to Database'}
                        </button>
                        
                        <button 
                            onClick={() => setShowSaveModal(false)} 
                            disabled={isSaving}
                            style={{ 
                                width: '100%', 
                                fontSize: 8, 
                                fontWeight: 900, 
                                letterSpacing: '0.15em', 
                                color: 'var(--gray-light)',
                                textTransform: 'uppercase',
                                background: 'none',
                                border: 'none',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                padding: 12
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {/* Load Sessions Modal */}
            {showLoadModal && (
                <div style={{ 
                    position: 'fixed', 
                    inset: 0, 
                    zIndex: 100, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 32, 
                    background: 'rgba(0,0,0,0.4)', 
                    backdropFilter: 'blur(4px)' 
                }}>
                    <div style={{ 
                        background: 'var(--white)', 
                        borderRadius: 24, 
                        padding: 32, 
                        width: '100%', 
                        maxWidth: 480, 
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 24
                        }}>
                            <h2 style={{ 
                                fontSize: 18, 
                                fontFamily: 'Playfair Display, serif',
                                fontWeight: 900, 
                                fontStyle: 'italic',
                                color: 'var(--black)', 
                                margin: 0,
                                letterSpacing: '-0.01em'
                            }}>Saved Sessions</h2>
                            <button
                                onClick={() => setShowLoadModal(false)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Icon name="X" size={18} />
                            </button>
                        </div>
                        
                        <div style={{ 
                            flex: 1, 
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            {savedSessions.length === 0 ? (
                                <div style={{
                                    padding: 48,
                                    textAlign: 'center',
                                    color: 'var(--gray)',
                                    fontSize: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}>
                                    No saved sessions yet
                                </div>
                            ) : (
                                savedSessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => loadSession(session.id)}
                                        style={{
                                            background: 'var(--paper)',
                                            border: '1px solid var(--gray-light)',
                                            borderRadius: 12,
                                            padding: 16,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.borderColor = '#7C3AED'}
                                        onMouseLeave={(e) => e.target.style.borderColor = 'var(--gray-light)'}
                                    >
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            marginBottom: 4
                                        }}>{session.title}</div>
                                        <div style={{
                                            fontSize: 10,
                                            color: 'var(--gray)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {new Date(session.created_at).toLocaleDateString()}
                                            {session.beat_title && ` • Beat: ${session.beat_title}`}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Export for use in main app
if (typeof window !== 'undefined') {
    window.ScratchLabView = ScratchLabView;
}
