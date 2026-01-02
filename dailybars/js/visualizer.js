// ============================================================================
// VINTAGE MIC VISUALIZER
// "The Booth" Mode - Classic Studio Aesthetic
// ============================================================================

const MicVisualizer = ({ stream, audioUrl, isRecording, isPlaying, width = 300, height = 300 }) => {
    const canvasRef = React.useRef(null);
    const audioContextRef = React.useRef(null);
    const analyserRef = React.useRef(null);
    const sourceRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const micRef = React.useRef(null);
    
    // Initialize Audio Context
    React.useEffect(() => {
        if (!isRecording && !isPlaying) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const initAudio = async () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const ctx = audioContextRef.current;
            
            // Resume context if suspended (common in browsers)
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Create Analyser
            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.smoothingTimeConstant = 0.5;
            }

            // Setup Source
            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }

            if (isRecording && stream) {
                try {
                    sourceRef.current = ctx.createMediaStreamSource(stream);
                    sourceRef.current.connect(analyserRef.current);
                } catch (e) {
                    console.error("Visualizer stream error:", e);
                }
            }

            startAnimation();
        };

        initAudio();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isRecording, isPlaying, stream, audioUrl]);

    const startAnimation = () => {
        const canvas = canvasRef.current;
        const mic = micRef.current;
        if (!canvas || !analyserRef.current) return;

        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Lightning bolt positions (will be randomized based on audio)
        let bolts = [];

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Mic rocking animation
            if (mic) {
                const wobble = Math.sin(Date.now() / 100) * 1.5;
                const rockAngle = ((average / 255) * 6) * (Math.sin(Date.now() / 60)) + (average > 15 ? wobble : 0);
                mic.style.transform = `rotate(${rockAngle}deg) scale(${1 + (average / 2000)})`;
            }

            // Clear Canvas
            ctx.clearRect(0, 0, width, height);

            // Draw small black lightning bolts when volume is significant
            if (average > 20) {
                const centerX = width / 2;
                const centerY = height / 2 - 20;
                
                // Number of bolts based on volume (1-4)
                const numBolts = Math.min(4, Math.floor(average / 50) + 1);
                
                // Update bolt positions occasionally
                if (Math.random() > 0.7 || bolts.length !== numBolts) {
                    bolts = [];
                    for (let i = 0; i < numBolts; i++) {
                        const angle = (Math.PI * 2 / numBolts) * i + Math.random() * 0.5;
                        const distance = 70 + Math.random() * 40;
                        bolts.push({
                            x: centerX + Math.cos(angle) * distance,
                            y: centerY + Math.sin(angle) * distance,
                            rotation: Math.random() * 360,
                            scale: 0.6 + Math.random() * 0.4
                        });
                    }
                }

                // Draw each lightning bolt symbol
                bolts.forEach(bolt => {
                    ctx.save();
                    ctx.translate(bolt.x, bolt.y);
                    ctx.rotate((bolt.rotation * Math.PI) / 180);
                    ctx.scale(bolt.scale, bolt.scale);
                    
                    // Simple lightning bolt path
                    ctx.beginPath();
                    ctx.moveTo(0, -12);
                    ctx.lineTo(4, -2);
                    ctx.lineTo(1, -2);
                    ctx.lineTo(4, 12);
                    ctx.lineTo(-2, 2);
                    ctx.lineTo(1, 2);
                    ctx.lineTo(-4, -12);
                    ctx.closePath();
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fill();
                    
                    ctx.restore();
                });
            }
        };

        draw();
    };

    return (
        <div style={{ 
            position: 'relative', 
            width, 
            height, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            overflow: 'hidden',
            background: 'transparent'
        }}>
            {/* Detailed Vintage Mic SVG */}
            <div 
                ref={micRef}
                style={{
                    width: 140,
                    height: 220,
                    transition: 'transform 0.08s linear',
                    zIndex: 10,
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
                }}
            >
                <svg viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        {/* Chrome gradient for body */}
                        <linearGradient id="chromeBody" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#888" />
                            <stop offset="15%" stopColor="#ddd" />
                            <stop offset="30%" stopColor="#fff" />
                            <stop offset="50%" stopColor="#ccc" />
                            <stop offset="70%" stopColor="#fff" />
                            <stop offset="85%" stopColor="#bbb" />
                            <stop offset="100%" stopColor="#777" />
                        </linearGradient>
                        
                        {/* Dark gradient for grill */}
                        <linearGradient id="grillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#222" />
                            <stop offset="50%" stopColor="#444" />
                            <stop offset="100%" stopColor="#222" />
                        </linearGradient>
                        
                        {/* Gold accent gradient */}
                        <linearGradient id="goldAccent" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#D4AF37" />
                            <stop offset="50%" stopColor="#F5D67B" />
                            <stop offset="100%" stopColor="#C5A028" />
                        </linearGradient>
                        
                        {/* Grill pattern */}
                        <pattern id="grillLines" x="0" y="0" width="6" height="3" patternUnits="userSpaceOnUse">
                            <rect width="6" height="3" fill="#333"/>
                            <rect y="1" width="6" height="1" fill="#555"/>
                        </pattern>
                    </defs>
                    
                    {/* Stand/Mount */}
                    <rect x="44" y="135" width="12" height="25" rx="2" fill="#222" stroke="#111" strokeWidth="1"/>
                    <ellipse cx="50" cy="135" rx="8" ry="3" fill="#333"/>
                    
                    {/* Main Body - Outer Shell */}
                    <path d="M18 25 C18 8 82 8 82 25 V 115 C82 132 18 132 18 115 Z" 
                          fill="url(#chromeBody)" stroke="#333" strokeWidth="1.5"/>
                    
                    {/* Top Cap */}
                    <ellipse cx="50" cy="18" rx="32" ry="10" fill="url(#chromeBody)" stroke="#444" strokeWidth="1"/>
                    <ellipse cx="50" cy="18" rx="24" ry="6" fill="#444"/>
                    
                    {/* Grill Section */}
                    <path d="M23 28 C23 18 77 18 77 28 V 108 C77 118 23 118 23 108 Z" 
                          fill="url(#grillLines)" stroke="#222" strokeWidth="1"/>
                    
                    {/* Horizontal Chrome Bands */}
                    <rect x="18" y="38" width="64" height="4" fill="url(#chromeBody)" stroke="#444" strokeWidth="0.5"/>
                    <rect x="18" y="58" width="64" height="4" fill="url(#chromeBody)" stroke="#444" strokeWidth="0.5"/>
                    <rect x="18" y="78" width="64" height="4" fill="url(#chromeBody)" stroke="#444" strokeWidth="0.5"/>
                    <rect x="18" y="98" width="64" height="4" fill="url(#chromeBody)" stroke="#444" strokeWidth="0.5"/>
                    
                    {/* Center Vertical Band */}
                    <rect x="46" y="22" width="8" height="96" fill="url(#chromeBody)" stroke="#444" strokeWidth="0.5"/>
                    
                    {/* Gold Ring Accents */}
                    <ellipse cx="50" cy="120" rx="28" ry="8" fill="none" stroke="url(#goldAccent)" strokeWidth="2"/>
                    <ellipse cx="50" cy="126" rx="22" ry="5" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5"/>
                    
                    {/* Logo Plate */}
                    <rect x="38" y="122" width="24" height="10" rx="1" fill="#111"/>
                    <text x="50" y="129" fontSize="5" fill="url(#goldAccent)" textAnchor="middle" fontFamily="'Arial Black', sans-serif" fontWeight="bold">4000</text>
                    
                    {/* Screws/Rivets */}
                    <circle cx="26" cy="30" r="2" fill="#666" stroke="#444"/>
                    <circle cx="74" cy="30" r="2" fill="#666" stroke="#444"/>
                    <circle cx="26" cy="110" r="2" fill="#666" stroke="#444"/>
                    <circle cx="74" cy="110" r="2" fill="#666" stroke="#444"/>
                    
                    {/* Inner grill holes (subtle) */}
                    <circle cx="35" cy="48" r="1.5" fill="#222"/>
                    <circle cx="65" cy="48" r="1.5" fill="#222"/>
                    <circle cx="35" cy="68" r="1.5" fill="#222"/>
                    <circle cx="65" cy="68" r="1.5" fill="#222"/>
                    <circle cx="35" cy="88" r="1.5" fill="#222"/>
                    <circle cx="65" cy="88" r="1.5" fill="#222"/>
                </svg>
            </div>

            {/* Canvas Overlay for Lightning Bolts */}
            <canvas 
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 20
                }}
            />
        </div>
    );
};

// Export to window
window.MicVisualizer = MicVisualizer;
