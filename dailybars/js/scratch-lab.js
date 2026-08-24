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

const ScratchLabView = ({ user, isPremium, onScrubStateChange, onRecordingStateChange }) => {
    // Session State
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPopped, setIsPopped] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    
    // Audio Input State
    const [audioInputs, setAudioInputs] = useState([]);
    const [selectedInputId, setSelectedInputId] = useState('');

    // Fetch audio input devices
    const refreshAudioInputs = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) {
            setAudioInputs([]);
            return;
        }
        try {
            // Ensure permission first - usually this is called after first getUserMedia
            // or if we already have permission
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            setAudioInputs(inputs);
            
            // Set default if not set
            if (!selectedInputId && inputs.length > 0) {
                // Try to find "default" or first one
                const defaultInput = inputs.find(i => i.deviceId === 'default') || inputs[0];
                setSelectedInputId(defaultInput.deviceId);
            }
        } catch (e) {
            console.warn('Error fetching devices:', e);
        }
    }, [selectedInputId]);

    // Initial fetch
    useEffect(() => {
        refreshAudioInputs();
        // Also listen for device changes
        if (!navigator.mediaDevices?.addEventListener) return undefined;
        navigator.mediaDevices.addEventListener('devicechange', refreshAudioInputs);
        return () => navigator.mediaDevices.removeEventListener('devicechange', refreshAudioInputs);
    }, [refreshAudioInputs]);

    // Cycle through available inputs
    const cycleAudioInput = () => {
        if (audioInputs.length <= 1) {
            alert('No other microphones found.');
            return;
        }
        
        const currentIndex = audioInputs.findIndex(i => i.deviceId === selectedInputId);
        const nextIndex = (currentIndex + 1) % audioInputs.length;
        const nextInput = audioInputs[nextIndex];
        
        setSelectedInputId(nextInput.deviceId);
        
        // Show brief toast/alert about the switch
        const label = nextInput.label || `Microphone ${nextIndex + 1}`;
        alert(`Switched Input: ${label}`);
    };
    
    // Audio status for iOS indicator (state so it triggers re-render)
    const [audioReady, setAudioReady] = useState(false);
    
    // Metronome state
    const [isMetronomeOn, setIsMetronomeOn] = useState(false);
    const [bpm, setBpm] = useState(90);
    const [showBpmPopup, setShowBpmPopup] = useState(false);
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

    // Metronome Loop - plays whenever metronome is on (not just during recording)
    useEffect(() => {
        const startMetronome = async () => {
            // Ensure audio context exists and is running
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
                masterGainNode.current = audioContext.current.createGain();
                masterGainNode.current.connect(audioContext.current.destination);
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }
            
            if (!metronomeTimerId.current) {
                nextNoteTime.current = audioContext.current.currentTime + 0.05;
                metronomeTimerId.current = setInterval(scheduleMetronome, 25);
            }
        };
        
        if (isMetronomeOn) {
            startMetronome();
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
    }, [isMetronomeOn, scheduleMetronome]);

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
    const [sessionLoadError, setSessionLoadError] = useState('');
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [beatStoragePath, setBeatStoragePath] = useState(null);

    // Helper to generate IDs
    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    // Track if audio has been unlocked on mobile
    const audioUnlocked = useRef(false);
    const isIOS = useRef(/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    
    // Initialize Audio Context - but DON'T create it until user interaction on iOS
    useEffect(() => {
        // On desktop, create immediately
        if (!isIOS.current && !audioContext.current) {
            audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode.current = audioContext.current.createGain();
            masterGainNode.current.connect(audioContext.current.destination);
            console.log('[ScratchLab] Audio context created (desktop)');
        }
        
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);
    
    // Ensure audio context exists and is running
    // MUST be called from user interaction on iOS
    const ensureAudioContext = async () => {
        // Create audio context if it doesn't exist (iOS requires this in user gesture)
        if (!audioContext.current) {
            console.log('[ScratchLab] Creating audio context (first user interaction)...');
            audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode.current = audioContext.current.createGain();
            masterGainNode.current.connect(audioContext.current.destination);
        }
        
        // Resume if suspended
        if (audioContext.current.state === 'suspended') {
            console.log('[ScratchLab] Resuming suspended audio context...');
            try {
                await audioContext.current.resume();
                console.log('[ScratchLab] Audio context resumed, state:', audioContext.current.state);
            } catch (err) {
                console.error('[ScratchLab] Failed to resume audio context:', err);
            }
        }
        
        return audioContext.current.state === 'running';
    };
    
    // Helper to unlock audio on mobile devices
    // Must be called from a user interaction event (touch/click)
    const unlockMobileAudio = async () => {
        // Remove this check to force unlock every time
        // if (audioUnlocked.current) return true; 
        
        try {
            console.log('[ScratchLab] Unlocking mobile audio... iOS:', isIOS.current);
            
            // 1. Ensure context exists
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
                masterGainNode.current = audioContext.current.createGain();
                masterGainNode.current.connect(audioContext.current.destination);
            }
            
            // 2. Resume Context
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }

            // 3. Play Silent HTML5 Audio (Silent Switch Bypass)
            // Always do this on touch devices to ensure active session
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            if (isTouch || isIOS.current) {
                const silentAudio = new Audio();
                silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//////////////////////////////////////////////////////////////////wAAAP7/zEAAABAAAAOFAAAAAAABEmgAAABEAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAABAAAAOFAAAAAAABEmgAAABEAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
                silentAudio.volume = 0.01;
                
                // We don't await this because we don't want to block if it fails
                // But we need to trigger it in the user gesture
                const playPromise = silentAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('[ScratchLab] Silent HTML5 audio played');
                        // Keep it playing for a moment to establish session
                        setTimeout(() => {
                            silentAudio.pause();
                            silentAudio.src = '';
                            silentAudio.remove();
                        }, 500);
                    }).catch(error => {
                        console.warn('[ScratchLab] Silent HTML5 audio failed:', error);
                    });
                }
                
                // 4. Web Audio Oscillator Kick (Double tap)
                try {
                    const osc = audioContext.current.createOscillator();
                    const gain = audioContext.current.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.current.destination);
                    osc.frequency.value = 400; 
                    gain.gain.value = 0.001; 
                    osc.start(audioContext.current.currentTime);
                    osc.stop(audioContext.current.currentTime + 0.01);
                } catch(e) { console.warn('Oscillator kick failed', e); }
            }
            
            audioUnlocked.current = true;
            setAudioReady(true); 
            return true;
        } catch (err) {
            console.error('[ScratchLab] Unlock failed:', err);
            return false;
        }
    };

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
                // Include timeShift in duration calculation
                // If shift is positive (delay), end time is duration + shift
                // If shift is negative (clip start), duration is effectively shorter, but we usually track "active audio range"
                // For simplicity and to allow dragging "out of bounds", we track the max extent
                const effectiveDuration = layer.audioBuffer.duration + (layer.timeShift || 0);
                maxDuration = Math.max(maxDuration, effectiveDuration);
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
        onRecordingStateChange?.(isRecording);
    }, [isScrubbing, isPopped, isRecording, onScrubStateChange, onRecordingStateChange]);

    const playBackingTracks = (startOffset = 0) => {
        if (layers.length === 0 && !beatAudioBuffer.current) return;
        
        // Use a slightly longer schedule ahead for recording to ensure sync
        const scheduleAhead = isIOS.current ? 0.05 : 0.01;
        const masterStartTime = audioContext.current.currentTime + scheduleAhead;
        
        // Only clear this if we aren't appending (we're starting fresh here)
        layerSourceNodes.current = [];
        
        // 1. Play Beat (if loaded)
        if (beatAudioBuffer.current) {
            const beatSource = audioContext.current.createBufferSource();
            beatSource.buffer = beatAudioBuffer.current;
            beatSource.loop = true;
            beatSource.loopStart = 0;
            beatSource.loopEnd = beatAudioBuffer.current.duration;
            
            const beatGain = audioContext.current.createGain();
            beatGain.gain.value = beatMuted ? 0 : 0.7;
            
            beatSource.connect(beatGain);
            beatGain.connect(masterGainNode.current); // Use master gain for consistency
            
            beatSource.start(masterStartTime, startOffset);
            
            // We store it in beatSourceNode for volume control, but also need to stop it
            beatSourceNode.current = { source: beatSource, gainNode: beatGain };
        }
        
        // 2. Play Layers (Overdub)
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
            
            // Pan
            let outputNode = gainNode;
            if (audioContext.current.createStereoPanner && (layer.pan || 0) !== 0) {
                try {
                    const panNode = audioContext.current.createStereoPanner();
                    panNode.pan.value = layer.pan || 0;
                    gainNode.connect(panNode);
                    outputNode = panNode;
                } catch (e) {}
            }
            
            source.connect(gainNode);
            outputNode.connect(masterGainNode.current);
            
            // Calculate correct start time based on offset AND latency shift
            // If timeShift is negative (move left/earlier), we skip more of the buffer start (increase offset)
            // If timeShift is positive (move right/later), we delay the start time
            
            const shift = layer.timeShift || 0;
            const layerStartOffset = Math.min(startOffset, layer.audioBuffer.duration);
            
            let effectiveStartTime = masterStartTime;
            let effectiveOffset = layerStartOffset;
            
            if (shift < 0) {
                // Shift LEFT (earlier): Skip more of the beginning
                // We add the magnitude of the negative shift to the offset
                effectiveOffset += Math.abs(shift);
            } else {
                // Shift RIGHT (later): Delay start
                effectiveStartTime += shift;
            }
            
            // Boundary checks
            if (effectiveOffset > layer.audioBuffer.duration) {
                // Shifted past end
                return; 
            }
            
            source.start(effectiveStartTime, effectiveOffset);
            
            // Auto stop when this layer ends
            // Duration is original duration minus whatever we skipped
            const playDuration = layer.audioBuffer.duration - effectiveOffset;
            if (playDuration > 0) {
                source.stop(effectiveStartTime + playDuration);
            }
            
            layerSourceNodes.current.push({ source, gainNode, layerId: layer.id });
        });
        
        // Setup playback timing for progress bar
        playbackStartTime.current = masterStartTime - startOffset;
        
        // We don't set isPlaying=true here necessarily, as we are in recording state
        // But we DO want the progress bar to move. 
        // The recording logic currently updates `liveWaveform` but not `progress`.
        // We should start the progress updater if not already running.
        if (!playbackInterval.current) {
             const updateProgress = () => {
                if (!isRecording && !isPlaying) return; // Stop if neither
                
                const elapsed = audioContext.current.currentTime - playbackStartTime.current;
                // Use a large duration for recording mode if unknown, or sessionDuration
                const currentDuration = sessionDuration > 0 ? sessionDuration : 300; 
                const newProgress = Math.min(100, (elapsed / currentDuration) * 100);
                
                setProgress(newProgress);
                playbackInterval.current = requestAnimationFrame(updateProgress);
            };
            playbackInterval.current = requestAnimationFrame(updateProgress);
        }
    };

    // Request microphone access and start recording
    const startRecording = async (startOffset = 0) => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            alert('Recording is not supported in this browser. Try the latest Chrome or Safari over HTTPS.');
            return;
        }
        try {
            // CRITICAL FOR iOS: Unlock audio IMMEDIATELY in user gesture
            // BEFORE any async operations like getUserMedia
            // This ensures audio is unlocked within the user tap context
            // Must happen even for acapella-only recording (no beat)
            
            console.log('[ScratchLab] Unlocking audio in user gesture...');
            
            // Ensure audio context is ready - ALWAYS do this in gesture
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
                masterGainNode.current = audioContext.current.createGain();
                masterGainNode.current.connect(audioContext.current.destination);
                console.log('[ScratchLab] Audio context created in gesture');
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
                console.log('[ScratchLab] Audio context resumed in gesture');
            }
            
            // Play a silent buffer to fully unlock iOS audio
            // This is critical for acapella playback to work later
            try {
                const silentBuffer = audioContext.current.createBuffer(1, 1, 22050);
                const silentSource = audioContext.current.createBufferSource();
                silentSource.buffer = silentBuffer;
                silentSource.connect(audioContext.current.destination);
                silentSource.start(0);
                console.log('[ScratchLab] Silent unlock buffer played');
            } catch (e) {
                console.warn('[ScratchLab] Silent unlock failed:', e);
            }
            
            // Now start beat if loaded
            const hasBeatToPlay = beatAudioBuffer.current && !beatMuted;
            let beatStarted = false;
            
            if (hasBeatToPlay) {
                console.log('[ScratchLab] Starting beat in user gesture...');
                try {
                    // Start beat NOW before getUserMedia breaks the gesture chain
                    const beatSource = audioContext.current.createBufferSource();
                    beatSource.buffer = beatAudioBuffer.current;
                    beatSource.loop = true;
                    
                    const beatGain = audioContext.current.createGain();
                    beatGain.gain.value = 0.7;
                    
                    beatSource.connect(beatGain);
                    beatGain.connect(audioContext.current.destination);
                    beatSource.start(0);
                    beatSourceNode.current = { source: beatSource, gainNode: beatGain };
                    beatStarted = true;
                    console.log('[ScratchLab] Beat started BEFORE getUserMedia!');
                } catch (beatErr) {
                    console.error('[ScratchLab] Failed to start beat early:', beatErr);
                }
            }
            
            // Mark audio as unlocked for later playback
            audioUnlocked.current = true;
            setAudioReady(true);
            
            // Mobile-optimized constraints - Safari/iOS needs simpler constraints
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            
            let constraints;
            if (isIOSDevice) {
                // iOS Safari needs minimal constraints but we can try deviceId if specific one selected
                // Note: iOS often overrides this anyway, but worth a shot if multiple inputs exist
                constraints = { 
                    audio: selectedInputId ? { deviceId: { exact: selectedInputId } } : true 
                };
            } else if (isMobile) {
                // Android Chrome
                constraints = {
                    audio: {
                        deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: true // Help with mobile mic sensitivity
                    }
                };
            } else {
                // Desktop
                constraints = {
                    audio: {
                        deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                };
            }
            
            console.log('[ScratchLab] Requesting microphone with constraints:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStream.current = stream;
            
            // Refresh device list now that we have permission (labels will appear)
            refreshAudioInputs();
            
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
            
            // iOS Safari needs audio/mp4 for best compatibility
            let mimeType = '';
            
            if (isIOS.current) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/aac')) {
                    mimeType = 'audio/aac';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    // Fallback to webm on newer iOS if mp4 unavailable
                    mimeType = 'audio/webm';
                }
            } else {
                // Android/Desktop - prefer WebM opus
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                }
            }
            
            console.log('[ScratchLab] Selected MIME type:', mimeType || 'browser default');
            
            const recorderOptions = mimeType ? { mimeType } : {};
            mediaRecorder.current = new MediaRecorder(stream, recorderOptions);
            audioChunks.current = [];
            
            // On mobile, timeslice can cause header issues in some browsers
            // Safer to record one big chunk unless we need streaming
            // We only use chunks at the end, so no timeslice needed
            
            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };
            
            const releaseRecordingResources = () => {
                if (animationFrame.current) {
                    cancelAnimationFrame(animationFrame.current);
                    animationFrame.current = null;
                }
                if (mediaStream.current) {
                    mediaStream.current.getTracks().forEach(track => track.stop());
                    mediaStream.current = null;
                }
                stopAllAudio();
                setSessionActive(false);
                setIsRecording(false);
            };

            // Handle recording errors
            mediaRecorder.current.onerror = (event) => {
                console.error('[ScratchLab] MediaRecorder error:', event.error);
                alert('Recording error: ' + (event.error?.message || 'Unknown error'));
                recordingActive = false;
                releaseRecordingResources();
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
                    releaseRecordingResources();
                    return;
                }
                
                // Use the actual MIME type from the recorder or fallback
                const actualMimeType = mediaRecorder.current.mimeType || mimeType || '';
                console.log('[ScratchLab] Creating blob with type:', actualMimeType);
                
                // Create blob - if type is empty, browser handles it
                const blobOptions = actualMimeType ? { type: actualMimeType } : undefined;
                const audioBlob = new Blob(audioChunks.current, blobOptions);
                console.log('[ScratchLab] Audio blob size:', audioBlob.size, 'bytes');
                
                if (audioBlob.size < 100) {
                    console.error('[ScratchLab] Audio blob too small');
                    alert('Recording appears to be empty. Microphone might be muted or blocked.');
                    releaseRecordingResources();
                    return;
                }
                
                const audioUrl = URL.createObjectURL(audioBlob);
                
                try {
                    // Convert to AudioBuffer for playback
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    console.log('[ScratchLab] Array buffer size:', arrayBuffer.byteLength);
                    
                    // Safari/iOS decodeAudioData requires callback or promise
                    // We use the promise syntax which is standard now
                    const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
                    
                    // Check for silent buffer
                    const pcm = audioBuffer.getChannelData(0);
                    let isSilent = true;
                    for (let i = 0; i < pcm.length; i++) {
                        if (Math.abs(pcm[i]) > 0.01) {
                            isSilent = false;
                            break;
                        }
                    }
                    
                    if (isSilent) {
                        console.warn('[ScratchLab] Decoded buffer is silent');
                        // Don't error, just warn - might be user intent
                    }

                    console.log('[ScratchLab] Decoded audio buffer:', audioBuffer.duration, 'seconds');
                    
                    let finalAudioBuffer = audioBuffer;
                    
                    // If we recorded with an offset (overdub), we need to pad the start with silence
                    if (recordingStartOffset.current > 0) {
                        const offset = recordingStartOffset.current;
                        console.log('[ScratchLab] Padding recording with silence:', offset, 'seconds');
                        
                        const totalSamples = Math.ceil((audioBuffer.duration + offset) * audioBuffer.sampleRate);
                        const newBuffer = audioContext.current.createBuffer(
                            audioBuffer.numberOfChannels,
                            totalSamples,
                            audioBuffer.sampleRate
                        );
                        
                        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                            const channelData = newBuffer.getChannelData(channel);
                            // Copy recorded data at offset index
                            const recordedData = audioBuffer.getChannelData(channel);
                            const startSample = Math.floor(offset * audioBuffer.sampleRate);
                            channelData.set(recordedData, startSample);
                        }
                        
                        finalAudioBuffer = newBuffer;
                        console.log('[ScratchLab] New padded duration:', finalAudioBuffer.duration);
                    }
                    
                    // Generate waveform from audio buffer (use the full padded one so waveform matches position)
                    const waves = generateWaveformFromBuffer(finalAudioBuffer);
                    
                        // No automatic latency offset - user can drag waveform to align
                        // Visual position and playback position are linked via timeShift
                        const newLayer = {
                            id: Date.now(),
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            volume: 80,
                            waves: waves,
                            audioBuffer: finalAudioBuffer,
                            audioUrl: audioUrl, 
                            muted: false,
                            solo: false,
                            pan: 0,
                            timeShift: 0 // User drags to align - visual and audio stay in sync
                        };
                        
                        setLayers(prev => [newLayer, ...prev]);
                    setIsPopped(true);
                    console.log('[ScratchLab] Layer added successfully');
                } catch (decodeErr) {
                    console.error('[ScratchLab] Failed to decode recorded audio:', decodeErr);
                    alert('Failed to process recording. The audio format may not be supported by this device.');
                }
                
                // Stop stream
                releaseRecordingResources();
            };
            
            // Start recording WITH playback (Overdubbing)
            console.log('[ScratchLab] Starting Overdub at offset:', startOffset);
            
            // Store the offset for the stop handler to use
            recordingStartOffset.current = startOffset;
            
            // Play existing tracks (beat + layers)
            playBackingTracks(startOffset);
            
            // Start recording WITHOUT timeslice for maximum compatibility
            // This ensures we get a single clean blob with proper headers
            console.log('[ScratchLab] Starting MediaRecorder (no timeslice)');
            mediaRecorder.current.start();
            setIsRecording(true);
            
        } catch (err) {
            console.error('[ScratchLab] Microphone access error:', err);
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
                animationFrame.current = null;
            }
            if (beatSourceNode.current?.source) {
                try { beatSourceNode.current.source.stop(); } catch (_) {}
                beatSourceNode.current = null;
            }
            if (mediaStream.current) {
                mediaStream.current.getTracks().forEach(track => track.stop());
                mediaStream.current = null;
            }
            stopAllAudio();
            setSessionActive(false);
            setIsRecording(false);
            
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
    const playBeatDuringRecording = async () => {
        if (!beatAudioBuffer.current) return;
        
        try {
            // Ensure audio context is running (critical for mobile)
            if (audioContext.current.state === 'suspended') {
                console.log('[ScratchLab] Resuming audio context before beat playback...');
                await audioContext.current.resume();
            }
            
            // Double-check audio context is active
            if (audioContext.current.state !== 'running') {
                console.warn('[ScratchLab] Audio context not running:', audioContext.current.state);
                // Try one more time
                await audioContext.current.resume();
            }
            
            const beatSource = audioContext.current.createBufferSource();
            beatSource.buffer = beatAudioBuffer.current;
            beatSource.loop = true;
            
            const beatGain = audioContext.current.createGain();
            beatGain.gain.value = 0.7;
            
            beatSource.connect(beatGain);
            beatGain.connect(audioContext.current.destination); // Direct to output, not through master
            
            // On mobile, we need to start() immediately within the user gesture context
            beatSource.start(0);
            beatSourceNode.current = beatSource;
            
            console.log('[ScratchLab] Beat playback started successfully, context state:', audioContext.current.state);
        } catch (err) {
            console.error('[ScratchLab] Failed to play beat during recording:', err);
        }
    };

    // Generate waveform visualization from AudioBuffer
    const generateWaveformFromBuffer = (buffer) => {
        const rawData = buffer.getChannelData(0);
        const samples = 45; // Match UI waveform bars
        const blockSize = Math.floor(rawData.length / samples);
        const waves = [];
        
        let maxAmp = 0;
        
        // First pass: Find peaks and maximum amplitude
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            // Use RMS (Root Mean Square) for better loudness representation
            for (let j = 0; j < blockSize; j++) {
                sum += rawData[i * blockSize + j] * rawData[i * blockSize + j];
            }
            const rms = Math.sqrt(sum / blockSize);
            waves.push(rms);
            if (rms > maxAmp) maxAmp = rms;
        }
        
        // Second pass: Normalize to 0-100 scale based on max amplitude
        // If maxAmp is very small (silence), normalize against a threshold to avoid noise amplification
        const normalizeFactor = maxAmp > 0.01 ? (1 / maxAmp) : 100;
        
        return waves.map(amp => Math.min(100, Math.max(5, amp * normalizeFactor * 100)));
    };

    const startSession = async () => {
        // Unlock mobile audio on first user interaction
        await unlockMobileAudio();
        
        setIsPopped(false);
        setIsPlaying(false);
        setProgress(0);
        if (useCountdown) {
            setCountdown(3);
        } else {
            startRecording(0);
        }
        setHasStarted(true);
        setSessionActive(true);
    };

    const recordingStartOffset = useRef(0);

    // Stop session logic
    const stopSession = () => {
        setIsRecording(false);
        
        // Stop waveform animation
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        
        // Stop playback interval
        if (playbackInterval.current) {
            cancelAnimationFrame(playbackInterval.current);
            playbackInterval.current = null;
        }
        
        // Reset live waveform
        setLiveWaveform(Array(45).fill(10));
        
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
        
        // Stop all backing tracks (Beat + Layers)
        stopAllAudio();
        
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
    const playAllLayers = async (startOffset = 0) => {
        if (layers.length === 0 && !beatAudioBuffer.current) return;
        
        console.log('[ScratchLab] playAllLayers called, startOffset:', startOffset);
        
        // CRITICAL FOR iOS: Ensure audio context is ready
        const contextReady = await ensureAudioContext();
        if (!contextReady) {
            console.error('[ScratchLab] Audio context not ready, cannot play');
            // Try one more unlock attempt
            await unlockMobileAudio();
        }
        
        console.log('[ScratchLab] Audio context state:', audioContext.current.state);
        
        // CRITICAL: All sources must start at EXACT same timestamp
        // Use slightly longer buffer for iOS to ensure scheduling works
        const scheduleAhead = isIOS.current ? 0.05 : 0.01;
        const masterStartTime = audioContext.current.currentTime + scheduleAhead;
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
            
            // StereoPanner might not be supported on older iOS - use fallback
            let outputNode = gainNode;
            if (audioContext.current.createStereoPanner && (layer.pan || 0) !== 0) {
                try {
                    const panNode = audioContext.current.createStereoPanner();
                    panNode.pan.value = layer.pan || 0;
                    gainNode.connect(panNode);
                    outputNode = panNode;
                } catch (e) {
                    console.warn('[ScratchLab] StereoPanner not supported, skipping pan');
                }
            }
            
            source.connect(gainNode);
            outputNode.connect(masterGainNode.current);
            
            // Apply timeShift from user dragging waveform
            // Same logic as playBackingTracks() for consistency
            const shift = layer.timeShift || 0;
            const layerStartOffset = Math.min(startOffset, layer.audioBuffer.duration);
            
            let effectiveStartTime = masterStartTime;
            let effectiveOffset = layerStartOffset;
            
            if (shift < 0) {
                // Shift LEFT (earlier): Skip more of the beginning
                effectiveOffset += Math.abs(shift);
            } else {
                // Shift RIGHT (later): Delay start
                effectiveStartTime += shift;
            }
            
            // Boundary check - skip if shifted past end
            if (effectiveOffset > layer.audioBuffer.duration) {
                return;
            }
            
            source.start(effectiveStartTime, effectiveOffset);
            
            // Auto-stop when layer ends
            const playDuration = layer.audioBuffer.duration - effectiveOffset;
            if (playDuration > 0) {
                source.stop(effectiveStartTime + playDuration);
            }
            
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

    // --- ENHANCED SCRUBBER LOGIC ---
    // Scrub state for action menu
    const [showScrubActions, setShowScrubActions] = useState(false);
    const [scrubPosition, setScrubPosition] = useState(0); // Position in seconds
    const scrubAudioSource = useRef(null);
    const lastScrubTime = useRef(0);
    const scrubVelocity = useRef(0);
    
    // Format time as MM:SS.ms
    const formatScrubTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };
    
    // Haptic feedback for mobile
    const triggerHaptic = (style = 'light') => {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30],
                tick: [5]
            };
            navigator.vibrate(patterns[style] || patterns.light);
        }
    };

    const handleInteractionStart = (e) => {
        if (!isPopped) return;
        // Prevent swipe gesture from parent
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        lastX.current = clientX;
        lastScrubTime.current = Date.now();
        scrubVelocity.current = 0;
        setIsScrubbing(true);
        setShowScrubActions(false);
        dragThreshold.current = false;
        
        // Stop any playing audio when starting to scrub
        if (isPlaying) {
            stopAllAudio();
        }
        
        triggerHaptic('medium');
    };

    const handleInteractionMove = (e) => {
        if (!isScrubbing) return;
        // Prevent swipe gesture from parent
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - lastX.current;
        const now = Date.now();
        const deltaTime = now - lastScrubTime.current;
        
        if (Math.abs(deltaX) > 5) {
            dragThreshold.current = true;
        }

        // Calculate velocity for speed-based sensitivity
        const velocity = deltaTime > 0 ? Math.abs(deltaX) / deltaTime : 0;
        scrubVelocity.current = velocity;
        
        // Dynamic sensitivity: faster scrub = bigger jumps (for quick navigation)
        // Slow scrub = fine control (for precise positioning)
        const baseSensitivity = 3;
        const speedMultiplier = Math.min(3, 1 + velocity * 2); // Up to 3x faster
        const sensitivity = baseSensitivity / speedMultiplier;
        
        setProgress(prev => {
            const next = prev + (deltaX / sensitivity);
            return Math.max(0, Math.min(100, next));
        });
        
        lastX.current = clientX;
        lastScrubTime.current = now;
        
        // Update scrub position in seconds
        if (sessionDuration > 0) {
            const newPosition = (progress / 100) * sessionDuration;
            setScrubPosition(newPosition);
            
            // Haptic tick at beat boundaries (every ~0.5 seconds)
            if (Math.abs(newPosition - Math.round(newPosition * 2) / 2) < 0.05) {
                triggerHaptic('tick');
            }
        }
        
        // Play audio snippet at scrub position (throttled)
        if (dragThreshold.current && sessionDuration > 0) {
            const offsetSeconds = (progress / 100) * sessionDuration;
            playScrubbingAudio(offsetSeconds);
        }
    };
    
    // Play continuous audio during scrubbing with proper cleanup
    const playScrubbingAudio = (offsetSeconds) => {
        if (layers.length === 0 && !beatAudioBuffer.current) return;
        
        // Stop previous scrub audio
        if (scrubAudioSource.current) {
            try {
                scrubAudioSource.current.stop();
            } catch (e) {}
            scrubAudioSource.current = null;
        }
        
        try {
            // Find audio to preview (prefer first non-muted layer, fallback to beat)
            let buffer = null;
            const previewLayer = layers.find(l => !l.muted && l.audioBuffer);
            if (previewLayer) {
                buffer = previewLayer.audioBuffer;
            } else if (beatAudioBuffer.current) {
                buffer = beatAudioBuffer.current;
            }
            
            if (!buffer) return;
            
            const source = audioContext.current.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = audioContext.current.createGain();
            // Velocity-based volume: slower = quieter preview, faster = louder
            const velocityVolume = Math.min(0.5, 0.2 + scrubVelocity.current * 0.3);
            gainNode.gain.value = velocityVolume;
            
            source.connect(gainNode);
            gainNode.connect(masterGainNode.current);
            
            // Play snippet at this position
            const startTime = Math.max(0, Math.min(offsetSeconds, buffer.duration - 0.15));
            const snippetDuration = 0.15; // Slightly longer for better preview
            source.start(audioContext.current.currentTime, startTime, snippetDuration);
            
            scrubAudioSource.current = source;
        } catch (e) {
            // Ignore scrubbing audio errors
        }
    };

    // Track if we just closed the vinyl (to prevent auto-record on same click)
    const justClosedVinyl = useRef(false);
    
    const handleInteractionEnd = (e) => {
        if (!isScrubbing) return;
        // Prevent swipe gesture from parent
        if (e) {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        }
        
        // Stop scrub audio
        if (scrubAudioSource.current) {
            try {
                scrubAudioSource.current.stop();
            } catch (e) {}
            scrubAudioSource.current = null;
        }
        
        setIsScrubbing(false);

        if (!dragThreshold.current) {
            // Simple tap on vinyl - just close it, DON'T auto-record
            // User can tap the center of platter to start new recording
            justClosedVinyl.current = true; // Prevent handleMainClick from starting recording
            closeVinylToPlatter();
        } else {
            // Actual scrubbing happened - show action menu with options
            const finalPosition = (progress / 100) * sessionDuration;
            setScrubPosition(finalPosition);
            setShowScrubActions(true);
            triggerHaptic('heavy');
        }
    };
    
    // Play from scrub position
    const playFromScrubPosition = async () => {
        console.log('[ScratchLab] playFromScrubPosition:', scrubPosition);
        
        // Ensure audio is ready (critical for iOS)
        await unlockMobileAudio();
        
        setShowScrubActions(false);
        const startOffset = scrubPosition;
        await playAllLayers(startOffset);
        
        // Adjust progress tracking for offset start
        if (audioContext.current) {
            playbackStartTime.current = audioContext.current.currentTime - startOffset;
        }
    };
    
    // Record from scrub position (punch-in recording)
    const recordFromScrubPosition = async () => {
        setShowScrubActions(false);
        setIsPopped(false);
        
        // Start recording from scrub position
        // The startRecording function now handles playing backing tracks from this offset
        setTimeout(() => {
            if (useCountdown) {
                setCountdown(3);
            } else {
                startRecording(scrubPosition);
            }
            setHasStarted(true);
            setSessionActive(true);
        }, 300);
    };
    
    // Cancel scrub and reset - just close menu and reset position
    const cancelScrubAction = () => {
        setShowScrubActions(false);
        setProgress(0);
        setScrubPosition(0);
    };
    
    // Close vinyl and return to platter WITHOUT auto-starting recording
    const closeVinylToPlatter = () => {
        setShowScrubActions(false);
        setIsPopped(false);
        setProgress(0);
        setScrubPosition(0);
        setSessionActive(false); // Ensure no auto-recording triggers
        setCountdown(0); // Reset countdown to prevent auto-start
        // Do NOT auto-start recording - user must tap to record
    };

    // Legacy function - now just closes vinyl, doesn't auto-record
    const handleReturnToPlatter = () => {
        closeVinylToPlatter();
    };

    const handleMainClick = () => {
        // If we just closed the vinyl from a tap, don't do anything else
        // This prevents auto-starting a new recording on the same click
        if (justClosedVinyl.current) {
            justClosedVinyl.current = false;
            return;
        }
        
        // Close scrub actions if open (tap outside)
        if (showScrubActions) {
            setShowScrubActions(false);
            return;
        }
        
        // If vinyl is popped but not showing actions, close it
        if (isPopped && !isScrubbing) {
            closeVinylToPlatter();
            return;
        }
        
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
        
        // Unlock mobile audio on user interaction (file input is a user gesture)
        // This also ensures audioContext exists
        await unlockMobileAudio();
        
        // Double-check audio context exists after unlock
        if (!audioContext.current) {
            console.error('[ScratchLab] Audio context still not available after unlock');
            alert('Audio system not ready. Please try again.');
            return;
        }
        
        setBeatFile(file);
        setBeat(file.name);
        setBeatStoragePath(null);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            console.log('[ScratchLab] Decoding beat file:', file.name, arrayBuffer.byteLength, 'bytes');
            const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
            console.log('[ScratchLab] Beat decoded:', audioBuffer.duration, 'seconds');
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

    // Play countdown click sound
    const playCountdownClick = useCallback(async (countNum) => {
        console.log('[ScratchLab] playCountdownClick:', countNum, 'audioContext:', !!audioContext.current);
        
        if (!audioContext.current) {
            console.warn('[ScratchLab] No audio context for countdown click');
            return;
        }
        
        try {
            // Resume audio context if needed (for mobile)
            if (audioContext.current.state === 'suspended') {
                console.log('[ScratchLab] Resuming audio context for countdown...');
                await audioContext.current.resume();
            }
            
            console.log('[ScratchLab] Audio context state for countdown:', audioContext.current.state);
            
            const osc = audioContext.current.createOscillator();
            const gain = audioContext.current.createGain();
            osc.connect(gain);
            gain.connect(audioContext.current.destination);
            
            // Different pitch for final count vs others
            // 3, 2, 1 = lower pitch, GO = higher pitch
            const baseFreq = countNum === 0 ? 1200 : 800;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, audioContext.current.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, audioContext.current.currentTime + 0.08);
            
            // Louder for countdown
            gain.gain.setValueAtTime(0.5, audioContext.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.1);
            
            osc.start(audioContext.current.currentTime);
            osc.stop(audioContext.current.currentTime + 0.1);
            
            console.log('[ScratchLab] Countdown click:', countNum);
        } catch (e) {
            console.error('[ScratchLab] Countdown click error:', e);
        }
    }, []);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            // Play metronome click for countdown (3, 2, 1)
            playCountdownClick(countdown);
            timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        } else if (countdown === 0 && sessionActive && !isRecording) {
            // Play final "GO" click
            playCountdownClick(0);
            
            // Check if we are starting from scrub or top
            // If sessionActive is true but we haven't started recording, 
            // it means countdown finished. 
            // We need to know where to start. 
            // For now, if we use countdown, we likely start from 0 or scrubPosition.
            // But startSession resets scrubPosition to 0. 
            // recordFromScrubPosition sets sessionActive too.
            // If scrubPosition is > 0, we use it.
            const startOffset = scrubPosition > 0 ? scrubPosition : 0;
            startRecording(startOffset);
            setSessionActive(false);
        }
        return () => clearTimeout(timer);
    }, [countdown, sessionActive, isRecording, playCountdownClick, scrubPosition]);

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

    const handleShiftLayer = (layerId, amount) => {
        setLayers(prev => prev.map(l => {
            if (l.id !== layerId) return l;
            return { ...l, timeShift: (l.timeShift || 0) + amount };
        }));
    };

    // Toggle Nudge Mode
    const [nudgeMode, setNudgeMode] = useState({}); // { [layerId]: boolean }

    const toggleNudgeMode = (layerId) => {
        setNudgeMode(prev => ({ ...prev, [layerId]: !prev[layerId] }));
    };
    
    // --- DRAG TO SHIFT LOGIC ---
    const [dragState, setDragState] = useState({ isDragging: false, layerId: null, startX: 0, startShift: 0, width: 0 });

    const handleLayerDragStart = (e, layerId, currentShift) => {
        // Only allow drag if nudge mode is active
        if (!nudgeMode[layerId]) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const target = e.currentTarget;
        const width = target.offsetWidth;
        
        setDragState({
            isDragging: true,
            layerId,
            startX: clientX,
            startShift: currentShift || 0,
            width
        });
    };

    const handleLayerDragMove = useCallback((e) => {
        if (!dragState.isDragging) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - dragState.startX;
        
        // Convert px to seconds
        if (sessionDuration <= 0) return;
        
        // Width represents sessionDuration
        const pixelsPerSecond = dragState.width / sessionDuration;
        const deltaSeconds = deltaX / pixelsPerSecond;
        
        const newShift = dragState.startShift + deltaSeconds;
        
        setLayers(prev => prev.map(l => {
            if (l.id !== dragState.layerId) return l;
            return { ...l, timeShift: newShift };
        }));
        
    }, [dragState, sessionDuration]);

    const handleLayerDragEnd = useCallback(() => {
        setDragState(prev => ({ ...prev, isDragging: false }));
    }, []);

    // Attach global listeners for move/up when dragging
    useEffect(() => {
        if (dragState.isDragging) {
            window.addEventListener('mousemove', handleLayerDragMove, { passive: false });
            window.addEventListener('mouseup', handleLayerDragEnd);
            window.addEventListener('touchmove', handleLayerDragMove, { passive: false });
            window.addEventListener('touchend', handleLayerDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleLayerDragMove);
            window.removeEventListener('mouseup', handleLayerDragEnd);
            window.removeEventListener('touchmove', handleLayerDragMove);
            window.removeEventListener('touchend', handleLayerDragEnd);
        };
    }, [dragState.isDragging, handleLayerDragMove, handleLayerDragEnd]);
    
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
    
    const createStorageId = () => {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const getAudioExtension = (contentType = '') => ({
        'audio/mp4': 'm4a',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/aac': 'aac',
        'audio/webm': 'webm',
        'audio/flac': 'flac'
    })[contentType.split(';')[0].toLowerCase()] || 'webm';

    const storagePathFor = (authUserId, sessionId, name, contentType) =>
        `${authUserId}/${sessionId}/${name}.${getAudioExtension(contentType)}`;

    const uploadAudioToStorage = async (audioBlob, storagePath) => {
        if (!window.supabase?.storage) {
            throw new Error('Cloud storage is not available. Please sign in again and try saving.');
        }

        const { error } = await window.supabase.storage
            .from('scratch-lab')
            .upload(storagePath, audioBlob, {
                contentType: audioBlob.type || 'audio/webm',
                upsert: false
            });

        if (error) {
            const message = error.message || 'Unknown storage error';
            if (/size|large|quota|limit|payload|413/i.test(message)) {
                throw new Error('This recording is too large for your Scratch Lab cloud storage. Shorten the recording or remove a layer, then try again.');
            }
            throw new Error(`Scratch Lab cloud storage failed: ${message}`);
        }

        return storagePath;
    };

    const removeUploadedAudio = async (storagePaths) => {
        if (!storagePaths.length || !window.supabase?.storage) return;
        const { error } = await window.supabase.storage.from('scratch-lab').remove(storagePaths);
        if (error) {
            console.warn('[ScratchLab] Could not clean up failed save uploads:', error.message);
        }
    };

    const wasSessionCommitted = async (sessionId) => {
        try {
            const { data, error } = await window.supabase
                .from('scratch_sessions')
                .select('id')
                .eq('id', sessionId)
                .maybeSingle();
            if (error) {
                console.warn('[ScratchLab] Could not verify cloud save status:', error.message);
                return null;
            }
            return Boolean(data);
        } catch (error) {
            console.warn('[ScratchLab] Could not verify cloud save status:', error);
            return null;
        }
    };

    const getStorageDownloadUrl = async (storagePath) => {
        if (!storagePath) return null;
        // Keep old public URLs/data URLs readable while new saves use private paths.
        if (/^(https?:|data:|blob:)/i.test(storagePath)) return storagePath;

        const { data, error } = await window.supabase.storage
            .from('scratch-lab')
            .createSignedUrl(storagePath, 60 * 60);
        if (error || !data?.signedUrl) {
            throw new Error(`Could not download Scratch Lab audio: ${error?.message || 'signed URL unavailable'}`);
        }
        return data.signedUrl;
    };

    // Save session metadata only after all audio is in managed storage.
    const saveSessionToSupabase = async () => {
        if (layers.length === 0) {
            alert('No layers to save!');
            return;
        }
        
        setIsSaving(true);
        const uploadedStoragePaths = [];
        let sessionId = null;
        let metadataSaveStarted = false;
        
        try {
            const { data: authData, error: authError } = await window.supabase.auth.getUser();
            const authUser = authData?.user;
            if (authError || !authUser || !user?.id) {
                throw new Error('You must be signed in to save Scratch Lab sessions to the cloud.');
            }

            sessionId = createStorageId();
            let savedBeatPath = beatStoragePath || null;

            // Upload the beat too: a local File cannot be decoded after switching devices.
            if (beatFile) {
                savedBeatPath = storagePathFor(
                    authUser.id,
                    sessionId,
                    'beat',
                    beatFile.type || 'audio/webm'
                );
                uploadedStoragePaths.push(savedBeatPath);
                await uploadAudioToStorage(beatFile, savedBeatPath);
            }

            // Upload every layer before creating any database rows.
            const savedLayers = [];
            
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const response = await fetch(layer.audioUrl);
                if (!response.ok) throw new Error(`Could not read recording layer ${i + 1} before upload.`);
                const audioBlob = await response.blob();

                const storagePath = storagePathFor(
                    authUser.id,
                    sessionId,
                    `layer-${i + 1}`,
                    audioBlob.type || 'audio/webm'
                );
                uploadedStoragePaths.push(storagePath);
                await uploadAudioToStorage(audioBlob, storagePath);

                savedLayers.push({
                    layer_number: layers.length - i, // Newest = 1
                    audio_url: storagePath,
                    waveform_data: Array.isArray(layer.waves) ? layer.waves : [],
                    volume: Number.isFinite(Number(layer.volume)) ? Number(layer.volume) : 80,
                    pan: layer.pan || 0,
                    muted: layer.muted || false,
                    solo: layer.solo || false,
                    duration_seconds: layer.audioBuffer?.duration || 0,
                    time_shift: Number.isFinite(Number(layer.timeShift)) ? Number(layer.timeShift) : 0
                });
            }

            // The RPC inserts the session and all layers in one database transaction.
            metadataSaveStarted = true;
            const { data: savedSession, error: sessionError } = await window.supabase.rpc('save_scratch_session', {
                p_session_id: sessionId,
                p_user_id: user.id,
                p_title: sessionTitle,
                p_beat_url: savedBeatPath,
                p_beat_title: beatFile?.name || beat || null,
                p_layers: savedLayers
            });
            if (sessionError || !savedSession) {
                throw new Error(sessionError?.message || 'Cloud session metadata could not be saved.');
            }

            setBeatStoragePath(savedBeatPath);
            alert(`Session "${sessionTitle}" saved to the cloud.`);
            setShowSaveModal(false);
            loadSavedSessions();
            
        } catch (err) {
            console.error('Error saving session:', err);
            // A connection can drop after PostgreSQL commits but before the browser
            // receives the RPC response. Confirm before deleting uploaded audio.
            if (metadataSaveStarted && sessionId) {
                const sessionCommitted = await wasSessionCommitted(sessionId);
                if (sessionCommitted) {
                    setShowSaveModal(false);
                    loadSavedSessions();
                    alert(`Session "${sessionTitle}" was saved to the cloud.`);
                    return;
                }
                if (sessionCommitted === null) {
                    alert('Cloud save status could not be confirmed. Check Saved Sessions before retrying; your uploaded audio was kept so a completed save is not damaged.');
                    return;
                }
            }

            await removeUploadedAudio(uploadedStoragePaths);
            alert(err.message || 'Failed to save session. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Load saved sessions from Supabase. RLS limits this query to the signed-in user.
    const loadSavedSessions = async () => {
        try {
            setSessionLoadError('');
            if (!user?.id) {
                setSavedSessions([]);
                return;
            }

            const { data, error } = await window.supabase
                .from('scratch_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;

            setSavedSessions(data || []);
        } catch (err) {
            console.error('Error loading sessions:', err);
            setSavedSessions([]);
            setSessionLoadError(err.message || 'Cloud sessions could not be loaded.');
        }
    };
    
    // Load a specific session and all of its audio from managed storage.
    const loadSession = async (sessionId) => {
        const loadedObjectUrls = [];
        try {
            await ensureAudioContext();
            const { data: session, error: sessionError } = await window.supabase
                .from('scratch_sessions')
                .select('*')
                .eq('id', sessionId)
                .maybeSingle();
            if (sessionError) throw sessionError;
            if (!session) {
                throw new Error('Session not found.');
            }

            const { data: sessionLayers, error: layersError } = await window.supabase
                .from('scratch_layers')
                .select('*')
                .eq('session_id', sessionId)
                .order('layer_number', { ascending: false });
            if (layersError) throw layersError;

            let loadedBeatBuffer = null;
            let loadedBeatWaveform = null;
            if (session.beat_url) {
                const beatUrl = await getStorageDownloadUrl(session.beat_url);
                const beatResponse = await fetch(beatUrl);
                if (!beatResponse.ok) throw new Error('The saved beat could not be downloaded.');
                loadedBeatBuffer = await audioContext.current.decodeAudioData(await beatResponse.arrayBuffer());
                loadedBeatWaveform = generateWaveformFromBuffer(loadedBeatBuffer);
            }

            sessionLayers.sort((a, b) => b.layer_number - a.layer_number);
            const loadedLayers = [];
            
            for (const layerData of sessionLayers) {
                const audioUrl = await getStorageDownloadUrl(layerData.audio_url);
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) throw new Error(`Recording layer ${layerData.layer_number} could not be downloaded.`);
                const audioBlob = await audioResponse.blob();
                const objectUrl = URL.createObjectURL(audioBlob);
                loadedObjectUrls.push(objectUrl);
                const audioBuffer = await audioContext.current.decodeAudioData(await audioBlob.arrayBuffer());

                loadedLayers.push({
                    id: layerData.id,
                    timestamp: new Date(layerData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    volume: layerData.volume,
                    waves: layerData.waveform_data,
                    audioBuffer: audioBuffer,
                    audioUrl: objectUrl,
                    muted: layerData.muted,
                    solo: layerData.solo,
                    pan: layerData.pan,
                    timeShift: Number(layerData.time_shift) || 0
                });
            }

            // Only replace the current work after the entire session decoded successfully.
            layers.forEach(layer => {
                if (layer.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(layer.audioUrl);
            });
            setLayers(loadedLayers);
            setSessionTitle(session.title);
            setBeat(session.beat_title || null);
            setBeatFile(null);
            setBeatStoragePath(session.beat_url || null);
            beatAudioBuffer.current = loadedBeatBuffer;
            setBeatWaveform(loadedBeatWaveform);
            setShowLoadModal(false);
            
            alert(`Session "${session.title}" loaded!`);
            
        } catch (err) {
            loadedObjectUrls.forEach(url => URL.revokeObjectURL(url));
            console.error('Error loading session:', err);
            alert(err.message || 'Failed to load session. Please try again.');
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
            {/* Headphone Recommendation Banner */}
            <div style={{
                background: '#eab308',
                color: '#422006',
                padding: '8px 12px',
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                position: 'relative',
                zIndex: 40
            }}>
                <Icon name="Headphones" size={14} />
                <span>Headphones Recommended for Best Quality</span>
            </div>

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                            {/* Audio status indicator - helpful for iOS debugging */}
                            {isIOS.current && (
                                <div 
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await unlockMobileAudio();
                                    }}
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: audioReady ? '#00e676' : '#ff1744',
                                        boxShadow: audioReady ? '0 0 8px #00e676' : '0 0 8px #ff1744',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    title={audioReady ? 'Audio ready' : 'Tap to enable audio'}
                                />
                            )}
                        </div>
                        
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
                            
                            {/* Wood Panel Controls - LEFT Side (opposite from tonearm) */}
                            <g transform="translate(72, 115)" style={{ pointerEvents: 'auto' }}>
                                {/* Mic Input Button - 17% bigger (66x66) */}
                                <g 
                                    transform="translate(0, 0)"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); cycleAudioInput(); }}
                                >
                                    <rect x="0" y="0" width="66" height="66" rx="7" fill="#1a1410" stroke="#0a0805" strokeWidth="2" />
                                    <rect x="3" y="3" width="60" height="60" rx="5" fill="#2a2218" />
                                    <rect x="7" y="7" width="52" height="52" rx="4" fill="#3a3028" />
                                    <text x="33" y="45" textAnchor="middle" fill="#d4b896" fontSize="20" fontWeight="900" fontFamily="Arial, sans-serif">MIC</text>
                                </g>
                                
                                {/* BPM/Metronome Button - 17% bigger - opens popup */}
                                <g 
                                    transform="translate(0, 80)"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); setShowBpmPopup(true); }}
                                >
                                    <rect x="0" y="0" width="66" height="66" rx="7" fill="#1a1410" stroke="#0a0805" strokeWidth="2" />
                                    <rect x="3" y="3" width="60" height="60" rx="5" fill={isMetronomeOn ? '#4a3f00' : '#2a2218'} />
                                    <rect x="7" y="7" width="52" height="52" rx="4" fill={isMetronomeOn ? '#eab308' : '#3a3028'} />
                                    <text x="33" y="30" textAnchor="middle" fill={isMetronomeOn ? '#000' : '#d4b896'} fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif">{bpm}</text>
                                    <text x="33" y="48" textAnchor="middle" fill={isMetronomeOn ? '#000' : '#a08060'} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">BPM</text>
                                    {/* LED indicator */}
                                    <circle cx="57" cy="9" r="5" fill={isMetronomeOn ? '#fde047' : '#222'} className={isMetronomeOn ? 'led-blink' : ''} />
                                </g>
                                
                                {/* Countdown Button - 17% bigger */}
                                <g 
                                    transform="translate(0, 160)"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); setUseCountdown(!useCountdown); }}
                                >
                                    <rect x="0" y="0" width="66" height="66" rx="7" fill="#1a1410" stroke="#0a0805" strokeWidth="2" />
                                    <rect x="3" y="3" width="60" height="60" rx="5" fill={useCountdown ? '#4a3f00' : '#2a2218'} />
                                    <rect x="7" y="7" width="52" height="52" rx="4" fill={useCountdown ? '#eab308' : '#3a3028'} />
                                    <text x="33" y="32" textAnchor="middle" fill={useCountdown ? '#000' : '#d4b896'} fontSize="13" fontWeight="900" fontFamily="Arial, sans-serif">3-2-1</text>
                                    <text x="33" y="50" textAnchor="middle" fill={useCountdown ? '#000' : '#a08060'} fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">COUNT</text>
                                    {/* LED indicator */}
                                    <circle cx="57" cy="9" r="5" fill={useCountdown ? '#fde047' : '#222'} className={useCountdown ? 'led-blink-slow' : ''} />
                                </g>
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
                                {/* Enhanced glow effect for scrub mode */}
                                {isPopped && (
                                    <>
                                        <defs>
                                            <radialGradient id="scrub-glow" cx="50%" cy="50%" r="50%">
                                                <stop offset="0%" stopColor="#ffd700" stopOpacity="0.5" />
                                                <stop offset="40%" stopColor="#ff9100" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#000" stopOpacity="0" />
                                            </radialGradient>
                                            <filter id="vinyl-glow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feGaussianBlur stdDeviation="12" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        {/* Outer glow ring */}
                                        <circle cx="400" cy="300" r="200" fill="url(#scrub-glow)" opacity="0.7" />
                                    </>
                                )}
                                <g style={getRecordStyle()}>
                                    {/* Main vinyl - brighter in scrub mode */}
                                    <circle 
                                        cx="400" cy="300" r="172" 
                                        fill={isPopped ? '#1f1f1f' : 'url(#high-vinyl)'} 
                                        filter={isPopped ? 'url(#vinyl-glow)' : 'none'}
                                    />
                                    {/* Grooves - more visible in scrub mode */}
                                    {[160, 140, 120, 100, 80].map(r => (
                                        <circle 
                                            key={r} 
                                            cx="400" cy="300" r={r} 
                                            fill="none" 
                                            stroke={isPopped ? '#383838' : '#111'} 
                                            strokeWidth={isPopped ? 1.5 : 1} 
                                            opacity={isPopped ? 1 : 0.8} 
                                        />
                                    ))}
                                    {/* Highlight sheen on vinyl when popped */}
                                    {isPopped && (
                                        <ellipse 
                                            cx="360" cy="260" rx="80" ry="40" 
                                            fill="rgba(255,255,255,0.08)" 
                                            transform="rotate(-30, 360, 260)" 
                                        />
                                    )}
                                    {/* Label - brighter in scrub mode */}
                                    <circle 
                                        cx="400" cy="300" r="60" 
                                        fill={isRecording ? "#ff5252" : isPopped ? "#ffb347" : "#ff9100"} 
                                        style={{ transition: 'fill 0.5s' }} 
                                    />
                                    {/* Label highlight when popped */}
                                    {isPopped && (
                                        <ellipse 
                                            cx="385" cy="285" rx="25" ry="15" 
                                            fill="rgba(255,255,255,0.2)" 
                                            transform="rotate(-30, 385, 285)" 
                                        />
                                    )}
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
                        
                        {/* Scrub hint when popped but not scrubbing */}
                        {isPopped && !isScrubbing && !showScrubActions && (
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
                        
                        {/* Live scrub position indicator */}
                        {isScrubbing && sessionDuration > 0 && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '10%', 
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.85)', 
                                backdropFilter: 'blur(10px)',
                                padding: '12px 24px',
                                borderRadius: 16,
                                border: '1px solid rgba(255,255,255,0.2)',
                                pointerEvents: 'none',
                                textAlign: 'center',
                                minWidth: 140
                            }}>
                                <div style={{ 
                                    fontSize: 28, 
                                    fontFamily: 'monospace',
                                    fontWeight: 900, 
                                    color: '#ffd700',
                                    letterSpacing: '0.05em',
                                    textShadow: '0 0 20px rgba(255,215,0,0.5)'
                                }}>
                                    {formatScrubTime(scrubPosition)}
                                </div>
                                <div style={{ 
                                    fontSize: 8, 
                                    color: 'rgba(255,255,255,0.5)',
                                    marginTop: 4,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase'
                                }}>
                                    {scrubVelocity.current > 0.5 ? '⚡ FAST SEEK' : 'FINE CONTROL'}
                                </div>
                            </div>
                        )}
                        
                        {/* Scrub action menu after scrubbing */}
                        {showScrubActions && (
                            <div 
                                style={{ 
                                    position: 'absolute', 
                                    top: '50%', 
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'rgba(0,0,0,0.95)', 
                                    backdropFilter: 'blur(20px)',
                                    padding: 20,
                                    borderRadius: 20,
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    textAlign: 'center',
                                    minWidth: 220,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Time display */}
                                <div style={{ 
                                    fontSize: 32, 
                                    fontFamily: 'monospace',
                                    fontWeight: 900, 
                                    color: '#fff',
                                    marginBottom: 4
                                }}>
                                    {formatScrubTime(scrubPosition)}
                                </div>
                                <div style={{ 
                                    fontSize: 9, 
                                    color: 'rgba(255,255,255,0.4)',
                                    marginBottom: 20,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase'
                                }}>
                                    of {formatScrubTime(sessionDuration)}
                                </div>
                                
                                {/* Action buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {/* Play from here */}
                                    <button
                                        onClick={playFromScrubPosition}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10,
                                            padding: '14px 20px',
                                            background: 'linear-gradient(135deg, #00e676, #00c853)',
                                            border: 'none',
                                            borderRadius: 12,
                                            color: '#000',
                                            fontWeight: 900,
                                            fontSize: 11,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s, box-shadow 0.1s',
                                            boxShadow: '0 4px 15px rgba(0,230,118,0.3)'
                                        }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Icon name="Play" size={16} />
                                        Play From Here
                                    </button>
                                    
                                    {/* Record from here (punch-in) */}
                                    <button
                                        onClick={recordFromScrubPosition}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10,
                                            padding: '14px 20px',
                                            background: 'linear-gradient(135deg, #ff1744, #d50000)',
                                            border: 'none',
                                            borderRadius: 12,
                                            color: '#fff',
                                            fontWeight: 900,
                                            fontSize: 11,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s, box-shadow 0.1s',
                                            boxShadow: '0 4px 15px rgba(255,23,68,0.3)'
                                        }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Icon name="Mic" size={16} />
                                        Record From Here
                                    </button>
                                    
                                    {/* Cancel / go back to start */}
                                    <button
                                        onClick={cancelScrubAction}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            padding: '12px 16px',
                                            background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: 10,
                                            color: 'rgba(255,255,255,0.6)',
                                            fontWeight: 700,
                                            fontSize: 10,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                        }}
                                    >
                                        <Icon name="RotateCcw" size={14} />
                                        Reset to Start
                                    </button>
                                    
                                    {/* Close vinyl and go back */}
                                    <button
                                        onClick={closeVinylToPlatter}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            padding: '12px 16px',
                                            background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10,
                                            color: 'rgba(255,255,255,0.4)',
                                            fontWeight: 700,
                                            fontSize: 10,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                                        }}
                                    >
                                        <Icon name="X" size={14} />
                                        Close
                                    </button>
                                </div>
                                
                                {/* Close hint */}
                                <div style={{ 
                                    marginTop: 12,
                                    fontSize: 8, 
                                    color: 'rgba(255,255,255,0.25)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase'
                                }}>
                                    Tap outside to close
                                </div>
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
                                fontSize: 14,
                                fontWeight: 900,
                                color: '#ff1744',
                                zIndex: 20,
                                background: 'rgba(255,255,255,0.9)',
                                padding: '4px 8px',
                                borderRadius: 6,
                                pointerEvents: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                letterSpacing: '-0.02em',
                                maxWidth: '90%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
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
                                        background: (isPlaying || isScrubbing || showScrubActions) ? '#ffd700' : 'black',
                                        height: `${Math.max(4, h)}%`,
                                        opacity: 1
                                    }}
                                />
                            ))}
                            {(isPlaying || isScrubbing || showScrubActions) && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    bottom: 0, 
                                    width: showScrubActions ? 3 : 2, 
                                    background: '#ff1744', 
                                    zIndex: 10,
                                    left: `${progress}%`,
                                    boxShadow: showScrubActions ? '0 0 10px rgba(255,23,68,0.5)' : 'none'
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

                        <div 
                            style={{ 
                                flex: 1, 
                                height: 80, 
                                position: 'relative', 
                                overflow: 'hidden',
                                cursor: nudgeMode[layer.id] ? 'ew-resize' : 'default',
                                touchAction: nudgeMode[layer.id] ? 'none' : 'auto',
                                border: nudgeMode[layer.id] ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                                borderRadius: 4
                            }}
                            onMouseDown={(e) => handleLayerDragStart(e, layer.id, layer.timeShift)}
                            onTouchStart={(e) => handleLayerDragStart(e, layer.id, layer.timeShift)}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                height: '100%',
                                width: '100%',
                                transform: `translateX(${(layer.timeShift || 0) / sessionDuration * 100}%)`,
                                transition: dragState.isDragging && dragState.layerId === layer.id ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
                            }}>
                                {layer.waves.map((h, i) => (
                                    <div 
                                        key={i} 
                                        style={{ 
                                            flex: 1, 
                                            borderRadius: 2,
                                            transition: 'background 0.3s, height 0.3s',
                                            background: (isPlaying || isScrubbing || showScrubActions) ? '#ffd700' : (nudgeMode[layer.id] ? '#fff' : 'black'),
                                            height: `${Math.max(10, h)}%`, // Ensure minimum height is visible
                                            opacity: 1
                                        }}
                                    />
                                ))}
                            </div>
                            
                            {(isPlaying || isScrubbing || showScrubActions) && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    bottom: 0, 
                                    width: showScrubActions ? 3 : 2, 
                                    background: showScrubActions ? '#ff1744' : 'var(--black)', 
                                    zIndex: 10,
                                    left: `${progress}%`,
                                    boxShadow: showScrubActions ? '0 0 10px rgba(255,23,68,0.5)' : 'none',
                                    pointerEvents: 'none'
                                }} />
                            )}
                            
                            {/* Nudge visual feedback */}
                            {nudgeMode[layer.id] && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 4,
                                    fontSize: 8,
                                    fontWeight: 900,
                                    color: 'var(--black)',
                                    background: 'var(--white)',
                                    padding: '1px 4px',
                                    borderRadius: 4,
                                    pointerEvents: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}>
                                    {((layer.timeShift || 0) * 1000).toFixed(0)}ms
                                </div>
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

                            {/* Nudge/Shift Toggle */}
                            <button 
                                onClick={() => toggleNudgeMode(layer.id)}
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: nudgeMode[layer.id] ? 'var(--white)' : 'transparent',
                                    color: nudgeMode[layer.id] ? 'var(--black)' : 'var(--gray)',
                                    cursor: 'pointer',
                                    fontSize: 7,
                                    fontWeight: 900,
                                    transition: 'all 0.2s'
                                }}
                                title="Drag to Align"
                            >
                                <Icon name="MoveHorizontal" size={12} />
                            </button>

                            {/* Volume Slider */}
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
                            onClick={async () => { 
                                if (isPlaying) {
                                    stopAllAudio();
                                } else {
                                    // Unlock audio first (critical for iOS)
                                    await unlockMobileAudio();
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
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ 
                                    fontSize: 7, 
                                    fontWeight: 900, 
                                    letterSpacing: '0.2em', 
                                    color: 'var(--gray)', 
                                    textTransform: 'uppercase' 
                                }}>Master Feed</span>
                                <span style={{ 
                                    fontSize: 10, 
                                    fontFamily: 'monospace',
                                    fontWeight: 700, 
                                    color: isPlaying ? 'var(--black)' : 'var(--gray)',
                                    letterSpacing: '0.05em'
                                }}>
                                    {formatScrubTime((progress / 100) * sessionDuration)} / {formatScrubTime(sessionDuration)}
                                </span>
                            </div>
                            {/* Clickable seek bar */}
                            <div 
                                style={{ 
                                    height: 8, 
                                    background: 'var(--paper)', 
                                    borderRadius: 8, 
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onClick={(e) => {
                                    if (sessionDuration === 0) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const newProgress = (clickX / rect.width) * 100;
                                    const newPosition = (newProgress / 100) * sessionDuration;
                                    
                                    setProgress(Math.max(0, Math.min(100, newProgress)));
                                    setScrubPosition(newPosition);
                                    
                                    // If playing, restart from new position
                                    if (isPlaying) {
                                        stopAllAudio();
                                        playAllLayers(newPosition);
                                    }
                                }}
                            >
                                <div style={{ 
                                    height: '100%', 
                                    background: isPlaying ? '#00e676' : 'var(--black)', 
                                    transition: 'width 0.075s',
                                    width: `${progress}%`,
                                    borderRadius: 8
                                }} />
                                {/* Seek handle */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: `${progress}%`,
                                    transform: 'translate(-50%, -50%)',
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: 'var(--black)',
                                    border: '2px solid white',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    opacity: isPlaying || progress > 0 ? 1 : 0,
                                    transition: 'opacity 0.2s'
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

            {/* Export Modal - Brutalist Newspaper Style */}
            {showSaveModal && (
                <div 
                    className="animate-fade-in"
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        zIndex: 100, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: 20, 
                        background: 'rgba(0,0,0,0.85)'
                    }}
                    onClick={() => !isSaving && setShowSaveModal(false)}
                >
                    <div 
                        className="animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '4px solid var(--black)',
                            padding: 0, 
                            width: '100%', 
                            maxWidth: 340,
                            boxShadow: '8px 8px 0 var(--black)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'var(--black)',
                            color: 'var(--white)',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ 
                                fontSize: 10, 
                                fontWeight: 900, 
                                letterSpacing: '0.2em',
                                fontFamily: 'IBM Plex Mono, monospace'
                            }}>EXPORT WAX</span>
                            <button 
                                onClick={() => !isSaving && setShowSaveModal(false)}
                                disabled={isSaving}
                                style={{ 
                                    color: 'var(--white)', 
                                    background: 'none', 
                                    border: 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    padding: 4,
                                    opacity: isSaving ? 0.5 : 1
                                }}
                            >
                                <Icon name="X" size={18} />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div style={{ padding: 24 }}>
                            {/* Vinyl Icon */}
                            <div style={{
                                width: 72,
                                height: 72,
                                background: 'var(--black)',
                                borderRadius: '50%',
                                margin: '0 auto 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                boxShadow: '4px 4px 0 var(--gray)'
                            }}>
                                <div style={{
                                    width: 20,
                                    height: 20,
                                    background: 'var(--beat-purple)',
                                    borderRadius: '50%'
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    width: 50,
                                    height: 50,
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '50%'
                                }} />
                            </div>
                            
                            <h2 style={{ 
                                fontSize: 24, 
                                fontFamily: 'Playfair Display, Georgia, serif',
                                fontWeight: 900, 
                                fontStyle: 'italic',
                                color: 'var(--black)', 
                                marginBottom: 8,
                                textAlign: 'center',
                                letterSpacing: '-0.02em'
                            }}>Press Your Wax</h2>
                            
                            <p style={{ 
                                color: 'var(--gray)', 
                                marginBottom: 20, 
                                fontSize: 10, 
                                lineHeight: 1.6,
                                textTransform: 'uppercase', 
                                letterSpacing: '0.1em',
                                textAlign: 'center',
                                fontFamily: 'IBM Plex Mono, monospace'
                            }}>{layers.length} LAYER{layers.length !== 1 ? 'S' : ''} • MASTER MIX</p>
                            
                            {/* Title Input */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    marginBottom: 8,
                                    color: 'var(--gray)',
                                    fontFamily: 'IBM Plex Mono, monospace'
                                }}>SESSION TITLE</label>
                                <input
                                    type="text"
                                    value={sessionTitle}
                                    onChange={(e) => setSessionTitle(e.target.value)}
                                    placeholder="Untitled Session"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        border: '2px solid var(--black)',
                                        fontSize: 14,
                                        fontFamily: 'Playfair Display, Georgia, serif',
                                        fontStyle: 'italic',
                                        background: 'var(--white)',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            
                            {/* Download to Device */}
                            <button 
                                onClick={exportMasterToDevice}
                                disabled={isSaving}
                                style={{
                                    width: '100%',
                                    background: isSaving ? 'var(--gray)' : 'var(--brand-green)',
                                    color: 'var(--white)',
                                    padding: '14px 16px',
                                    fontWeight: 900,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    fontSize: 10,
                                    border: '2px solid var(--black)',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    marginBottom: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    boxShadow: isSaving ? 'none' : '3px 3px 0 var(--black)',
                                    transform: 'translate(0, 0)',
                                    transition: 'transform 0.1s, box-shadow 0.1s'
                                }}
                                onMouseDown={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(3px, 3px)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(0, 0)';
                                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--black)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(0, 0)';
                                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--black)';
                                    }
                                }}
                            >
                                <Icon name="Download" size={14} />
                                {isSaving ? 'PRESSING...' : 'DOWNLOAD WAV'}
                            </button>
                            
                            {/* Save to Database */}
                            <button 
                                onClick={saveSessionToSupabase}
                                disabled={isSaving}
                                style={{
                                    width: '100%',
                                    background: isSaving ? 'var(--gray)' : 'var(--beat-purple)',
                                    color: 'var(--white)',
                                    padding: '14px 16px',
                                    fontWeight: 900,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    fontSize: 10,
                                    border: '2px solid var(--black)',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    marginBottom: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    boxShadow: isSaving ? 'none' : '3px 3px 0 var(--black)',
                                    transform: 'translate(0, 0)',
                                    transition: 'transform 0.1s, box-shadow 0.1s'
                                }}
                                onMouseDown={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(3px, 3px)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(0, 0)';
                                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--black)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.transform = 'translate(0, 0)';
                                        e.currentTarget.style.boxShadow = '3px 3px 0 var(--black)';
                                    }
                                }}
                            >
                                <Icon name="Cloud" size={14} />
                                {isSaving ? 'SAVING...' : 'SAVE TO CLOUD'}
                            </button>
                            
                            {/* Cancel Link */}
                            <button 
                                onClick={() => setShowSaveModal(false)} 
                                disabled={isSaving}
                                style={{ 
                                    width: '100%', 
                                    fontSize: 9, 
                                    fontWeight: 700, 
                                    letterSpacing: '0.15em', 
                                    color: 'var(--gray)',
                                    textTransform: 'uppercase',
                                    background: 'none',
                                    border: 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    padding: 8,
                                    fontFamily: 'IBM Plex Mono, monospace',
                                    opacity: isSaving ? 0.5 : 1
                                }}
                            >
                                NEVERMIND
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Load Sessions Modal - Brutalist Style */}
            {showLoadModal && (
                <div 
                    className="animate-fade-in"
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        zIndex: 100, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: 20, 
                        background: 'rgba(0,0,0,0.85)'
                    }}
                    onClick={() => setShowLoadModal(false)}
                >
                    <div 
                        className="animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '4px solid var(--black)',
                            width: '100%', 
                            maxWidth: 400, 
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '8px 8px 0 var(--black)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'var(--black)',
                            color: 'var(--white)',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ 
                                fontSize: 10, 
                                fontWeight: 900, 
                                letterSpacing: '0.2em',
                                fontFamily: 'IBM Plex Mono, monospace'
                            }}>SAVED SESSIONS</span>
                            <button
                                onClick={() => setShowLoadModal(false)}
                                style={{
                                    color: 'var(--white)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <Icon name="X" size={18} />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div style={{ 
                            flex: 1, 
                            overflowY: 'auto',
                            padding: 16
                        }}>
                            {sessionLoadError ? (
                                <div style={{
                                    padding: 32,
                                    textAlign: 'center',
                                    color: '#991b1b',
                                    fontSize: 10,
                                    lineHeight: 1.6,
                                    fontFamily: 'IBM Plex Mono, monospace'
                                }}>
                                    <Icon name="AlertTriangle" size={28} />
                                    <div style={{ marginTop: 12 }}>
                                        {sessionLoadError}
                                    </div>
                                </div>
                            ) : savedSessions.length === 0 ? (
                                <div style={{
                                    padding: 48,
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 16
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        background: 'var(--light-gray)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon name="Disc" size={24} />
                                    </div>
                                    <span style={{
                                        color: 'var(--gray)',
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.15em',
                                        fontFamily: 'IBM Plex Mono, monospace'
                                    }}>
                                        NO SAVED SESSIONS YET
                                    </span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {savedSessions.map(session => (
                                        <button
                                            key={session.id}
                                            onClick={() => loadSession(session.id)}
                                            style={{
                                                background: 'var(--white)',
                                                border: '2px solid var(--black)',
                                                padding: 14,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                boxShadow: '2px 2px 0 var(--black)',
                                                transform: 'translate(0, 0)',
                                                transition: 'transform 0.1s, box-shadow 0.1s'
                                            }}
                                            onMouseDown={(e) => {
                                                e.currentTarget.style.transform = 'translate(2px, 2px)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                            onMouseUp={(e) => {
                                                e.currentTarget.style.transform = 'translate(0, 0)';
                                                e.currentTarget.style.boxShadow = '2px 2px 0 var(--black)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translate(0, 0)';
                                                e.currentTarget.style.boxShadow = '2px 2px 0 var(--black)';
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 14,
                                                fontWeight: 700,
                                                marginBottom: 4,
                                                fontFamily: 'Playfair Display, Georgia, serif',
                                                fontStyle: 'italic'
                                            }}>{session.title}</div>
                                            <div style={{
                                                fontSize: 9,
                                                color: 'var(--gray)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.1em',
                                                fontFamily: 'IBM Plex Mono, monospace'
                                            }}>
                                                {new Date(session.created_at).toLocaleDateString()}
                                                {session.beat_title && ` • ${session.beat_title}`}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* BPM Popup Modal */}
            {showBpmPopup && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        zIndex: 100, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: 20, 
                        background: 'rgba(0,0,0,0.85)'
                    }}
                    onClick={() => setShowBpmPopup(false)}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            background: '#1a1a1a',
                            border: '3px solid #333',
                            borderRadius: 16,
                            padding: 24, 
                            width: '100%', 
                            maxWidth: 280,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20
                        }}>
                            <span style={{ 
                                fontSize: 12, 
                                fontWeight: 900, 
                                letterSpacing: '0.15em',
                                color: '#fff',
                                fontFamily: 'var(--font-mono)'
                            }}>METRONOME</span>
                            <button 
                                onClick={() => setShowBpmPopup(false)}
                                style={{ 
                                    color: '#666', 
                                    background: 'none', 
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 4
                                }}
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        
                        {/* BPM Display */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: 20
                        }}>
                            <div style={{
                                fontSize: 56,
                                fontWeight: 900,
                                color: isMetronomeOn ? '#eab308' : '#fff',
                                fontFamily: 'var(--font-mono)',
                                lineHeight: 1
                            }}>{bpm}</div>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: isMetronomeOn ? '#eab308' : '#666',
                                letterSpacing: '0.2em',
                                marginTop: 4
                            }}>BPM</div>
                        </div>
                        
                        {/* BPM Slider */}
                        <div style={{ marginBottom: 20 }}>
                            <input 
                                type="range" 
                                min="40" 
                                max="200" 
                                value={bpm}
                                onChange={(e) => setBpm(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: 8,
                                    background: `linear-gradient(to right, #eab308 0%, #eab308 ${((bpm - 40) / 160) * 100}%, #333 ${((bpm - 40) / 160) * 100}%, #333 100%)`,
                                    borderRadius: 8,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: 8,
                                fontSize: 10,
                                color: '#666',
                                fontFamily: 'var(--font-mono)'
                            }}>
                                <span>40</span>
                                <span>200</span>
                            </div>
                        </div>
                        
                        {/* Preset BPM buttons */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                            marginBottom: 20
                        }}>
                            {[60, 80, 90, 100, 110, 120, 140, 160].map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => setBpm(preset)}
                                    style={{
                                        padding: '10px 0',
                                        background: bpm === preset ? '#eab308' : '#2a2a2a',
                                        border: 'none',
                                        borderRadius: 8,
                                        color: bpm === preset ? '#000' : '#888',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                        
                        {/* Toggle Metronome Button */}
                        <button
                            onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                            style={{
                                width: '100%',
                                padding: '14px 20px',
                                background: isMetronomeOn ? '#eab308' : '#2a2a2a',
                                border: isMetronomeOn ? '2px solid #fde047' : '2px solid #444',
                                borderRadius: 12,
                                color: isMetronomeOn ? '#000' : '#fff',
                                fontSize: 12,
                                fontWeight: 900,
                                letterSpacing: '0.1em',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                transition: 'all 0.15s'
                            }}
                        >
                            <Icon name={isMetronomeOn ? "Pause" : "Play"} size={16} />
                            {isMetronomeOn ? 'STOP METRONOME' : 'START METRONOME'}
                        </button>
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
