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

// Export components
window.SvgIcon = SvgIcon;
window.NewspaperModal = NewspaperModal;
window.ConfirmDialog = ConfirmDialog;
window.AlertDialog = AlertDialog;
window.LevelUpModal = LevelUpModal;
window.ToastWithIcon = ToastWithIcon;
