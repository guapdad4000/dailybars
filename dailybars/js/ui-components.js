// ============================================================================
// DAILY BARS UI COMPONENTS
// Custom modals, SVG icons, and newspaper-styled popups
// ============================================================================

// SVG Icon component - replaces all emojis with clean black shapes
const SvgIcon = ({ name, size = 16, color = 'currentColor', style = {} }) => {
    const icons = {
        fire: (
            <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.52 1.17-4.83 3-6.36V8c0-.55.45-1 1-1s1 .45 1 1v.64c.47-.17.97-.29 1.5-.36C9.73 6.5 10 4.67 10 3c0-.55.45-1 1-1 4.97 0 9 3.58 9 8 0 .17-.01.34-.02.51C21.22 11.85 22 13.35 22 15c0 4.42-4.03 8-9 8h-1zm0-2c3.86 0 7-2.69 7-6 0-1.17-.38-2.27-1.02-3.19-.39.12-.8.19-1.23.19-2.49 0-4.5-1.79-4.5-4 0-.17.01-.34.04-.5-.35-.03-.69-.05-1.04-.05C8.13 7.45 6 9.79 6 12.5 6 17.19 8.24 21 12 21z" fill={color}/>
        ),
        star: (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color}/>
        ),
        save: (
            <path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill={color}/>
        ),
        mic: (
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" fill={color}/>
        ),
        lock: (
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill={color}/>
        ),
        trophy: (
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" fill={color}/>
        ),
        music: (
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill={color}/>
        ),
        heart: (
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color}/>
        ),
        sparkle: (
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" fill={color}/>
        ),
        bolt: (
            <path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z" fill={color}/>
        ),
        lightbulb: (
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" fill={color}/>
        ),
        target: (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill={color}/>
        ),
        edit: (
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={color}/>
        ),
        trash: (
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill={color}/>
        ),
        check: (
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill={color}/>
        ),
        x: (
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill={color}/>
        ),
        arrowUp: (
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill={color}/>
        ),
        arrowDown: (
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill={color}/>
        ),
        arrowRight: (
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill={color}/>
        ),
        arrowLeft: (
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" fill={color}/>
        ),
        package: (
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill={color}/>
        ),
        info: (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill={color}/>
        ),
        warning: (
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill={color}/>
        ),
        success: (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill={color}/>
        ),
        error: (
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill={color}/>
        ),
        level: (
            <path d="M12 7.5l2.25 4.5 5.25.75-3.75 3.75.75 5.25L12 19.5l-4.5 2.25.75-5.25L4.5 12.75l5.25-.75L12 7.5z" fill={color}/>
        )
    };

    const iconPath = icons[name] || icons.star;
    
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
        >
            {iconPath}
        </svg>
    );
};

// Newspaper-styled Modal Component
const NewspaperModal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    actions = [],
    size = 'medium' // small, medium, large, fullscreen
}) => {
    if (!isOpen) return null;
    
    const sizes = {
        small: { maxWidth: 320, padding: 20 },
        medium: { maxWidth: 420, padding: 24 },
        large: { maxWidth: 560, padding: 28 },
        fullscreen: { maxWidth: '100%', height: '100%', padding: 20 }
    };
    
    const sizeStyle = sizes[size] || sizes.medium;
    
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: size === 'fullscreen' ? 0 : 16
        }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(4px)'
                }}
            />
            
            {/* Modal Content */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: sizeStyle.maxWidth,
                maxHeight: size === 'fullscreen' ? '100%' : '90vh',
                overflow: 'auto',
                backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: size === 'fullscreen' ? 0 : 4,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: size === 'fullscreen' ? 'none' : '2px solid var(--black)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: `${sizeStyle.padding}px ${sizeStyle.padding}px 12px`,
                    borderBottom: '2px solid var(--black)'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 900,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'var(--black)',
                        fontFamily: 'var(--font-display)'
                    }}>
                        {title}
                    </h2>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4
                        }}
                    >
                        <SvgIcon name="x" size={20} color="var(--black)" />
                    </button>
                </div>
                
                {/* Body */}
                <div style={{
                    padding: sizeStyle.padding,
                    color: 'var(--black)',
                    fontSize: 13,
                    lineHeight: 1.6
                }}>
                    {children}
                </div>
                
                {/* Actions */}
                {actions.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: 12,
                        padding: `12px ${sizeStyle.padding}px ${sizeStyle.padding}px`,
                        borderTop: '1px solid rgba(0,0,0,0.1)'
                    }}>
                        {actions.map((action, i) => (
                            <button
                                key={i}
                                onClick={action.onClick}
                                style={{
                                    flex: action.flex || 1,
                                    padding: '12px 16px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    border: action.variant === 'outline' ? '2px solid var(--black)' : 'none',
                                    background: action.variant === 'outline' ? 'transparent' : 'var(--black)',
                                    color: action.variant === 'outline' ? 'var(--black)' : 'var(--white)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Confirm Dialog Component (replaces browser confirm())
const ConfirmDialog = ({ 
    isOpen, 
    onConfirm, 
    onCancel, 
    title = 'CONFIRM', 
    message,
    confirmLabel = 'CONFIRM',
    cancelLabel = 'CANCEL',
    icon = 'warning'
}) => {
    return (
        <NewspaperModal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            size="small"
            actions={[
                { label: cancelLabel, onClick: onCancel, variant: 'outline' },
                { label: confirmLabel, onClick: onConfirm }
            ]}
        >
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ marginBottom: 16 }}>
                    <SvgIcon name={icon} size={48} color="var(--black)" />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{message}</p>
            </div>
        </NewspaperModal>
    );
};

// Alert Dialog Component (replaces browser alert())
const AlertDialog = ({ 
    isOpen, 
    onClose, 
    title = 'NOTICE', 
    message,
    buttonLabel = 'GOT IT',
    icon = 'info'
}) => {
    return (
        <NewspaperModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="small"
            actions={[
                { label: buttonLabel, onClick: onClose }
            ]}
        >
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ marginBottom: 16 }}>
                    <SvgIcon name={icon} size={48} color="var(--black)" />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{message}</p>
            </div>
        </NewspaperModal>
    );
};

// Level Up Celebration Modal
const LevelUpModal = ({ isOpen, onClose, level }) => {
    return (
        <NewspaperModal
            isOpen={isOpen}
            onClose={onClose}
            title="LEVEL UP!"
            size="small"
            actions={[
                { label: 'KEEP GRINDING', onClick: onClose }
            ]}
        >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ 
                    width: 80, 
                    height: 80, 
                    margin: '0 auto 20px',
                    background: 'var(--black)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <SvgIcon name="level" size={40} color="var(--white)" />
                </div>
                <div style={{ 
                    fontSize: 48, 
                    fontWeight: 900, 
                    fontFamily: 'var(--font-display)',
                    color: 'var(--black)',
                    lineHeight: 1
                }}>
                    {level}
                </div>
                <div style={{ 
                    fontSize: 12, 
                    letterSpacing: '0.2em',
                    marginTop: 8,
                    color: 'var(--gray)'
                }}>
                    NEW LEVEL UNLOCKED
                </div>
            </div>
        </NewspaperModal>
    );
};

// Toast with SVG icons
const ToastWithIcon = ({ message, type = 'info' }) => {
    const icons = {
        success: 'check',
        error: 'x',
        warning: 'warning',
        info: 'info'
    };
    
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SvgIcon name={icons[type] || 'info'} size={16} />
            <span>{message}</span>
        </div>
    );
};

// ============================================================================
// RADIO BEAT PLAYER (Vintage Style)
// ============================================================================

const RadioWidget = ({ isPlaying, onClick }) => {
    // We inject the SVG with conditional classes/styles based on isPlaying
    const animationState = isPlaying ? 'running' : 'paused';
    const needleState = isPlaying ? 'running' : 'paused';
    
    // We also might want to reduce the opacity/intensity when paused
    const containerStyle = {
        width: '100%',
        height: '100%',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
        filter: isPlaying ? 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.3))' : 'grayscale(30%)'
    };

    // Helper to inject animation state into styles
    const svgStyle = {
        '--anim-state': animationState
    };

    return (
        <div onClick={onClick} style={containerStyle}>
            <svg width="100%" height="100%" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                <style>
                    {`
                    /* CSS Animations embedded directly in the SVG */
                    
                    /* Tuning Needle Scanning */
                    @keyframes scan {
                      0% { transform: translateX(-160px); }
                      50% { transform: translateX(140px); }
                      100% { transform: translateX(-160px); }
                    }
                    
                    /* Magic Eye Pulsing */
                    @keyframes magicEyePulse {
                      0% { transform: scale(0.8); opacity: 0.4; }
                      50% { transform: scale(1.1); opacity: 0.9; }
                      100% { transform: scale(0.8); opacity: 0.4; }
                    }
                    
                    /* Dial Light Flicker */
                    @keyframes flicker {
                      0% { opacity: 0.9; }
                      25% { opacity: 1; }
                      50% { opacity: 0.85; }
                      75% { opacity: 0.95; }
                      100% { opacity: 0.9; }
                    }

                    /* Speaker Vibration (Subtle Bass) */
                    @keyframes rumble {
                      0% { transform: scale(1); }
                      25% { transform: scale(1.002); }
                      50% { transform: scale(1); }
                      75% { transform: scale(1.002); }
                      100% { transform: scale(1); }
                    }

                    .needle {
                      animation: scan 8s ease-in-out infinite;
                      animation-play-state: ${needleState};
                    }

                    .magic-eye-glow {
                      animation: magicEyePulse 3s infinite ease-in-out;
                      transform-origin: center; 
                      animation-play-state: ${animationState};
                    }

                    .dial-light {
                      animation: flicker 0.2s infinite alternate;
                      animation-play-state: ${animationState};
                    }

                    .speaker-grille {
                      animation: rumble 0.1s infinite linear;
                      transform-origin: center;
                      animation-play-state: ${animationState};
                    }
                    `}
                </style>

                <defs>
                    {/* Wood Grain Gradient */}
                    <linearGradient id="woodGrain" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:"#1a1a1a", stopOpacity:1}} />
                    <stop offset="10%" style={{stopColor:"#333333", stopOpacity:1}} />
                    <stop offset="25%" style={{stopColor:"#111111", stopOpacity:1}} />
                    <stop offset="40%" style={{stopColor:"#2a2a2a", stopOpacity:1}} />
                    <stop offset="55%" style={{stopColor:"#0d0d0d", stopOpacity:1}} />
                    <stop offset="70%" style={{stopColor:"#333333", stopOpacity:1}} />
                    <stop offset="85%" style={{stopColor:"#1a1a1a", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#000000", stopOpacity:1}} />
                    </linearGradient>
                    
                    {/* Speaker Cloth Pattern */}
                    <pattern id="speakerCloth" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill="#444"/>
                    <line x1="0" y1="0" x2="8" y2="8" stroke="#555" strokeWidth="1"/>
                    <line x1="8" y1="0" x2="0" y2="8" stroke="#555" strokeWidth="1"/>
                    </pattern>
                    
                    {/* Bakelite Knob Gradient */}
                    <radialGradient id="bakeliteKnob" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style={{stopColor:"#666", stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:"#111", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#000", stopOpacity:1}} />
                    </radialGradient>

                    {/* Dial Glow */}
                    <linearGradient id="dialGlow" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" style={{stopColor:"#fff", stopOpacity:0.9}}/>
                        <stop offset="100%" style={{stopColor:"#ccc", stopOpacity:0.5}}/>
                    </linearGradient>

                    {/* Glass Reflection */}
                    <linearGradient id="glassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor:"#fff", stopOpacity:0.5}}/>
                        <stop offset="40%" style={{stopColor:"#fff", stopOpacity:0}}/>
                        <stop offset="60%" style={{stopColor:"#fff", stopOpacity:0}}/>
                        <stop offset="100%" style={{stopColor:"#fff", stopOpacity:0.3}}/>
                    </linearGradient>
                </defs>

                {/* Main Radio Cabinet Body */}
                <path d="M 120 450 L 140 480 L 200 480 L 180 450 Z" fill="#111"/>
                <path d="M 600 450 L 620 480 L 680 480 L 660 450 Z" fill="#111"/>

                <ellipse cx="400" cy="480" rx="300" ry="15" fill="#000" opacity="0.3"/>

                <rect x="100" y="50" width="600" height="400" rx="30" ry="30" fill="url(#woodGrain)" stroke="#000" strokeWidth="2"/>
                
                <rect x="120" y="70" width="560" height="360" rx="10" ry="10" fill="none" stroke="#555" strokeWidth="4"/>
                
                <path className="speaker-grille" d="M 150 180 L 650 180 L 630 400 L 170 400 Z" fill="url(#speakerCloth)" stroke="#222" strokeWidth="2"/>
                
                <g transform="translate(400, 290)">
                    <rect x="-10" y="-110" width="20" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="-60" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="-110" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="-160" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="50" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="100" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                    <rect x="150" y="-110" width="10" height="220" fill="url(#woodGrain)" stroke="#000"/>
                </g>

                <g transform="translate(200, 85)">
                    <rect x="0" y="0" width="400" height="80" rx="5" ry="5" fill="#222" stroke="#444" strokeWidth="3"/>
                    <rect className="dial-light" x="10" y="10" width="380" height="60" fill="url(#dialGlow)"/>
                    
                    <g stroke="#222" strokeWidth="1.5">
                        <line x1="30" y1="40" x2="30" y2="60"/>
                        <line x1="70" y1="45" x2="70" y2="60"/>
                        <line x1="110" y1="40" x2="110" y2="60"/>
                        <line x1="150" y1="45" x2="150" y2="60"/>
                        <line x1="190" y1="35" x2="190" y2="60"/>
                        <line x1="230" y1="45" x2="230" y2="60"/>
                        <line x1="270" y1="40" x2="270" y2="60"/>
                        <line x1="310" y1="45" x2="310" y2="60"/>
                        <line x1="350" y1="40" x2="350" y2="60"/>
                    </g>
                    <text x="30" y="30" fontFamily="Courier New, monospace" fontWeight="bold" fontSize="14" fill="#000" textAnchor="middle">55</text>
                    <text x="110" y="30" fontFamily="Courier New, monospace" fontWeight="bold" fontSize="14" fill="#000" textAnchor="middle">70</text>
                    <text x="190" y="25" fontFamily="Courier New, monospace" fontWeight="bold" fontSize="16" fill="#000" textAnchor="middle">100</text>
                    <text x="270" y="30" fontFamily="Courier New, monospace" fontWeight="bold" fontSize="14" fill="#000" textAnchor="middle">130</text>
                    <text x="350" y="30" fontFamily="Courier New, monospace" fontWeight="bold" fontSize="14" fill="#000" textAnchor="middle">160</text>
                    <text x="200" y="55" fontFamily="Serif" fontStyle="italic" fontSize="10" fill="#444" textAnchor="middle">KILOCYCLES</text>

                    <g className="needle">
                        <line x1="210" y1="10" x2="210" y2="70" stroke="#333" strokeWidth="3"/>
                        <line x1="210" y1="10" x2="210" y2="70" stroke="#000" strokeWidth="1"/>
                    </g>

                    <rect x="10" y="10" width="380" height="60" fill="url(#glassReflect)" pointerEvents="none"/>
                </g>

                <g transform="translate(160, 360)">
                    <circle cx="0" cy="0" r="35" fill="url(#bakeliteKnob)" stroke="#000" strokeWidth="1"/>
                    <line x1="0" y1="-35" x2="0" y2="-25" stroke="#333" strokeWidth="4"/>
                    <line x1="0" y1="35" x2="0" y2="25" stroke="#333" strokeWidth="4"/>
                    <line x1="-35" y1="0" x2="-25" y2="0" stroke="#333" strokeWidth="4"/>
                    <line x1="35" y1="0" x2="25" y2="0" stroke="#333" strokeWidth="4"/>
                    <circle cx="0" cy="0" r="15" fill="#222" stroke="#111"/>
                    <text x="0" y="55" fontFamily="Serif" fontSize="12" fill="#888" textAnchor="middle">VOLUME</text>
                </g>

                <g transform="translate(640, 360)">
                    <circle cx="0" cy="0" r="35" fill="url(#bakeliteKnob)" stroke="#000" strokeWidth="1"/>
                    <line x1="0" y1="-35" x2="0" y2="-25" stroke="#333" strokeWidth="4"/>
                    <line x1="0" y1="35" x2="0" y2="25" stroke="#333" strokeWidth="4"/>
                    <line x1="-35" y1="0" x2="-25" y2="0" stroke="#333" strokeWidth="4"/>
                    <line x1="35" y1="0" x2="25" y2="0" stroke="#333" strokeWidth="4"/>
                    <circle cx="0" cy="0" r="15" fill="#222" stroke="#111"/>
                    <text x="0" y="55" fontFamily="Serif" fontSize="12" fill="#888" textAnchor="middle">TUNING</text>
                </g>
                
                <g transform="translate(260, 420)">
                    <circle cx="0" cy="0" r="15" fill="url(#bakeliteKnob)" stroke="#000" strokeWidth="1"/>
                    <text x="0" y="30" fontFamily="Serif" fontSize="10" fill="#666" textAnchor="middle">TONE</text>
                </g>

                <g transform="translate(540, 420)">
                    <circle cx="0" cy="0" r="15" fill="url(#bakeliteKnob)" stroke="#000" strokeWidth="1"/>
                    <text x="0" y="30" fontFamily="Serif" fontSize="10" fill="#666" textAnchor="middle">BAND</text>
                </g>

                <g transform="translate(400, 140)">
                    <circle cx="0" cy="0" r="15" fill="#222" stroke="#444" strokeWidth="2"/>
                    <g className="magic-eye-glow">
                        <path d="M 0 0 L -10 -10 A 14 14 0 0 1 10 -10 Z" fill="#66ff66" opacity="0.6"/>
                    </g>
                    <text x="30" y="5" fontFamily="Serif" fontSize="10" fill="#444">MAGIC EYE</text>
                </g>

                <circle cx="120" cy="70" r="4" fill="#333" stroke="#111"/>
                <circle cx="680" cy="70" r="4" fill="#333" stroke="#111"/>
                <circle cx="120" cy="430" r="4" fill="#333" stroke="#111"/>
                <circle cx="680" cy="430" r="4" fill="#333" stroke="#111"/>
            </svg>
        </div>
    );
};

// ============================================================================
// VINYL AUDIO PLAYER - Custom styled player with spinning record & Waveform
// ============================================================================

const VinylAudioPlayer = ({ src, compact = false }) => {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [waveformPeaks, setWaveformPeaks] = React.useState([]);
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    
    const audioRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const canvasRef = React.useRef(null);

    // Generate waveform data
    React.useEffect(() => {
        if (!src) return;
        
        let isActive = true;
        setWaveformPeaks([]); // Clear previous waveform
        
        const generateWaveform = async () => {
            try {
                // For blob URLs or regular URLs, we can fetch
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                if (!isActive) return;
                
                const rawData = audioBuffer.getChannelData(0);
                const samples = 80; // Number of bars to display
                const blockSize = Math.floor(rawData.length / samples);
                const peaks = [];
                
                for (let i = 0; i < samples; i++) {
                    const start = i * blockSize;
                    let max = 0;
                    for (let j = 0; j < blockSize; j++) {
                        const val = Math.abs(rawData[start + j]);
                        if (val > max) max = val;
                    }
                    peaks.push(max);
                }
                
                setWaveformPeaks(peaks);
                
                // Cleanup context
                audioContext.close();
            } catch (err) {
                console.error("Error generating waveform:", err);
                // Fallback: Generate fake waveform if decoding fails
                if (isActive) {
                    setWaveformPeaks(Array(60).fill(0).map(() => Math.random() * 0.6 + 0.2));
                }
            }
        };

        generateWaveform();
        
        return () => { isActive = false; };
    }, [src]);

    // Draw Waveform
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || waveformPeaks.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const barWidth = width / waveformPeaks.length;
        const gap = 2; // Gap between bars
        
        waveformPeaks.forEach((peak, i) => {
            const x = i * barWidth;
            // Scale height but keep within bounds
            const barHeight = Math.max(4, peak * height); 
            const y = (height - barHeight) / 2;
            
            // Determine if this part of the waveform is "played"
            const playPercent = progress / 100;
            const isPlayed = (i / waveformPeaks.length) < playPercent;
            
            // Style
            ctx.fillStyle = isPlayed ? '#000000' : '#E5E5E5';
            
            // Draw bar
            ctx.fillRect(x, y, barWidth - gap, barHeight);
        });
        
    }, [waveformPeaks, progress]);

    // Smooth progress update using requestAnimationFrame
    const updateProgress = React.useCallback(() => {
        const audio = audioRef.current;
        if (audio && isPlaying && !isScrubbing) {
            const currentProgress = (audio.currentTime / audio.duration) * 100 || 0;
            setProgress(currentProgress);
            setCurrentTime(audio.currentTime);
            animationRef.current = requestAnimationFrame(updateProgress);
        }
    }, [isPlaying, isScrubbing]);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            if (isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        
        // Check if metadata is already loaded
        if (audio.readyState >= 1) {
            handleLoadedMetadata();
        }

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [src]);

    // Start/stop animation loop based on playing state
    React.useEffect(() => {
        if (isPlaying && !isScrubbing) {
            animationRef.current = requestAnimationFrame(updateProgress);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, isScrubbing, updateProgress]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    };

    // Scrubbing Logic
    const handleScrub = (clientX) => {
        const audio = audioRef.current;
        const canvas = canvasRef.current;
        // Use duration from state or directly from audio element as fallback
        const d = duration || audio?.duration;
        
        if (!audio || !canvas || !d || !isFinite(d)) return;

        const rect = canvas.getBoundingClientRect();
        // Calculate relative position clamped to canvas bounds
        const relX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, relX / rect.width));
        const newTime = percentage * d;
        
        audio.currentTime = newTime;
        setCurrentTime(newTime);
        setProgress(percentage * 100);
    };

    const startScrubbing = (e) => {
        setIsScrubbing(true);
        // Handle both mouse and touch events
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        handleScrub(clientX);
    };

    // Attach global listeners for dragging when scrubbing starts
    React.useEffect(() => {
        if (!isScrubbing) return;

        const onMouseMove = (e) => handleScrub(e.clientX);
        const onTouchMove = (e) => {
            if (e.touches && e.touches[0]) {
                handleScrub(e.touches[0].clientX);
            }
        };
        const onEnd = () => setIsScrubbing(false);

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onEnd);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onEnd);
        };
    }, [isScrubbing, duration]);

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Sizes
    const recordSize = compact ? 32 : 40;
    const buttonSize = compact ? 28 : 32;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? 10 : 12,
            padding: compact ? '8px 12px' : '12px 14px',
            background: 'var(--white)',
            border: '2px solid var(--black)',
            width: '100%'
        }}>
            {/* Hidden audio element */}
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button - Simple circle */}
            <button
                onClick={togglePlay}
                style={{
                    width: buttonSize,
                    height: buttonSize,
                    padding: 0,
                    background: 'transparent',
                    border: '2px solid var(--black)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isPlaying ? (
                    <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" fill="var(--black)"/>
                        <rect x="14" y="4" width="4" height="16" fill="var(--black)"/>
                    </svg>
                ) : (
                    <svg width={compact ? 10 : 12} height={compact ? 10 : 12} viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
                        <polygon points="5,3 19,12 5,21" fill="var(--black)"/>
                    </svg>
                )}
            </button>

            {/* Spinning Vinyl Record - Visual only */}
            <div style={{ flexShrink: 0 }}>
                <svg
                    viewBox="0 0 44 44"
                    width={recordSize}
                    height={recordSize}
                    style={{
                        animation: isPlaying ? 'vinylSpin 1.5s linear infinite' : 'none',
                        display: 'block'
                    }}
                >
                    <style>
                        {`@keyframes vinylSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
                    </style>
                    {/* Outer edge */}
                    <circle cx="22" cy="22" r="21" fill="#111" stroke="#000" strokeWidth="1"/>
                    {/* Grooves - concentric circles */}
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#282828" strokeWidth="0.8"/>
                    <circle cx="22" cy="22" r="15" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
                    <circle cx="22" cy="22" r="12" fill="none" stroke="#282828" strokeWidth="0.8"/>
                    <circle cx="22" cy="22" r="9" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
                    {/* Label area */}
                    <circle cx="22" cy="22" r="7" fill="#222"/>
                    <circle cx="22" cy="22" r="5.5" fill="#666" stroke="#777" strokeWidth="0.3"/>
                    {/* Center hole - grey */}
                    <circle cx="22" cy="22" r="2" fill="#999"/>
                    {/* Shine/reflection */}
                    <ellipse cx="15" cy="15" rx="5" ry="2" fill="rgba(255,255,255,0.08)" transform="rotate(-45 15 15)"/>
                </svg>
            </div>

            {/* Waveform Visualization */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
                <div 
                    style={{ 
                        width: '100%', 
                        height: compact ? 24 : 32, 
                        position: 'relative',
                        cursor: 'ew-resize', // Change cursor to indicate dragging
                        touchAction: 'none' // Prevent scrolling while scrubbing on touch
                    }} 
                    onMouseDown={startScrubbing}
                    onTouchStart={startScrubbing}
                >
                    {/* Canvas for Waveform */}
                    <canvas 
                        ref={canvasRef}
                        width={400} 
                        height={compact ? 48 : 64}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            pointerEvents: 'none' // Let events pass through to parent div
                        }}
                    />
                    
                    {/* Loading State */}
                    {waveformPeaks.length === 0 && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F5F5F5',
                            color: '#999',
                            fontSize: 9,
                            letterSpacing: '0.1em'
                        }}>
                            LOADING AUDIO...
                        </div>
                    )}
                </div>

                {/* Time display */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 9,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: 'var(--gray)',
                    letterSpacing: '0.02em',
                    marginTop: -2
                }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

// Export components
window.SvgIcon = SvgIcon;
window.NewspaperModal = NewspaperModal;
window.ConfirmDialog = ConfirmDialog;
window.AlertDialog = AlertDialog;
window.LevelUpModal = LevelUpModal;
window.ToastWithIcon = ToastWithIcon;
window.RadioWidget = RadioWidget;
window.VinylAudioPlayer = VinylAudioPlayer;
