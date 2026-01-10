// ============================================================================
// SCRATCH LAB - VINYL-THEMED VOCAL RECORDING STUDIO
// Premium feature for VIP/Pro users and Moderators/Admins
// ============================================================================

const { useState, useEffect, useRef, useCallback } = React;

// Get Icon from global exports (loaded from app.js)
const Icon = window.DailyBarsApp?.Icon || (({ name, size = 20 }) => {
    // Fallback if DailyBarsApp not loaded yet
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, []);
    return React.createElement('i', { 
        'data-lucide': name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase(),
        style: { width: size, height: size, display: 'inline-block' }
    });
});

// Get API from global exports
const api = window.DailyBarsApp?.api;

const ScratchLabView = ({ user, isPremium, onScrubStateChange }) => {
    // Session State
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPopped, setIsPopped] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    
    // Metronome state
    const [isMetronomeOn, setIsMetronomeOn] = useState(false);
    const [bpm, setBpm] = useState(90);
    const nextNoteTime = useRef(0);
    const metronomeTimerId = useRef(null);
    
    // Metronome Scheduler
    const scheduleMetronome = useCallback(() => {
        const secondsPerBeat = 60.0 / bpm;
        const lookahead = 0.1; // How far ahead to schedule audio (sec)
        
        while (nextNoteTime.current < audioContext.current.currentTime + lookahead) {
            playMetronomeClick(nextNoteTime.current);
            nextNoteTime.current += secondsPerBeat;
        }
    }, [bpm]);

    const playMetronomeClick = (time) => {
        const osc = audioContext.current.createOscillator();
        const gain = audioContext.current.createGain();
        osc.connect(gain);
        gain.connect(audioContext.current.destination);
        
        // Soothing woodblock-ish click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);
        
        gain.gain.setValueAtTime(0.3, time); // Not too loud
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.05);
    };

    // Metronome Loop
    useEffect(() => {
        if (isRecording && isMetronomeOn) {
            if (!metronomeTimerId.current) {
                nextNoteTime.current = audioContext.current.currentTime + 0.05;
                metronomeTimerId.current = setInterval(scheduleMetronome, 25);
            }
        } else {
            if (metronomeTimerId.current) {
                clearInterval(metronomeTimerId.current);
                metronomeTimerId.current = null;
            }
        }
        return () => {
            if (metronomeTimerId.current) {
                clearInterval(metronomeTimerId.current);
                metronomeTimerId.current = null;
            }
        };
    }, [isRecording, isMetronomeOn, scheduleMetronome]);

    // Real-time waveform data for recording visualization
    const [liveWaveform, setLiveWaveform] = useState(Array(45).fill(10));
    const [countdown, setCountdown] = useState(0);
    const [useCountdown, setUseCountdown] = useState(true);
    const [layers, setLayers] = useState([]);
    const [beat, setBeat] = useState(null);
    const [beatFile, setBeatFile] = useState(null);
    const [beatWaveform, setBeatWaveform] = useState(null);
    const [beatMuted, setBeatMuted] = useState(false);
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

    // Notify parent when scrubbing/recording state changes (to disable swipe)
    useEffect(() => {
        // Disable swipe when: scrubbing, popped (vinyl out), or recording
        onScrubStateChange?.(isScrubbing || isPopped || isRecording);
    }, [isScrubbing, isPopped, isRecording, onScrubStateChange]);

    // Request microphone access and start recording
    const startRecording = async () => {
        try {
            // Resume audio context if suspended (required for iOS/Safari)
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }
            
            // Mobile-optimized constraints - Safari/iOS needs simpler constraints
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            let constraints;
            if (isIOS) {
                // iOS Safari needs minimal constraints
                constraints = { audio: true };
            } else if (isMobile) {
                // Android Chrome can use some constraints
                constraints = {
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: true // Help with mobile mic sensitivity
                    }
                };
            } else {
                // Desktop can use full constraints
                constraints = {
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                };
            }
            
            console.log('[ScratchLab] Requesting microphone with constraints:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream.current = stream;
            
            // Verify we got audio tracks
            const audioTracks = stream.getAudioTracks();
            console.log('[ScratchLab] Got audio tracks:', audioTracks.length, audioTracks.map(t => t.label));
            
            if (audioTracks.length === 0) {
                throw new Error('No audio track in stream');
            }
            
            // Setup analyser for waveform visualization
            analyser.current = audioContext.current.createAnalyser();
            analyser.current.fftSize = 256;
            analyser.current.smoothingTimeConstant = 0.3;
            const bufferLength = analyser.current.frequencyBinCount;
            dataArray.current = new Uint8Array(bufferLength);
            
            const source = audioContext.current.createMediaStreamSource(stream);
            source.connect(analyser.current);
            
            // Store isRecording in a ref-like variable for the animation frame
            let recordingActive = true;
            
            // Start real-time waveform visualization
            const updateWaveform = () => {
                if (!analyser.current || !recordingActive) return;
                
                analyser.current.getByteFrequencyData(dataArray.current);
                
                // Convert frequency data to 45 bars
                const newWaveform = [];
                const barCount = 45;
                const step = Math.floor(bufferLength / barCount);
                
                for (let i = 0; i < barCount; i++) {
                    let sum = 0;
                    for (let j = 0; j < step; j++) {
                        sum += dataArray.current[i * step + j];
                    }
                    const average = sum / step;
                    // Normalize to percentage (0-100), with minimum of 10%
                    newWaveform.push(Math.max(10, Math.min(100, (average / 255) * 100)));
                }
                
                setLiveWaveform(newWaveform);
                animationFrame.current = requestAnimationFrame(updateWaveform);
            };
            
            animationFrame.current = requestAnimationFrame(updateWaveform);
            
            // Setup MediaRecorder with proper MIME type for mobile
            // iOS Safari supports audio/mp4, Chrome supports audio/webm
            let mimeType;
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/aac')) {
                mimeType = 'audio/aac';
            } else {
                // Fallback - let browser choose
                mimeType = '';
            }
            
            console.log('[ScratchLab] Using MIME type:', mimeType || 'browser default');
            
            const recorderOptions = mimeType ? { mimeType } : {};
            mediaRecorder.current = new MediaRecorder(stream, recorderOptions);
            audioChunks.current = [];
            
            mediaRecorder.current.ondataavailable = (event) => {
                console.log('[ScratchLab] Data available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };
            
            // Handle recording errors
            mediaRecorder.current.onerror = (event) => {
                console.error('[ScratchLab] MediaRecorder error:', event.error);
                alert('Recording error: ' + (event.error?.message || 'Unknown error'));
                recordingActive = false;
            };
            
            mediaRecorder.current.onstop = async () => {
                recordingActive = false;
                
                // Stop waveform animation
                if (animationFrame.current) {
                    cancelAnimationFrame(animationFrame.current);
                }
                
                console.log('[ScratchLab] Recording stopped. Chunks:', audioChunks.current.length);
                
                if (audioChunks.current.length === 0) {
                    console.error('[ScratchLab] No audio data recorded!');
                    alert('No audio was recorded. Please check microphone permissions and try again.');
                    return;
                }
                
                // Use the actual MIME type from the recorder
                const actualMimeType = mediaRecorder.current.mimeType || mimeType || 'audio/webm';
                console.log('[ScratchLab] Creating blob with type:', actualMimeType);
                
                const audioBlob = new Blob(audioChunks.current, { type: actualMimeType });
                console.log('[ScratchLab] Audio blob size:', audioBlob.size, 'bytes');
                
                if (audioBlob.size < 100) {
                    console.error('[ScratchLab] Audio blob too small, likely no audio captured');
                    alert('Recording appears to be empty. Please ensure your microphone is working and permissions are granted.');
                    return;
                }
                
                const audioUrl = URL.createObjectURL(audioBlob);
                
                try {
                    // Convert to AudioBuffer for playback
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    console.log('[ScratchLab] Array buffer size:', arrayBuffer.byteLength);
                    
                    const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                    console.log('[ScratchLab] Decoded audio buffer:', audioBuffer.duration, 'seconds');
                    
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
                    
                    setLayers(prev => [newLayer, ...prev]);
                    setIsPopped(true);
                    console.log('[ScratchLab] Layer added successfully');
                } catch (decodeErr) {
                    console.error('[ScratchLab] Failed to decode recorded audio:', decodeErr);
                    alert('Recording saved but could not be processed. The audio format may not be supported. Try again.');
                }
                
                // Stop stream
                if (mediaStream.current) {
                    mediaStream.current.getTracks().forEach(track => track.stop());
                    mediaStream.current = null;
                }
            };
            
            // Start recording with timeslice for continuous data
            // Use smaller chunks on mobile for better compatibility
            const timeslice = isMobile ? 250 : 100;
            console.log('[ScratchLab] Starting MediaRecorder with timeslice:', timeslice);
            mediaRecorder.current.start(timeslice);
            setIsRecording(true);
            
            // Play beat while recording if loaded
            if (beatAudioBuffer.current) {
                playBeatDuringRecording();
            }
            
        } catch (err) {
            console.error('[ScratchLab] Microphone access error:', err);
            
            // Provide helpful error messages for different error types
            let errorMessage = 'Microphone access is required for recording.\n\n';
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += 'Please enable microphone permissions:\n';
                errorMessage += '• iOS: Settings > Safari > Microphone\n';
                errorMessage += '• Android: Settings > Apps > Browser > Permissions\n';
                errorMessage += '• Desktop: Click the lock icon in the address bar';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage += 'No microphone found. Please connect a microphone and try again.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage += 'Microphone is busy or unavailable. Close other apps using the microphone and try again.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage += 'Microphone constraints not supported. Trying simpler configuration...';
                // Try again with minimal constraints
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaStream.current = stream;
                    // Continue with recording setup... (simplified fallback)
                    console.log('[ScratchLab] Fallback succeeded with minimal constraints');
                } catch (fallbackErr) {
                    errorMessage = 'Could not access microphone. Please check your browser permissions.';
                }
            } else {
                errorMessage += 'Error: ' + (err.message || err.name || 'Unknown error');
            }
            
            alert(errorMessage);
        }
    };
    
    // Play beat during recording (separate from layer playback)
    const playBeatDuringRecording = () => {
        if (!beatAudioBuffer.current) return;
        
        try {
            const beatSource = audioContext.current.createBufferSource();
            beatSource.buffer = beatAudioBuffer.current;
            beatSource.loop = true;
            
            const beatGain = audioContext.current.createGain();
            beatGain.gain.value = 0.7;
            
            beatSource.connect(beatGain);
            beatGain.connect(audioContext.current.destination); // Direct to output, not through master
            
            beatSource.start(0);
            beatSourceNode.current = beatSource;
        } catch (err) {
            console.error('Failed to play beat during recording:', err);
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
        
        // Stop waveform animation
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        
        // Reset live waveform
        setLiveWaveform(Array(45).fill(10));
        
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
        
        // Stop beat playback during recording
        if (beatSourceNode.current) {
            try {
                beatSourceNode.current.stop();
            } catch (e) {
                // Already stopped
            }
            beatSourceNode.current = null;
        }
        
        setSessionActive(false);
    };

    // Real-time volume/mute control
    useEffect(() => {
        if (!isPlaying) return;

        const hasSolo = layers.some(l => l.solo);

        // Update layers
        layerSourceNodes.current.forEach(node => {
            const layer = layers.find(l => l.id === node.layerId);
            if (layer && node.gainNode) {
                let targetGain = layer.volume / 100;
                if (layer.muted || (hasSolo && !layer.solo)) {
                    targetGain = 0;
                }
                // Smooth transition to avoid clicks
                try {
                    node.gainNode.gain.setTargetAtTime(targetGain, audioContext.current.currentTime, 0.05);
                } catch(e) {}
            }
        });

        // Update beat
        if (beatSourceNode.current && beatSourceNode.current.gainNode) {
            const targetGain = beatMuted ? 0 : 0.7;
            try {
                beatSourceNode.current.gainNode.gain.setTargetAtTime(targetGain, audioContext.current.currentTime, 0.05);
            } catch(e) {}
        }
        
    }, [layers, beatMuted, isPlaying]);

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
            beatGain.gain.value = beatMuted ? 0 : 0.7;
            
            beatSource.connect(beatGain);
            beatGain.connect(masterGainNode.current);
            
            // Start at exact same time with optional offset
            beatSource.start(masterStartTime, startOffset);
            
            beatSourceNode.current = { source: beatSource, gainNode: beatGain };
            
            // Auto-stop beat after session duration if not looping vocals
            if (sessionDuration > 0) {
                beatSource.stop(masterStartTime + sessionDuration - startOffset);
            }
        }
        
        // Play all layers (create sources for muted ones too so we can unmute them)
        const hasSolo = layers.some(l => l.solo);
        
        layers.forEach((layer) => {
            if (!layer.audioBuffer) return;
            
            const source = audioContext.current.createBufferSource();
            source.buffer = layer.audioBuffer;
            
            const gainNode = audioContext.current.createGain();
            
            let initialGain = layer.volume / 100;
            if (layer.muted || (hasSolo && !layer.solo)) {
                initialGain = 0;
            }
            gainNode.gain.value = initialGain;
            
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
            
            layerSourceNodes.current.push({ source, gainNode, layerId: layer.id });
        });
        
        playbackStartTime.current = masterStartTime;
        setIsPlaying(true);
    };

    const stopAllAudio = () => {
        // Stop all layer sources
        layerSourceNodes.current.forEach(item => {
            try {
                item.source.stop();
            } catch (e) {
                // Already stopped
            }
        });
        layerSourceNodes.current = [];
        
        // Stop beat
        if (beatSourceNode.current) {
            try {
                beatSourceNode.current.source.stop();
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
        // Prevent swipe gesture from parent
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        lastX.current = clientX;
        setIsScrubbing(true);
        dragThreshold.current = false;
    };

    const handleInteractionMove = (e) => {
        if (!isScrubbing) return;
        // Prevent swipe gesture from parent
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        
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

    const handleInteractionEnd = (e) => {
        if (!isScrubbing) return;
        // Prevent swipe gesture from parent
        if (e) {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        }
        
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
        
        // Resume audio context if needed (for iOS)
        if (audioContext.current.state === 'suspended') {
            await audioContext.current.resume();
        }
        
        setBeatFile(file);
        setBeat(file.name);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
            beatAudioBuffer.current = audioBuffer;
            
            // Generate waveform for beat
            const waves = generateWaveformFromBuffer(audioBuffer);
            setBeatWaveform(waves);
            
            // Visual feedback
            // Alert removed as requested
            // alert(`Beat loaded: "${file.name}" (${Math.round(audioBuffer.duration)}s)\n\nThe beat will play automatically when you start recording!`);
        } catch (err) {
            console.error('Error loading beat:', err);
            setBeat(null);
            setBeatFile(null);
            beatAudioBuffer.current = null;
            alert('Failed to load beat file. Please try a different audio format (MP3, WAV, M4A, etc.).');
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
    // EXPORT FUNCTIONS
    // ============================================================================
    
    // Export the master mix to device as audio file
    const exportMasterToDevice = async () => {
        if (layers.length === 0) {
            alert('No layers to export!');
            return;
        }
        
        setIsSaving(true);
        
        try {
            // Create an offline audio context for rendering
            const sampleRate = audioContext.current.sampleRate;
            const duration = sessionDuration > 0 ? sessionDuration : Math.max(...layers.map(l => l.audioBuffer?.duration || 0));
            
            if (duration === 0) {
                throw new Error('No audio duration found');
            }
            
            const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
            
            // Get layers to render (respecting mute/solo)
            const hasSolo = layers.some(l => l.solo);
            const layersToRender = layers.filter(l => !l.muted && (!hasSolo || l.solo));
            
            // Create master gain
            const masterGain = offlineContext.createGain();
            masterGain.connect(offlineContext.destination);
            
            // Add each layer
            for (const layer of layersToRender) {
                if (!layer.audioBuffer) continue;
                
                const source = offlineContext.createBufferSource();
                source.buffer = layer.audioBuffer;
                
                const gainNode = offlineContext.createGain();
                gainNode.gain.value = layer.volume / 100;
                
                const panNode = offlineContext.createStereoPanner();
                panNode.pan.value = layer.pan || 0;
                
                source.connect(gainNode);
                gainNode.connect(panNode);
                panNode.connect(masterGain);
                
                source.start(0);
            }
            
            // Add beat if loaded
            if (beatAudioBuffer.current) {
                const beatSource = offlineContext.createBufferSource();
                beatSource.buffer = beatAudioBuffer.current;
                
                const beatGain = offlineContext.createGain();
                beatGain.gain.value = 0.7;
                
                beatSource.connect(beatGain);
                beatGain.connect(masterGain);
                
                beatSource.start(0);
            }
            
            // Render the audio
            const renderedBuffer = await offlineContext.startRendering();
            
            // Convert to WAV for maximum compatibility
            const wavBlob = audioBufferToWav(renderedBuffer);
            
            // Create download link
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sessionTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Master exported successfully!');
            setShowSaveModal(false);
            
        } catch (err) {
            console.error('[ScratchLab] Export error:', err);
            alert('Failed to export master: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };
    
    // Convert AudioBuffer to WAV format
    const audioBufferToWav = (buffer) => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const dataLength = buffer.length * blockAlign;
        const arrayBuffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(arrayBuffer);
        
        // RIFF header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        
        // fmt chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // chunk size
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        
        // data chunk
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        // Write audio data
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }
        
        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    };
    
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
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
            minHeight: 'calc(100vh - 160px)', // Account for global header and bottom bar
            backgroundImage: 'url("images/scratch-lab-bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#111',
            fontFamily: 'var(--font-mono)',
            color: 'var(--black)',
            overflow: 'visible',
            userSelect: 'none',
            paddingBottom: 80 // Extra padding for fixed bottom elements
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
                background: 'transparent'
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
                            color: '#f5f5f5',
                            margin: 0,
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
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
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                    color: '#f5f5f5',
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
                                    border: useCountdown ? '1px solid var(--electric)' : '1px solid rgba(255,255,255,0.2)',
                                    background: useCountdown ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                    color: useCountdown ? 'var(--electric)' : '#f5f5f5',
                                    cursor: 'pointer'
                                }}
                                title="Toggle countdown"
                            >
                                <Icon name="Timer" size={18} />
                            </button>
                            <button 
                                onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    border: isMetronomeOn ? '1px solid var(--electric)' : '1px solid rgba(255,255,255,0.2)',
                                    background: isMetronomeOn ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(10px)',
                                    color: isMetronomeOn ? 'var(--electric)' : '#f5f5f5',
                                    cursor: 'pointer'
                                }}
                                title="Toggle Metronome"
                            >
                                <Icon name="Activity" size={18} />
                            </button>
                            <label style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: beat ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)',
                                border: beat ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(10px)',
                                color: beat ? '#10B981' : '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                                title={beat ? `Beat loaded: ${beat}` : "Upload beat (MP3, WAV, M4A)"}
                            >
                                <Icon name="Music" size={18} />
                                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" style={{ display: 'none' }} onChange={handleBeatUpload} />
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
                                    background: 'rgba(255,255,255,0.15)', 
                                    backdropFilter: 'blur(4px)',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    animation: 'bounce 1s infinite',
                                    marginBottom: 8,
                                    color: '#f5f5f5'
                                }}>
                                    <Icon name="Mic" size={24} />
                                </div>
                                <span style={{ 
                                    color: 'rgba(255,255,255,0.9)', 
                                    fontWeight: 900, 
                                    fontSize: 9, 
                                    letterSpacing: '0.3em', 
                                    textTransform: 'uppercase',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                }}>Press Start</span>
                            </div>
                        )}
                        
                        {isPopped && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '85%', 
                                color: 'rgba(255,255,255,0.6)', 
                                fontSize: 10, 
                                fontWeight: 900, 
                                letterSpacing: '0.2em', 
                                textTransform: 'uppercase', 
                                pointerEvents: 'none',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
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
                        background: 'rgba(0,0,0,0.4)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 23, 68, 0.4)',
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
                            {liveWaveform.map((h, i) => (
                                <div key={i} style={{ 
                                    flex: 1, 
                                    background: '#ff5252', 
                                    borderRadius: 2,
                                    height: `${h}%`,
                                    transition: 'height 0.05s ease-out'
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
                        opacity: 0.5, 
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.8)'
                    }}>
                        <Icon name="Disc" size={32} style={{ marginBottom: 12, animation: 'spin 8s linear infinite' }} />
                        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em' }}>Studio rack cleared. Tap record to begin.</p>
                    </div>
                )}

                {/* Beat Card */}
                {beat && beatWaveform && (
                    <div style={{ 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: 12, 
                        padding: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        border: '1px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
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
                                background: '#ff1744', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'white', 
                                fontWeight: 900, 
                                fontSize: 10,
                            }}>
                                B
                            </div>
                        </div>

                        <div style={{ 
                            flex: 1, 
                            height: 64, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            position: 'relative', 
                            overflow: 'hidden' 
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                fontSize: 10,
                                fontWeight: 900,
                                color: '#ff1744',
                                zIndex: 20,
                                background: 'rgba(255,255,255,0.8)',
                                padding: '2px 4px',
                                borderRadius: 4,
                                pointerEvents: 'none'
                            }}>
                                {beat}
                            </div>

                            {beatWaveform.map((h, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        flex: 1, 
                                        borderRadius: 2,
                                        transition: 'all 0.3s',
                                        background: (isPlaying || isScrubbing) ? '#ffd700' : 'black',
                                        height: `${Math.max(4, h)}%`,
                                        opacity: 1
                                    }}
                                />
                            ))}
                            {(isPlaying || isScrubbing) && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    bottom: 0, 
                                    width: 2, 
                                    background: '#ff1744', 
                                    zIndex: 10,
                                    left: `${progress}%`
                                }} />
                            )}
                        </div>

                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            paddingLeft: 8, 
                            borderLeft: '1px solid var(--gray-light)',
                            flexShrink: 0 
                        }}>
                            <button 
                                onClick={() => setBeatMuted(!beatMuted)}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: beatMuted ? 'var(--black)' : 'transparent',
                                    color: beatMuted ? 'white' : 'var(--gray)',
                                    cursor: 'pointer',
                                    fontSize: 7,
                                    fontWeight: 900,
                                    transition: 'all 0.2s'
                                }}
                            >
                                M
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setBeat(null);
                                    setBeatFile(null);
                                    setBeatWaveform(null);
                                    beatAudioBuffer.current = null;
                                }}
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
                )}

                {layers.map((layer, index) => (
                    <div key={layer.id} style={{ 
                        background: 'rgba(255,255,255,0.95)', 
                        borderRadius: 12, 
                        padding: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        border: '1px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
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
                            height: 64, 
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
                                        height: (isPlaying || isScrubbing) ? `${Math.max(4, Math.min(100, h * (1 + Math.random() * 0.1)))}%` : `${Math.max(4, h)}%`,
                                        opacity: 0.5 + (layer.volume / 100) * 0.5
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
                            gap: 6, 
                            paddingLeft: 8, 
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
                                        width: 48,
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
                    bottom: 80, 
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

            {/* Export Modal */}
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
                            <Icon name="Download" size={32} />
                        </div>
                        <h2 style={{ 
                            fontSize: 20, 
                            fontFamily: 'Playfair Display, serif',
                            fontWeight: 900, 
                            fontStyle: 'italic',
                            color: 'var(--black)', 
                            marginBottom: 8,
                            letterSpacing: '-0.01em'
                        }}>Export Wax</h2>
                        <p style={{ 
                            color: 'var(--gray)', 
                            marginBottom: 24, 
                            fontSize: 10, 
                            lineHeight: 1.6,
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em' 
                        }}>Export {layers.length} layer{layers.length !== 1 ? 's' : ''} as master mix</p>
                        
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
                        
                        {/* Download to Device */}
                        <button 
                            onClick={exportMasterToDevice}
                            disabled={isSaving}
                            style={{
                                width: '100%',
                                background: isSaving ? 'var(--gray)' : 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                                color: 'white',
                                padding: 16,
                                borderRadius: 12,
                                fontWeight: 900,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                fontSize: 10,
                                border: 'none',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                                transition: 'transform 0.1s',
                                transform: 'scale(1)',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            onMouseDown={(e) => !isSaving && (e.currentTarget.style.transform = 'scale(0.95)')}
                            onMouseUp={(e) => !isSaving && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <Icon name="Download" size={14} />
                            {isSaving ? 'Exporting...' : 'Download to Device (WAV)'}
                        </button>
                        
                        {/* Save to Database */}
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
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            onMouseDown={(e) => !isSaving && (e.currentTarget.style.transform = 'scale(0.95)')}
                            onMouseUp={(e) => !isSaving && (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <Icon name="Cloud" size={14} />
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
