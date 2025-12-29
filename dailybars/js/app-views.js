// ============================================================================
// DAILY BARS - VIEWS & MAIN APP
// Split from app.js for better code organization
// ============================================================================

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Import from main app.js exports
const {
    api, callAI, generateId, countWords, countBars, formatDate, formatTime,
    copyToClipboard, haptic, fetchRhymes, fetchNearRhymes,
    getDailyPrompt, getRandomPrompt, DAILY_DROP_PROMPTS,
    useVoiceRecorder, processImage, useSwipe,
    ToastProvider, useToast, Icon,
    DailyDropWidget, ImagePreview, BottomBar, Header,
    SocialExportModal, IdeaCard, RhymePopup, QuickInput,
    LOGO_SOLID, LOGO_HOLLOW
} = window.DailyBarsApp;

// ============================================================================
// FEED VIEW
// ============================================================================

const FeedView = ({ bars, onAddBar, onDeleteBar, onFavorite, onEditBar, loading, onTyping, onInputExpandChange, dailyPrompt, onAddToCrate, onSendToFreeGame }) => {
    const [previewImage, setPreviewImage] = useState(null);
    
    return (
        <div>
            <QuickInput onSave={onAddBar} onTyping={onTyping} onExpandChange={onInputExpandChange} initialPrompt={dailyPrompt} />
            
            {loading ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <div className="animate-pulse" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--gray)' }}>LOADING...</div>
                </div>
            ) : bars.length > 0 ? (
                bars.map((bar, i) => (
                    <IdeaCard 
                        key={bar.id}
                        bar={bar}
                        index={i}
                        onImageClick={setPreviewImage}
                        onTextEdit={onEditBar}
                        onFavorite={onFavorite}
                        onDelete={onDeleteBar}
                        onAddToCrate={onAddToCrate}
                        onSendToFreeGame={onSendToFreeGame}
                    />
                ))
            ) : (
                <div style={{ padding: 80, textAlign: 'center' }}>
                    <img src={LOGO_HOLLOW} alt="" style={{ width: 60, opacity: 0.15, marginBottom: 16 }} />
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--gray)' }}>NO BARS YET</div>
                </div>
            )}
            
            <ImagePreview src={previewImage} onClose={() => setPreviewImage(null)} />
        </div>
    );
};

// ============================================================================
// ARCHIVE VIEW
// ============================================================================

const ArchiveView = ({ bars, onSelect }) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
            padding: 2,
            background: 'var(--black)'
        }}>
            {bars.map(bar => (
                <button key={bar.id} onClick={() => onSelect(bar)} style={{
                    aspectRatio: '1',
                    background: 'var(--white)',
                    border: 'none',
                    overflow: 'hidden',
                    position: 'relative',
                    textAlign: 'left'
                }}>
                    {bar.imageUrl ? (
                        <img src={bar.imageUrl} alt="" className="card-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p className="font-mono" style={{
                                fontSize: 10, lineHeight: 1.4, overflow: 'hidden', color: 'var(--black)',
                                display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical'
                            }}>{bar.text}</p>
                            <span style={{ fontSize: 8, color: 'var(--gray)' }}>{formatDate(bar.created_at)}</span>
                        </div>
                    )}
                    {bar.isFavorite && (
                        <div style={{
                            position: 'absolute', top: 6, right: 6,
                            background: 'var(--electric)', width: 18, height: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><Icon name="Star" size={10} /></div>
                    )}
                </button>
            ))}
            {bars.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: 80, textAlign: 'center', background: 'var(--white)' }}>
                    <span style={{ fontSize: 11, color: 'var(--gray)' }}>NO ARCHIVE YET</span>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// CRATES VIEW - NEWSPAPER STACK
// ============================================================================

const CratesView = ({ songs, onCreateSong, onEditSong }) => {
    return (
        <div style={{
            background: 'var(--paper)',
            minHeight: '100%',
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowX: 'hidden'
        }}>
            <div className="font-serif" style={{
                padding: '40px 0 20px',
                fontSize: 28,
                fontWeight: 700,
                textAlign: 'center',
                width: '100%',
                borderBottom: '1px solid var(--light-gray)',
                marginBottom: 40,
                background: 'var(--paper)',
                zIndex: 20
            }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            <button 
                onClick={onCreateSong}
                className="animate-slide-in"
                style={{
                    width: '90%',
                    maxWidth: 400,
                    padding: '16px',
                    background: 'var(--black)',
                    color: 'var(--electric)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    marginBottom: 40,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                    zIndex: 15
                }}
            >
                <div style={{
                    border: '1px solid var(--electric)',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon name="Plus" size={14} />
                </div>
                <span className="font-display" style={{ 
                    fontSize: 12, 
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase' 
                }}>
                    START NEW EDITION
                </span>
            </button>

            <div style={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                paddingTop: 20
            }}>
                {songs.length === 0 ? (
                    <div style={{ padding: '60px 0', textAlign: 'center', opacity: 0.5 }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>🗞️</div>
                        <div className="font-mono" style={{ fontSize: 12 }}>NO NEWS IS GOOD NEWS</div>
                        <div className="font-mono" style={{ fontSize: 10, marginTop: 4 }}>START A TRACK ABOVE</div>
                    </div>
                ) : (
                    songs.map((song, i) => {
                        const firstText = song.blocks?.find(b => b.type === 'text')?.content || '';
                        const snippet = firstText.slice(0, 100) + (firstText.length > 100 ? '...' : '');
                        const hasImage = !!song.coverImage;
                        const spriteIndex = i % 6;
                        const bgX = (spriteIndex % 3) * 50;
                        const bgY = Math.floor(spriteIndex / 3) * 100;
                        
                        const column = spriteIndex % 3;
                        const paddingConfig = {
                            0: { top: 55, right: 35, bottom: 40, left: 45 },
                            1: { top: 55, right: 40, bottom: 40, left: 40 },
                            2: { top: 55, right: 50, bottom: 40, left: 30 }
                        }[column];

                        return (
                            <article 
                                key={song.id} 
                                onClick={() => onEditSong(song)}
                                className="animate-slide-up"
                                style={{
                                    width: '94%',
                                    maxWidth: 420,
                                    background: 'none',
                                    backgroundImage: 'url(images/newspaper-sprites.png)',
                                    backgroundSize: '300% 200%',
                                    backgroundPosition: `${bgX}% ${bgY}%`,
                                    padding: `${paddingConfig.top}px ${paddingConfig.right}px ${paddingConfig.bottom}px ${paddingConfig.left}px`,
                                    marginBottom: 16,
                                    marginTop: i === 0 ? 0 : -140,
                                    zIndex: i,
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                                    minHeight: 320,
                                    position: 'relative',
                                    transition: 'transform 0.2s ease',
                                    transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)`,
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{
                                    borderBottom: '2px solid var(--black)',
                                    marginBottom: 12,
                                    paddingBottom: 8,
                                    textAlign: 'left'
                                }}>
                                    <h2 className="font-serif" style={{
                                        fontSize: 28,
                                        fontWeight: 900,
                                        lineHeight: 1,
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '-0.02em',
                                        color: 'var(--black)'
                                    }}>
                                        {song.title || 'THE UNTITLED'}
                                    </h2>
                                    <div className="font-mono" style={{
                                        fontSize: 8,
                                        color: 'var(--gray)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderTop: '1px solid var(--black)',
                                        paddingTop: 4,
                                        marginTop: 4
                                    }}>
                                        <span>VOL. {songs.length - i}</span>
                                        <span>{formatDate(song.updated_at)}</span>
                                        <span>{song.status === 'complete' ? 'FINAL' : 'DRAFT'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, textAlign: 'left' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="font-display" style={{
                                            fontSize: 14,
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            marginBottom: 8,
                                            lineHeight: 1.1,
                                            textAlign: 'left'
                                        }}>
                                            {snippet ? "LATEST DEVELOPMENTS IN THE LAB" : "BREAKING NEWS"}
                                        </div>
                                        
                                        <div style={{
                                            fontFamily: "'Times New Roman', Georgia, serif",
                                            fontSize: 11,
                                            lineHeight: 1.4,
                                            color: '#333',
                                            textAlign: 'left',
                                            wordBreak: 'break-word'
                                        }}>
                                            {snippet || "No content available for this edition. Tap to write..."}
                                        </div>
                                    </div>

                                    {hasImage && (
                                        <div style={{ width: '35%', flexShrink: 0 }}>
                                            <img 
                                                src={song.coverImage} 
                                                alt="" 
                                                style={{ 
                                                    width: '100%', 
                                                    height: 100,
                                                    objectFit: 'cover',
                                                    filter: 'grayscale(100%) contrast(1.1)',
                                                    border: '1px solid #ddd'
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// ============================================================================
// FAVORITES VIEW
// ============================================================================

const FavoritesView = ({ bars, onSelect }) => {
    const favorites = useMemo(() => bars.filter(b => b.isFavorite), [bars]);
    
    return (
        <div>
            {favorites.length > 0 ? (
                favorites.map(bar => (
                    <button key={bar.id} onClick={() => onSelect(bar)} style={{
                        width: '100%', padding: 16, borderBottom: '1px solid var(--light-gray)',
                        textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--white)'
                    }}>
                        <div style={{ width: 24, height: 24, background: 'var(--electric)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="Star" size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 9, color: 'var(--gray)', marginBottom: 4 }}>{formatDate(bar.created_at)}</div>
                            <p className="font-serif" style={{
                                fontSize: 15, lineHeight: 1.4, overflow: 'hidden', color: 'var(--black)',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                            }}>{bar.text}</p>
                        </div>
                    </button>
                ))
            ) : (
                <div style={{ padding: 80, textAlign: 'center' }}>
                    <Icon name="Star" size={32} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <div style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--gray)' }}>NO FAVORITES YET</div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// SYNDICATE VIEW (COMMUNITY)
// ============================================================================

const SyndicateViewOld = ({ user, onTyping }) => {
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submissionText, setSubmissionText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const toast = useToast();

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = async () => {
        setLoading(true);
        const data = await window.DailyDepositEngine.getSyndicateFeed();
        setPrompts(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!submissionText.trim()) return;
        setIsSubmitting(true);
        try {
            await window.DailyDepositEngine.submitToSyndicate(submissionText, user.username);
            setSubmissionText('');
            setShowForm(false);
            toast?.addToast('SENT TO THE VAULT 💎', 'success');
            loadFeed(); // Reload to see it
        } catch (e) {
            toast?.addToast('SUBMISSION FAILED', 'error');
        }
        setIsSubmitting(false);
    };

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Header / Submission Trigger */}
            <div style={{ padding: 16, background: 'var(--white)', borderBottom: '2px solid var(--black)' }}>
                {!showForm ? (
                    <button 
                        onClick={() => setShowForm(true)}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--black)',
                            color: 'var(--electric)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.1em'
                        }}
                    >
                        <Icon name="Plus" size={16} /> CONTRIBUTE TO THE VAULT
                    </button>
                ) : (
                    <div className="animate-slide-up">
                        <textarea
                            value={submissionText}
                            onChange={(e) => {
                                setSubmissionText(e.target.value);
                                onTyping?.();
                            }}
                            placeholder="Type your niche prompt here... (e.g. 'Write a breakup text from a burner phone')"
                            style={{
                                width: '100%',
                                minHeight: 80,
                                padding: 12,
                                border: '2px solid var(--black)',
                                fontFamily: 'monospace',
                                fontSize: 13,
                                marginBottom: 8,
                                background: 'var(--white)'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                onClick={() => setShowForm(false)}
                                style={{ flex: 1, padding: 12, border: '1px solid var(--black)', fontSize: 10, fontWeight: 700 }}
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{ 
                                    flex: 1, 
                                    padding: 12, 
                                    background: 'var(--black)', 
                                    color: 'var(--white)', 
                                    fontSize: 10, 
                                    fontWeight: 700,
                                    opacity: isSubmitting ? 0.7 : 1
                                }}
                            >
                                {isSubmitting ? 'UPLOADING...' : 'DROP IT'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* The Feed */}
            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}>
                    LOADING THE SYNDICATE...
                </div>
            ) : prompts.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', opacity: 0.5 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🕸️</div>
                    <div style={{ fontSize: 11, letterSpacing: '0.1em' }}>THE VAULT IS EMPTY</div>
                    <div style={{ fontSize: 9, marginTop: 4 }}>BE THE FIRST TO DROP A GEM</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 2, padding: 2, background: 'var(--black)' }}>
                    {prompts.map((p, i) => (
                        <div key={p.id || i} className="animate-slide-up" style={{
                            background: 'var(--white)',
                            padding: 16
                        }}>
                            <div style={{ 
                                fontFamily: "'Space Mono', monospace", 
                                fontSize: 14, 
                                lineHeight: 1.5,
                                marginBottom: 12
                            }}>
                                {p.prompt_text}
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                fontSize: 9, 
                                color: 'var(--gray)',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase'
                            }}>
                                <span>FROM: @{p.author}</span>
                                <span>💎 {p.likes || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// BAR DETAIL
// ============================================================================

const BarDetail = ({ bar, onClose, onDelete, onFavorite, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(bar?.text || '');
    const toast = useToast();
    
    if (!bar) return null;
    
    const handleSave = () => {
        onEdit(bar.id, editText);
        setIsEditing(false);
        toast?.addToast('SAVED', 'success');
    };
    
    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, background: 'var(--paper)', zIndex: 100,
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 16, 
                borderBottom: '2px solid var(--black)',
                background: 'var(--paper)'
            }}>
                <button onClick={onClose} style={{ 
                    zIndex: 11, 
                    padding: 8,
                    minWidth: 44,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon name="ArrowLeft" size={24} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>VIEW</span>
                <button onClick={() => onFavorite(bar.id, !bar.isFavorite)} style={{
                    zIndex: 11,
                    padding: 8,
                    minWidth: 44,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon name="Star" size={24} />
                </button>
            </div>
            
            <div className="scrollable" style={{ 
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch'
            }}>
                {bar.imageUrl && (
                    <img src={bar.imageUrl} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                )}
                
                <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 16 }}>
                        {formatDate(bar.created_at)} — {formatTime(bar.created_at)}
                    </div>
                    
                    {isEditing ? (
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="font-serif"
                            autoFocus
                            style={{
                                width: '100%', minHeight: 200, fontSize: 20, lineHeight: 1.6,
                                resize: 'none', background: 'var(--electric)', padding: 12
                            }}
                        />
                    ) : (
                        <div 
                            onClick={() => setIsEditing(true)}
                            className="font-serif inline-edit"
                            style={{ fontSize: 20, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: 8, margin: -8 }}
                        >
                            {bar.text}
                        </div>
                    )}
                    
                    {bar.audioUrl && (
                        <div style={{
                            marginTop: 20,
                            padding: 16,
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '2px solid var(--black)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon name="Mic" size={20} color="#EF4444" />
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>🎙️ VOICE MEMO</span>
                            </div>
                            <audio src={bar.audioUrl} controls style={{ width: '100%', height: 40 }} />
                        </div>
                    )}
                    
                    {bar.tags?.length > 0 && (
                        <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {bar.tags.map((tag, i) => (
                                <span key={i} style={{
                                    border: '1px solid var(--black)', padding: '4px 10px',
                                    fontSize: 10, textTransform: 'uppercase'
                                }}>#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{ 
                borderTop: '2px solid var(--black)', 
                padding: '16px 16px max(16px, env(safe-area-inset-bottom))', 
                display: 'flex', 
                gap: 12,
                background: 'var(--paper)',
                zIndex: 10
            }}>
                {isEditing ? (
                    <>
                        <button onClick={() => { setIsEditing(false); setEditText(bar.text); }} style={{
                            flex: 1, 
                            padding: 14, 
                            minHeight: 48,
                            border: '2px solid var(--black)',
                            fontSize: 11, 
                            fontWeight: 700, 
                            letterSpacing: '0.1em'
                        }}>CANCEL</button>
                        <button onClick={handleSave} style={{
                            flex: 1, 
                            padding: 14,
                            minHeight: 48,
                            background: 'var(--electric)',
                            fontSize: 11, 
                            fontWeight: 700, 
                            letterSpacing: '0.1em'
                        }}>SAVE</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { copyToClipboard(bar.text); toast?.addToast('COPIED', 'success'); }} style={{
                            flex: 1, 
                            padding: 14,
                            minHeight: 48,
                            border: '2px solid var(--black)',
                            fontSize: 11, 
                            fontWeight: 700, 
                            letterSpacing: '0.1em', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: 8
                        }}><Icon name="Copy" size={16} /> COPY</button>
                        <button onClick={() => { onDelete(bar.id); onClose(); }} style={{
                            padding: 14,
                            minWidth: 48,
                            minHeight: 48,
                            border: '2px solid var(--black)', 
                            color: 'var(--gray)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}><Icon name="Trash2" size={16} /></button>
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// TRACK EDITOR
// ============================================================================

const TrackEditor = ({ song, onClose, onSave }) => {
    const [title, setTitle] = useState(song?.title || 'UNTITLED');
    const [blocks, setBlocks] = useState(song?.blocks || []);
    const [status, setStatus] = useState(song?.status || 'draft');
    const [coverImage, setCoverImage] = useState(song?.coverImage || null);
    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    
    const [beatUrl, setBeatUrl] = useState(song?.beatUrl || '');
    const [beatPlaying, setBeatPlaying] = useState(false);
    const [showBeatLocker, setShowBeatLocker] = useState(false);
    const [beatUrlInput, setBeatUrlInput] = useState('');
    const beatAudioRef = useRef(null);
    
    const toast = useToast();
    
    const addBlock = (type) => { setBlocks([...blocks, { id: generateId(), type, content: '' }]); haptic('medium'); };
    const updateBlock = (idx, content) => { const newBlocks = [...blocks]; newBlocks[idx].content = content; setBlocks(newBlocks); };
    const deleteBlock = (idx) => { setBlocks(blocks.filter((_, i) => i !== idx)); };
    
    const handleAI = async (mode) => {
        setAiLoading(true);
        const context = blocks.filter(b => b.type === 'text').map(b => b.content).join('\n');
        
        const prompts = {
            freestyle: `Write 4-8 bars of lyrics about success and Oakland. Context:\n${context}`,
            next: `Write the next 4 bars continuing from this:\n${context}`,
            hook: `Write a catchy hook for this song. Context:\n${context}`,
            bridge: `Write a bridge section for this song. Context:\n${context}`
        };
        
        const result = await callAI(prompts[mode]);
        
        if (result) {
            setBlocks(prev => [...prev, { id: generateId(), type: 'text', content: result }]);
            toast?.addToast('GENERATED', 'success');
        }
        setAiLoading(false);
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                setCoverImage(base64);
                haptic('success');
            } catch { toast?.addToast('IMAGE FAILED', 'error'); }
        }
    };

    const handleBlockImageUpload = async (idx, e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                updateBlock(idx, base64);
                haptic('success');
            } catch { toast?.addToast('IMAGE FAILED', 'error'); }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ ...song, title, blocks, status, coverImage, beatUrl });
            toast?.addToast('SAVED', 'success');
        } catch { toast?.addToast('SAVE FAILED', 'error'); }
        setSaving(false);
    };
    
    const handleBeatUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('audio/')) {
            const url = URL.createObjectURL(file);
            setBeatUrl(url);
            setShowBeatLocker(false);
            haptic('success');
            toast?.addToast('BEAT LOADED!', 'success');
        } else {
            toast?.addToast('AUDIO FILES ONLY', 'error');
        }
    };
    
    const handleBeatUrlSet = () => {
        if (beatUrlInput.trim()) {
            setBeatUrl(beatUrlInput.trim());
            setBeatUrlInput('');
            setShowBeatLocker(false);
            haptic('success');
            toast?.addToast('BEAT LINKED!', 'success');
        }
    };
    
    const toggleBeat = () => {
        if (beatAudioRef.current) {
            if (beatPlaying) {
                beatAudioRef.current.pause();
            } else {
                beatAudioRef.current.play();
            }
            setBeatPlaying(!beatPlaying);
            haptic('light');
        }
    };
    
    const clearBeat = () => {
        setBeatUrl('');
        setBeatPlaying(false);
        haptic('light');
    };
    
    useEffect(() => {
        if (beatAudioRef.current) {
            beatAudioRef.current.loop = true;
        }
    }, [beatUrl]);
    
    return (
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            {beatUrl && (
                <audio ref={beatAudioRef} src={beatUrl} loop onEnded={() => setBeatPlaying(false)} />
            )}
            
            <button onClick={onClose} style={{
                position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 16, zIndex: 102,
                width: 40, height: 40, background: 'var(--white)', border: '2px solid var(--black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}><Icon name="ArrowLeft" size={20} /></button>
            
            <button onClick={handleSave} disabled={saving} style={{
                position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', right: 16, zIndex: 102,
                padding: '10px 16px', background: 'var(--brand-green)', color: 'var(--white)',
                border: '2px solid var(--black)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: saving ? 0.7 : 1
            }}>{saving ? 'SAVING...' : 'SAVE'}</button>
            
            {showBeatLocker && (
                <div 
                    className="animate-fade-in"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                >
                    <div 
                        className="animate-scale-in"
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            background: 'var(--white)',
                            border: '3px solid var(--black)',
                            boxShadow: '8px 8px 0 var(--black)'
                        }}
                    >
                        <div style={{
                            background: '#7C3AED',
                            color: 'var(--white)',
                            padding: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon name="Headphones" size={24} />
                                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em' }}>🎧 BEAT LOCKER</span>
                            </div>
                            <button onClick={() => setShowBeatLocker(false)}>
                                <Icon name="X" size={20} color="white" />
                            </button>
                        </div>
                        
                        <div style={{ padding: 20 }}>
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 30,
                                border: '2px dashed var(--gray)',
                                cursor: 'pointer',
                                gap: 10,
                                marginBottom: 16
                            }}>
                                <Icon name="Upload" size={32} style={{ opacity: 0.5 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>UPLOAD MP3</span>
                                <span style={{ fontSize: 10, color: 'var(--gray)' }}>Local file, loops forever</span>
                                <input type="file" accept="audio/*" onChange={handleBeatUpload} style={{ display: 'none' }} />
                            </label>
                            
                            <div style={{ textAlign: 'center', marginBottom: 16, color: 'var(--gray)', fontSize: 10 }}>— OR PASTE LINK —</div>
                            
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input 
                                    value={beatUrlInput}
                                    onChange={(e) => setBeatUrlInput(e.target.value)}
                                    placeholder="https://... (MP3 URL)"
                                    style={{
                                        flex: 1,
                                        padding: 12,
                                        border: '2px solid var(--black)',
                                        fontSize: 11
                                    }}
                                />
                                <button 
                                    onClick={handleBeatUrlSet}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'var(--black)',
                                        color: 'var(--white)',
                                        fontWeight: 700,
                                        fontSize: 10
                                    }}
                                >SET</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ borderBottom: '2px solid var(--black)', backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', paddingTop: 'max(60px, calc(env(safe-area-inset-top) + 50px))' }}>
                <div style={{ padding: '0 16px 12px', background: 'rgba(255,255,255,0.5)' }}>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="TRACK TITLE"
                        className="font-display" style={{ width: '100%', fontSize: 22, fontWeight: 900, textTransform: 'uppercase' }} />
                </div>
                
                <div style={{ display: 'flex', borderTop: '1px solid var(--light-gray)', background: 'rgba(255,255,255,0.8)' }}>
                    {['draft', 'in-progress', 'complete'].map(s => (
                        <button key={s} onClick={() => setStatus(s)} style={{
                            flex: 1, padding: '10px 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            background: status === s ? 'var(--brand-green)' : 'transparent', color: status === s ? 'var(--white)' : 'var(--black)',
                            borderRight: '1px solid var(--light-gray)'
                        }}>{s.replace('-', ' ')}</button>
                    ))}
                </div>
                
                <div style={{ 
                    background: beatPlaying ? '#7C3AED' : '#1F2937',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'background 0.3s ease'
                }}>
                    {beatUrl ? (
                        <>
                            <button 
                                onClick={toggleBeat}
                                className={beatPlaying ? 'animate-pulse' : ''}
                                style={{
                                    width: 36, height: 36,
                                    background: beatPlaying ? 'var(--white)' : '#7C3AED',
                                    color: beatPlaying ? '#7C3AED' : 'var(--white)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Icon name={beatPlaying ? 'Pause' : 'Play'} size={18} />
                            </button>
                            <div style={{ flex: 1, color: 'var(--white)' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                                    {beatPlaying ? '🔊 BEAT PLAYING' : '🎧 BEAT LOADED'}
                                </div>
                                <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>
                                    {beatPlaying ? 'LOOPING • TAP TO PAUSE' : 'TAP PLAY TO VIBE'}
                                </div>
                            </div>
                            <button onClick={clearBeat} style={{ color: 'rgba(255,255,255,0.5)', padding: 8 }}>
                                <Icon name="X" size={16} />
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setShowBeatLocker(true)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                padding: 8,
                                color: 'var(--white)'
                            }}
                        >
                            <Icon name="Headphones" size={18} />
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                                🎧 LOAD BEAT TO LOOP
                            </span>
                        </button>
                    )}
                </div>
            </header>
            
            <div className="scrollable" style={{ flex: 1, paddingBottom: 40 }}>
                <div style={{ padding: 16, borderBottom: '1px solid var(--black)' }}>
                    {coverImage ? (
                        <div style={{ position: 'relative' }}>
                            <img src={coverImage} alt="Cover" style={{ width: '100%', height: 200, objectFit: 'cover', border: '1px solid var(--black)', filter: 'grayscale(100%)' }} />
                            <button onClick={() => setCoverImage(null)} style={{
                                position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                                background: 'var(--black)', color: 'var(--white)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}><Icon name="X" size={14} /></button>
                            <div className="font-mono" style={{ fontSize: 9, marginTop: 4, color: 'var(--gray)', fontStyle: 'italic' }}>FIG 1. FRONT PAGE ART</div>
                        </div>
                    ) : (
                        <label style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            height: 100, border: '1px dashed var(--gray)', background: 'var(--white)',
                            cursor: 'pointer', gap: 8
                        }}>
                            <Icon name="Image" size={24} style={{ opacity: 0.3 }} />
                            <span style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--gray)' }}>ADD COVER ART</span>
                            <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
                        </label>
                    )}
                </div>

                <div style={{ padding: '10px 16px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--black)', background: 'rgba(255,255,255,0.6)' }}>
                    {[
                        { id: 'next', label: '✦ NEXT BARS', highlight: true },
                        { id: 'hook', label: 'HOOK' },
                        { id: 'bridge', label: 'BRIDGE' },
                        { id: 'freestyle', label: 'FREESTYLE' }
                    ].map(item => (
                        <button key={item.id} onClick={() => handleAI(item.id)} disabled={aiLoading} style={{
                            padding: '6px 10px', border: '1px solid var(--black)',
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap',
                            background: item.highlight ? 'var(--electric)' : 'var(--white)',
                            opacity: aiLoading ? 0.5 : 1
                        }}>{aiLoading ? '...' : item.label}</button>
                    ))}
                </div>

                {blocks.map((block, i) => (
                    <div key={block.id} style={{ borderBottom: '1px solid var(--light-gray)', position: 'relative' }}>
                        <button onClick={() => deleteBlock(i)} style={{
                            position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                            background: 'var(--white)', border: '1px solid var(--black)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                        }}><Icon name="X" size={12} /></button>
                        
                        {block.type === 'text' ? (
                            <textarea value={block.content} onChange={(e) => { updateBlock(i, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                placeholder="WRITE YOUR VERSE..." className="font-mono"
                                style={{ width: '100%', minHeight: 100, padding: 16, fontSize: 14, lineHeight: 1.6, resize: 'none', background: 'var(--white)' }} />
                        ) : block.type === 'heading' ? (
                            <input value={block.content} onChange={(e) => updateBlock(i, e.target.value)} placeholder="SECTION TITLE"
                                className="font-display" style={{ width: '100%', padding: 16, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', background: 'var(--white)' }} />
                        ) : block.type === 'image' ? (
                            <div style={{ padding: 16, background: 'var(--white)' }}>
                                {block.content ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={block.content} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', filter: 'grayscale(100%)' }} />
                                        <button onClick={() => updateBlock(i, '')} style={{
                                            position: 'absolute', top: 8, right: 8, background: 'var(--black)', color: 'var(--white)', padding: 4
                                        }}>CHANGE</button>
                                    </div>
                                ) : (
                                    <label style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        height: 80, border: '1px dashed var(--gray)',
                                        cursor: 'pointer', gap: 8
                                    }}>
                                        <Icon name="Image" size={16} /> ADD IMAGE BLOCK
                                        <input type="file" accept="image/*" onChange={(e) => handleBlockImageUpload(i, e)} style={{ display: 'none' }} />
                                    </label>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '24px 16px', borderTop: '2px dashed var(--black)', borderBottom: '2px dashed var(--black)', textAlign: 'center', fontSize: 10, color: 'var(--gray)', background: 'var(--white)' }}>— BREAK —</div>
                        )}
                    </div>
                ))}
                {blocks.length === 0 && !coverImage && (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--gray)' }}>ADD BLOCKS TO START</span>
                    </div>
                )}
            </div>
            
            <div style={{
                position: 'sticky', bottom: 0, left: 0, right: 0,
                display: 'flex', gap: 4, background: 'var(--brand-green)', padding: 8,
                borderTop: '2px solid var(--black)',
                paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                justifyContent: 'center'
            }}>
                {[
                    { type: 'text', icon: 'FileText', label: 'VERSE' }, 
                    { type: 'heading', icon: 'Type', label: 'TITLE' }, 
                    { type: 'image', icon: 'Image', label: 'IMG' },
                    { type: 'divider', icon: 'Minus', label: 'BREAK' }
                ].map(item => (
                    <button key={item.type} onClick={() => addBlock(item.type)} style={{
                        padding: '12px 14px', background: 'var(--white)',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em'
                    }}><Icon name={item.icon} size={14} />{item.label}</button>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(16) + '_' + str.length;
};

const checkPasswordStrength = (password) => {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 8) score++;
    else feedback.push('8+ characters');
    
    if (password.length >= 12) score++;
    
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('uppercase letter');
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push('lowercase letter');
    
    if (/[0-9]/.test(password)) score++;
    else feedback.push('number');
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('special character');
    
    let strength = 'weak';
    let color = '#EF4444';
    
    if (score >= 5) { strength = 'strong'; color = '#166534'; }
    else if (score >= 3) { strength = 'medium'; color = '#EAB308'; }
    
    return { score, strength, color, feedback, maxScore: 6 };
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============================================================================
// LOGIN COMPONENTS
// ============================================================================

const PasswordStrengthBar = ({ password, passwordStrength }) => (
    <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {[...Array(6)].map((_, i) => (
                <div 
                    key={i}
                    style={{
                        flex: 1, height: 4,
                        background: i < passwordStrength.score ? passwordStrength.color : '#E5E5E5',
                        transition: 'all 0.2s ease'
                    }}
                />
            ))}
        </div>
        <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 9, letterSpacing: '0.1em'
        }}>
            <span style={{ color: passwordStrength.color, fontWeight: 700 }}>
                {password.length > 0 ? passwordStrength.strength.toUpperCase() : ''}
            </span>
            {passwordStrength.feedback.length > 0 && password.length > 0 && (
                <span style={{ color: 'var(--gray)' }}>
                    NEED: {passwordStrength.feedback.slice(0, 2).join(', ')}
                </span>
            )}
        </div>
    </div>
);

const LoginInputField = ({ label, type, value, onChange, placeholder, error, showToggle, onToggle, showValue, hint }) => (
    <div>
        <label style={{ 
            display: 'block', fontSize: 10, fontWeight: 700, 
            letterSpacing: '0.2em', marginBottom: 8, textAlign: 'left',
            color: error ? '#EF4444' : 'var(--black)'
        }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <input 
                type={showToggle ? (showValue ? 'text' : 'password') : type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="font-mono"
                required
                style={{
                    width: '100%', padding: '12px 0', 
                    paddingRight: showToggle ? 40 : 0,
                    background: 'transparent', 
                    borderBottom: `2px solid ${error ? '#EF4444' : 'var(--black)'}`,
                    fontSize: 16,
                    textTransform: type === 'text' && label === 'ARTIST NAME' ? 'uppercase' : 'none'
                }}
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        padding: 8, color: 'var(--gray)'
                    }}
                >
                    <Icon name={showValue ? 'EyeOff' : 'Eye'} size={18} />
                </button>
            )}
        </div>
        {error && (
            <div style={{ 
                fontSize: 9, color: '#EF4444', marginTop: 4, 
                letterSpacing: '0.1em', textAlign: 'left' 
            }}>
                {error}
            </div>
        )}
        {hint && !error && (
            <div style={{ 
                fontSize: 9, color: 'var(--gray)', marginTop: 4, 
                letterSpacing: '0.05em', textAlign: 'left', fontStyle: 'italic' 
            }}>
                {hint}
            </div>
        )}
    </div>
);

// ============================================================================
// LOGIN SCREEN
// ============================================================================

const LoginScreen = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be email OR username
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const toast = useToast();

    const passwordStrength = checkPasswordStrength(password);
    
    useEffect(() => {
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setFieldErrors({});
        setStep(1);
        setAgreedToTerms(false);
    }, [isSignUp]);

    useEffect(() => {
        const remembered = localStorage.getItem('dailybars_remembered_login');
        if (remembered) {
            setLoginIdentifier(remembered);
            setRememberMe(true);
        }
    }, []);

    const validateFields = () => {
        const errors = {};
        
        // For sign up, require valid email
        if (isSignUp && !isValidEmail(email)) {
            errors.email = 'VALID EMAIL REQUIRED';
        }
        
        // For sign in, allow either email or username
        if (!isSignUp && !loginIdentifier.trim()) {
            errors.loginIdentifier = 'EMAIL OR USERNAME REQUIRED';
        }
        
        if (isSignUp) {
            if (step === 2) {
                if (username.length < 3) {
                    errors.username = 'MIN 3 CHARACTERS';
                }
                if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                    errors.username = 'LETTERS, NUMBERS, UNDERSCORE ONLY';
                }
                if (password.length < 8) {
                    errors.password = 'MIN 8 CHARACTERS';
                }
                if (passwordStrength.strength === 'weak') {
                    errors.password = 'PASSWORD TOO WEAK';
                }
                if (password !== confirmPassword) {
                    errors.confirmPassword = 'PASSWORDS DON\'T MATCH';
                }
                if (!agreedToTerms) {
                    errors.terms = 'MUST ACCEPT TERMS';
                }
            }
        } else {
            if (password.length < 1) {
                errors.password = 'PASSWORD REQUIRED';
            }
        }
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateFields()) {
            haptic('heavy');
            return;
        }
        
        if (isSignUp && step === 1) {
            setStep(2);
            return;
        }
        
        setLoading(true);
        setError('');

        try {
            const usersRes = await api.get('users', { limit: 1000 });
            const users = usersRes.data || [];
            
            // Check for admin login (support email, username, or guapdad@gmail.com)
            const loginInput = loginIdentifier.toLowerCase().trim();
            const isAdminLogin = !isSignUp && (
                loginInput === 'guap@dailybars.com' || 
                loginInput === 'guap' || 
                loginInput === 'guapdad@gmail.com'
            ) && password === 'admin123';
            
            if (isAdminLogin) {
                // Look for existing guap user or guapdad@gmail.com user
                const adminUser = users.find(u => 
                    u.username?.toLowerCase() === 'guap' || 
                    u.email?.toLowerCase() === 'guapdad@gmail.com'
                );
                
                if (!adminUser) {
                    // Create admin user with guapdad@gmail.com as primary email
                    await api.create('users', { 
                        username: 'guap', 
                        email: 'guapdad@gmail.com',
                        password: simpleHash('admin123'),
                        last_login: new Date().toISOString(),
                        is_verified: true
                    });
                } else {
                    // Update existing admin user
                    await api.update('users', adminUser.id, { 
                        last_login: new Date().toISOString()
                    });
                }
                
                if (rememberMe) {
                    localStorage.setItem('dailybars_remembered_login', loginIdentifier);
                } else {
                    localStorage.removeItem('dailybars_remembered_login');
                }
                
                haptic('success');
                onLogin({ username: 'guap', email: 'guapdad@gmail.com' });
                return;
            }

            // Find user by email OR username for login
            const existingUser = isSignUp 
                ? users.find(u => u.email?.toLowerCase() === email.toLowerCase())
                : users.find(u => 
                    u.email?.toLowerCase() === loginInput || 
                    u.username?.toLowerCase() === loginInput
                  );
            const existingUsername = users.find(u => u.username?.toLowerCase() === username.toLowerCase());

            if (isSignUp) {
                if (existingUser) {
                    setError('EMAIL ALREADY REGISTERED');
                    setStep(1);
                    haptic('heavy');
                } else if (existingUsername) {
                    setError('USERNAME TAKEN');
                    haptic('heavy');
                } else {
                    const newUser = await api.create('users', { 
                        username: username.toLowerCase(), 
                        email: email.toLowerCase(),
                        password: simpleHash(password),
                        last_login: new Date().toISOString(),
                        is_verified: false
                    });
                    
                    if (rememberMe) {
                        localStorage.setItem('dailybars_remembered_email', email);
                    }
                    
                    haptic('success');
                    toast?.addToast('WELCOME TO THE LAB', 'success');
                    onLogin({ username: username.toLowerCase(), email: email.toLowerCase() });
                }
            } else {
                if (existingUser && existingUser.password === simpleHash(password)) {
                    await api.update('users', existingUser.id, { last_login: new Date().toISOString() });
                    
                    if (rememberMe) {
                        localStorage.setItem('dailybars_remembered_login', loginIdentifier);
                    } else {
                        localStorage.removeItem('dailybars_remembered_login');
                    }
                    
                    haptic('success');
                    onLogin({ username: existingUser.username, email: existingUser.email });
                } else if (existingUser && existingUser.password === password) {
                    await api.update('users', existingUser.id, { 
                        password: simpleHash(password),
                        last_login: new Date().toISOString() 
                    });
                    
                    if (rememberMe) {
                        localStorage.setItem('dailybars_remembered_login', loginIdentifier);
                    }
                    
                    haptic('success');
                    onLogin({ username: existingUser.username, email: existingUser.email });
                } else {
                    setError('INVALID LOGIN OR PASSWORD');
                    haptic('heavy');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            console.error('Error details:', err.message);
            setError(err.message || 'CONNECTION ERROR - TRY AGAIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, 
            backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
            zIndex: 9999, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', padding: 32,
            overflowY: 'auto'
        }}>
            <div className={`animate-slide-up ${error ? 'animate-rumble' : ''}`} style={{ 
                width: '100%', maxWidth: 360, textAlign: 'center',
                padding: '20px 0'
            }}>
                <img 
                    src={LOGO_SOLID} 
                    alt="Daily Bars" 
                    style={{ 
                        width: '100%', maxWidth: 280, height: 'auto', 
                        marginBottom: 32, margin: '0 auto 32px',
                        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' 
                    }} 
                />
                
                <div style={{ 
                    display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 32,
                    border: '2px solid var(--black)', background: 'var(--white)'
                }}>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        style={{
                            flex: 1, padding: '12px 20px',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                            background: !isSignUp ? 'var(--black)' : 'transparent',
                            color: !isSignUp ? 'var(--white)' : 'var(--black)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        SIGN IN
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(true)}
                        style={{
                            flex: 1, padding: '12px 20px',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                            background: isSignUp ? 'var(--black)' : 'transparent',
                            color: isSignUp ? 'var(--white)' : 'var(--black)',
                            borderLeft: '2px solid var(--black)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        CREATE ACCOUNT
                    </button>
                </div>

                {isSignUp && (
                    <div style={{ 
                        display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24,
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: step >= 1 ? 'var(--black)' : 'var(--light-gray)',
                            color: step >= 1 ? 'var(--white)' : 'var(--gray)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700
                        }}>1</div>
                        <div style={{ width: 40, height: 2, background: step >= 2 ? 'var(--black)' : 'var(--light-gray)' }} />
                        <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: step >= 2 ? 'var(--black)' : 'var(--light-gray)',
                            color: step >= 2 ? 'var(--white)' : 'var(--gray)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700
                        }}>2</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Sign In: Accept email OR username */}
                    {!isSignUp && (
                        <LoginInputField
                            label="EMAIL OR USERNAME"
                            type="text"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            placeholder="your@email.com or @username"
                            error={fieldErrors.loginIdentifier}
                            hint="Login with your email or artist name"
                        />
                    )}
                    
                    {/* Sign Up Step 1: Email only */}
                    {isSignUp && step === 1 && (
                        <LoginInputField
                            label="EMAIL ADDRESS"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            error={fieldErrors.email}
                        />
                    )}

                    {!isSignUp && (
                        <LoginInputField
                            label="PASSWORD"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            error={fieldErrors.password}
                            showToggle={true}
                            showValue={showPassword}
                            onToggle={() => setShowPassword(!showPassword)}
                        />
                    )}

                    {isSignUp && step === 2 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em',
                                    marginBottom: 8
                                }}
                            >
                                <Icon name="ArrowLeft" size={14} />
                                BACK TO EMAIL
                            </button>

                            <div style={{ 
                                background: 'rgba(0,0,0,0.05)', padding: 12, 
                                marginBottom: 8, textAlign: 'left',
                                fontSize: 11, letterSpacing: '0.05em'
                            }}>
                                <strong>EMAIL:</strong> {email}
                            </div>

                            <LoginInputField
                                label="ARTIST NAME"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="YOUR UNIQUE HANDLE"
                                error={fieldErrors.username}
                            />

                            <div>
                                <LoginInputField
                                    label="CREATE PASSWORD"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="MIN 8 CHARACTERS"
                                    error={fieldErrors.password}
                                    showToggle={true}
                                    showValue={showPassword}
                                    onToggle={() => setShowPassword(!showPassword)}
                                />
                                {password.length > 0 && <PasswordStrengthBar password={password} passwordStrength={passwordStrength} />}
                            </div>

                            <LoginInputField
                                label="CONFIRM PASSWORD"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="RE-ENTER PASSWORD"
                                error={fieldErrors.confirmPassword}
                                showToggle={true}
                                showValue={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            />

                            <label style={{ 
                                display: 'flex', alignItems: 'flex-start', gap: 12, 
                                textAlign: 'left', cursor: 'pointer'
                            }}>
                                <div 
                                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                                    style={{
                                        width: 20, height: 20, flexShrink: 0,
                                        border: `2px solid ${fieldErrors.terms ? '#EF4444' : 'var(--black)'}`,
                                        background: agreedToTerms ? 'var(--black)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginTop: 2
                                    }}
                                >
                                    {agreedToTerms && <Icon name="Check" size={14} color="white" />}
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--gray)', lineHeight: 1.5, letterSpacing: '0.05em' }}>
                                    I agree to the <span style={{ color: 'var(--black)', textDecoration: 'underline' }}>Terms of Service</span> and <span style={{ color: 'var(--black)', textDecoration: 'underline' }}>Privacy Policy</span>
                                </span>
                            </label>
                        </>
                    )}

                    {!isSignUp && (
                        <label style={{ 
                            display: 'flex', alignItems: 'center', gap: 12, 
                            cursor: 'pointer', justifyContent: 'flex-start'
                        }}>
                            <div 
                                onClick={() => setRememberMe(!rememberMe)}
                                style={{
                                    width: 18, height: 18,
                                    border: '2px solid var(--black)',
                                    background: rememberMe ? 'var(--black)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {rememberMe && <Icon name="Check" size={12} color="white" />}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>
                                REMEMBER ME
                            </span>
                        </label>
                    )}

                    {error && (
                        <div className="animate-pulse" style={{ 
                            color: '#EF4444', fontSize: 11, fontWeight: 700, 
                            letterSpacing: '0.1em', padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            <Icon name="AlertCircle" size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{
                            marginTop: 12,
                            background: 'var(--brand-green)', color: 'var(--white)',
                            padding: 18, fontSize: 12, fontWeight: 900, letterSpacing: '0.2em',
                            border: '2px solid var(--black)', 
                            boxShadow: loading ? 'none' : '4px 4px 0 var(--black)',
                            transform: loading ? 'translate(2px, 2px)' : 'none',
                            transition: 'all 0.1s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                        }}
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span>
                                PROCESSING...
                            </>
                        ) : isSignUp ? (
                            step === 1 ? 'CONTINUE →' : 'CREATE ACCOUNT'
                        ) : (
                            'ENTER THE LAB'
                        )}
                    </button>
                </form>
                
                {!isSignUp && (
                    <div style={{ marginTop: 20 }}>
                        <button 
                            type="button"
                            onClick={() => {
                                if (email && isValidEmail(email)) {
                                    toast?.addToast('PASSWORD RESET COMING SOON', 'info');
                                } else {
                                    toast?.addToast('ENTER YOUR EMAIL FIRST', 'warning');
                                }
                            }}
                            style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em', textDecoration: 'underline' }}
                        >
                            FORGOT PASSWORD?
                        </button>
                    </div>
                )}
                
                <div style={{ marginTop: 40, fontSize: 9, color: 'var(--gray)', letterSpacing: '0.1em' }}>
                    <div style={{ marginBottom: 8 }}>RESTRICTED ACCESS // OAKLAND CA</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                        <span>🔒 SECURE</span>
                        <span>•</span>
                        <span>📱 MOBILE-FIRST</span>
                        <span>•</span>
                        <span>🎤 ARTIST-BUILT</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// XP STORE VIEW
// ============================================================================

const XPStoreView = ({ user, onClose }) => {
    const xp = user.xp || 0;
    const level = user.level || 1;
    const nextLevelXp = level * 100;
    const progress = (xp % 100) / 100 * 100;

    const artifacts = [
        { id: 1, name: "E-40'S GLASSES", level: 5, description: "Unlocks Slang Dictionary", icon: "Glasses" },
        { id: 2, name: "SLICK RICK'S EYE PATCH", level: 10, description: "Unlocks Storytelling Mode", icon: "Eye" },
        { id: 3, name: "GHOSTFACE'S CHAIN", level: 20, description: "Unlocks Golden Era Theme", icon: "Award" },
        { id: 4, name: "KANYE'S PINK POLO", level: 50, description: "Unlocks Soul Chop Beats", icon: "Shirt" }
    ];

    return (
        <div className="animate-slide-up" style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'var(--paper)', display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: 16, background: 'var(--black)', color: 'var(--white)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.8 }}>STUDENT STATUS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.1em' }}>LEVEL {level}</div>
                </div>
                <button onClick={onClose} style={{ color: 'var(--white)' }}><Icon name="X" size={24} /></button>
            </div>

            {/* XP Progress */}
            <div style={{ padding: 20, background: 'var(--white)', borderBottom: '2px solid var(--black)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10, fontWeight: 700 }}>
                    <span>XP: {xp}</span>
                    <span>NEXT LEVEL: {nextLevelXp}</span>
                </div>
                <div style={{ height: 12, background: 'var(--light-gray)', border: '1px solid var(--black)', position: 'relative' }}>
                    <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`,
                        background: 'var(--electric)', transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Store Shelf */}
            <div className="scrollable" style={{ flex: 1, padding: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 16, textAlign: 'center' }}>
                    THE TROPHY ROOM
                </div>
                
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
                    {artifacts.map(item => {
                        const isLocked = level < item.level;
                        return (
                            <div key={item.id} style={{
                                minWidth: 200,
                                background: isLocked ? '#E5E5E5' : 'var(--white)',
                                border: '2px solid var(--black)',
                                padding: 16,
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                opacity: isLocked ? 0.7 : 1
                            }}>
                                <div style={{
                                    width: 80, height: 80, 
                                    background: isLocked ? '#999' : 'var(--electric)',
                                    borderRadius: '50%', border: '2px solid var(--black)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    {isLocked ? <Icon name="Lock" size={32} /> : <Icon name={item.icon} size={32} />}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 900, textAlign: 'center', marginBottom: 8 }}>{item.name}</div>
                                <div style={{ fontSize: 9, textAlign: 'center', color: 'var(--gray)', marginBottom: 12 }}>{item.description}</div>
                                <div style={{ 
                                    fontSize: 9, fontWeight: 700, padding: '4px 8px', 
                                    background: 'var(--black)', color: 'var(--white)' 
                                }}>
                                    LVL {item.level} REQ
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// SAFE COMPONENT (VAULT BACKGROUND)
// ============================================================================

const SafeComponent = () => {
    // Global scaling factor to tame the size
    const GLOBAL_SCALE = 0.5; // Adjusted to reduce size while maintaining layout

    // --- ASSETS ---
    const ASSETS = {
        wall: "https://i.postimg.cc/mZKX1D3G/safe-wall.png",
        backOfSafe: "https://i.postimg.cc/qBWb6Rcf/back-of-safe.png",
        gearLarge: "https://i.postimg.cc/h4NyQjLk/large-gear.png",
        gearMedium: "https://i.postimg.cc/qBND7n3Y/medium-gear.png",
        gearSmall: "https://i.postimg.cc/SQn1K8MP/small-gear.png",
        hinges: "https://i.postimg.cc/h4NyQjLY/hinges-and-blots.png",
        knob: "https://i.postimg.cc/xjBxNCv6/center-knob.png"
    };

    // --- CONFIGURATIONS ---
    const CONFIGS = {
        MOBILE: {
            wall: { x: 26, y: 0, scale: 3, rotate: false },
            backOfSafe: { x: 0, y: 0, scale: 1.93, rotate: false },
            gearLarge: { x: 48, y: -31, scale: 0.3, rotate: true },
            gearMedium: { x: 102, y: -4, scale: 0.2, rotate: true },
            gearSmall: { x: 73, y: 28, scale: 0.19, rotate: true },
            hinges: { x: 0, y: 0, scale: 1.17, rotate: false },
            knob: { x: 0, y: 0, scale: 0.38, rotate: true }
        },
        TABLET: {
            wall: { x: 50, y: 0, scale: 3, rotate: false },
            backOfSafe: { x: 0, y: 0, scale: 1.93, rotate: false },
            gearLarge: { x: 193, y: -46, scale: 0.21, rotate: true },
            gearMedium: { x: 215, y: 50, scale: 0.2, rotate: true },
            gearSmall: { x: 117, y: 28, scale: 0.19, rotate: true },
            hinges: { x: 0, y: 0, scale: 1.17, rotate: false },
            knob: { x: 0, y: 0, scale: 0.38, rotate: true }
        },
        DESKTOP: {
            wall: { x: 50, y: 0, scale: 3, rotate: false },
            backOfSafe: { x: 0, y: 0, scale: 1.93, rotate: false },
            gearLarge: { x: 300, y: -46, scale: 0.21, rotate: true },
            gearMedium: { x: 300, y: 114, scale: 0.2, rotate: true },
            gearSmall: { x: 169, y: 41, scale: 0.19, rotate: true },
            hinges: { x: 0, y: 0, scale: 1.17, rotate: false },
            knob: { x: 0, y: 0, scale: 0.38, rotate: true }
        }
    };

    const LAYER_ORDER = ['wall', 'backOfSafe', 'gearLarge', 'gearMedium', 'gearSmall', 'hinges', 'knob'];

    // Gear Ratios (Controls speed and direction)
    const RATIOS = {
        wall: 0, backOfSafe: 0, hinges: 0,
        gearLarge: 1, gearMedium: -1.5, gearSmall: 2.5, knob: 0.5
    };

    const configRef = useRef(CONFIGS.MOBILE);
    const layerRefs = useRef({});
    const rotationRef = useRef(0);
    const isScrollingRef = useRef(false);

    // --- 1. RESPONSIVE HANDLER ---
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width >= 1200) {
                configRef.current = CONFIGS.DESKTOP;
            } else if (width >= 768) {
                configRef.current = CONFIGS.TABLET;
            } else {
                configRef.current = CONFIGS.MOBILE;
            }
            updateVisuals(rotationRef.current);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- 2. SCROLL DETECTION ---
    useEffect(() => {
        let scrollTimeout;
        const onScroll = () => {
            isScrollingRef.current = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrollingRef.current = false;
            }, 150);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            clearTimeout(scrollTimeout);
        };
    }, []);

    // --- 3. ANIMATION LOOP ---
    useEffect(() => {
        let animationFrameId;
        const SPEED = 0.2; 

        const animate = () => {
            if (!isScrollingRef.current) {
                rotationRef.current += SPEED;
                updateVisuals(rotationRef.current);
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // --- 4. RENDERER ---
    const updateVisuals = (deg) => {
        LAYER_ORDER.forEach(layerName => {
            const el = layerRefs.current[layerName];
            const cfg = configRef.current[layerName];
            
            if (el && cfg) {
                const ratio = RATIOS[layerName] || 0;
                const rotateVal = cfg.rotate ? deg * ratio : 0;
                el.style.transform = `translate(${cfg.x}px, ${cfg.y}px) scale(${cfg.scale}) rotate(${rotateVal}deg) translate3d(0,0,0)`;
            }
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
            backgroundColor: 'white'
        }}>
            <div style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transform: `scale(${GLOBAL_SCALE})`
            }}>
                {LAYER_ORDER.map(layerName => (
                    <div
                        key={layerName}
                        ref={el => layerRefs.current[layerName] = el}
                        style={{
                            position: layerName === 'wall' ? 'relative' : 'absolute',
                            top: layerName === 'wall' ? 'auto' : 0,
                            left: layerName === 'wall' ? 'auto' : 0,
                            right: layerName === 'wall' ? 'auto' : 0,
                            bottom: layerName === 'wall' ? 'auto' : 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            willChange: 'transform',
                            transform: `translate(${configRef.current[layerName].x}px, ${configRef.current[layerName].y}px) scale(${configRef.current[layerName].scale})`
                        }}
                    >
                        <img 
                            src={ASSETS[layerName]} 
                            alt={layerName} 
                            style={{
                                objectFit: 'contain',
                                display: layerName === 'wall' ? 'block' : 'block',
                                width: layerName === 'wall' ? 'auto' : '100%',
                                height: layerName === 'wall' ? 'auto' : '100%'
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// SYNDICATE VIEW
// ============================================================================

const SyndicateView = ({ user, onTyping, onOpenStore, onAction }) => {
    const [tab, setTab] = useState('vault'); // 'vault' (Prompts) or 'free_game' (Bars)
    const [loading, setLoading] = useState(false);
    const [feed, setFeed] = useState([]);
    const [promptText, setPromptText] = useState('');
    const [submitting, setSubmission] = useState(false);
    const toast = useToast();

    // Load initial data
    useEffect(() => {
        loadFeed();
    }, [tab]);

    const loadFeed = async () => {
        setLoading(true);
        const data = await window.DailyDepositEngine.getSyndicateFeed();
        
        // Filter based on tab
        const filtered = data.filter(post => {
            if (tab === 'vault') return post.submission_type === 'PROMPT' || !post.submission_type; // Legacy assumes PROMPT
            if (tab === 'free_game') return post.submission_type === 'VERSE';
            return true;
        });
        
        setFeed(filtered);
        setLoading(false);
    };

    const handleSubmitPrompt = async (e) => {
        e.preventDefault();
        if (!promptText.trim()) return;
        
        setSubmission(true);
        try {
            await window.DailyDepositEngine.submitToSyndicate(promptText, user.username, 'PROMPT');
            toast?.addToast('PROMPT SUBMITTED +50 XP', 'success');
            if (onAction) onAction(50, 'PROMPT SUBMITTED');
            setPromptText('');
            loadFeed();
        } catch (err) {
            toast?.addToast('SUBMISSION FAILED', 'error');
        }
        setSubmission(false);
    };

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Tab Switcher */}
            <div style={{ 
                display: 'flex', 
                borderBottom: '2px solid var(--black)',
                background: 'var(--white)',
                position: 'sticky', top: 0, zIndex: 10
            }}>
                <button 
                    onClick={() => setTab('vault')}
                    style={{
                        flex: 1, padding: 16,
                        background: tab === 'vault' ? 'var(--black)' : 'transparent',
                        color: tab === 'vault' ? 'var(--electric)' : 'var(--black)',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.1em'
                    }}
                >
                    THE VAULT
                </button>
                <button 
                    onClick={() => setTab('free_game')}
                    style={{
                        flex: 1, padding: 16,
                        background: tab === 'free_game' ? 'var(--black)' : 'transparent',
                        color: tab === 'free_game' ? 'var(--white)' : 'var(--black)',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.1em'
                    }}
                >
                    FREE GAME
                </button>
                <button 
                    onClick={onOpenStore}
                    style={{
                        padding: '16px 20px',
                        background: 'var(--electric)',
                        color: 'var(--black)',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                        borderLeft: '2px solid var(--black)'
                    }}
                >
                    <Icon name="Award" size={16} />
                </button>
            </div>

            {/* VAULT CONTENT */}
            {tab === 'vault' && (
                <div className="animate-slide-in" style={{ position: 'relative', minHeight: '80vh' }}>
                    <SafeComponent />
                    
                    {/* VAULT FEED - REORDERED: Now First */}
                    <div style={{ padding: '20px 20px 0', position: 'relative', zIndex: 1 }}>
                        <div style={{ 
                            fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', 
                            textAlign: 'center', marginBottom: 16,
                            color: 'var(--black)',
                            background: 'rgba(255,255,255,0.8)',
                            padding: '8px',
                            borderRadius: 4,
                            display: 'inline-block'
                        }}>
                            COMMUNITY DROPS
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.8)', borderRadius: 8 }}>
                                <div style={{ fontSize: 10, letterSpacing: '0.1em' }}>LOADING VAULT...</div>
                            </div>
                        ) : feed.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.8)', borderRadius: 8 }}>
                                <div style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.5 }}>VAULT IS EMPTY</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                                {feed.map((p, i) => (
                                    <div key={p.id || i} className="animate-slide-up" style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        padding: 16,
                                        border: '1px solid var(--black)',
                                        boxShadow: '4px 4px 0 rgba(0,0,0,0.1)'
                                    }}>
                                        <div style={{ 
                                            fontFamily: "'Space Mono', monospace", 
                                            fontSize: 12, 
                                            lineHeight: 1.5,
                                            marginBottom: 12
                                        }}>
                                            {p.prompt_text}
                                        </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            fontSize: 9, 
                                            color: 'var(--gray)',
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase'
                                        }}>
                                            <span>@{p.author}</span>
                                            <span>💎 {p.likes || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Prompt Form - REORDERED: Now Second */}
                    <div style={{ padding: 20, position: 'relative', zIndex: 1 }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            padding: 20,
                            border: '2px solid var(--black)',
                            boxShadow: '8px 8px 0 rgba(0,0,0,0.2)'
                        }}>
                            <h3 className="font-display" style={{ fontSize: 14, marginBottom: 12 }}>SUBMIT A PROMPT</h3>
                            <textarea
                                value={promptText}
                                onChange={(e) => { setPromptText(e.target.value); onTyping?.(); }}
                                placeholder="SUGGEST A TOPIC, WORD, OR SCENARIO..."
                                style={{
                                    width: '100%', minHeight: 80,
                                    padding: 12, border: '2px solid var(--black)',
                                    background: 'var(--white)',
                                    fontFamily: 'var(--font-mono)', fontSize: 12
                                }}
                            />
                            <button 
                                onClick={handleSubmitPrompt}
                                disabled={submitting || !promptText.trim()}
                                style={{
                                    width: '100%', marginTop: 12, padding: 14,
                                    background: 'var(--electric)', color: 'var(--black)',
                                    fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                                    border: '2px solid var(--black)',
                                    opacity: submitting ? 0.5 : 1
                                }}
                            >
                                {submitting ? 'SENDING...' : 'SEND TO SYNDICATE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FREE GAME CONTENT */}
            {tab === 'free_game' && (
                <div className="animate-slide-in">
                    <div style={{ padding: 16, background: '#1F2937', color: 'white', fontSize: 10, textAlign: 'center', letterSpacing: '0.1em' }}>
                        PUBLIC DOMAIN BARS • FREE TO USE
                    </div>
                    
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 10 }}>LOADING FEED...</div>
                    ) : feed.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)', fontSize: 10 }}>NO FREE GAME YET</div>
                    ) : (
                        feed.map((post) => (
                            <div key={post.id} style={{ 
                                padding: 20, 
                                borderBottom: '1px solid var(--light-gray)',
                                background: 'var(--white)' 
                            }}>
                                <div style={{ fontSize: 9, color: 'var(--gray)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>@{post.author || 'ANONYMOUS'}</span>
                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="font-mono" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                                    {post.prompt_text}
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(post.prompt_text);
                                        toast?.addToast('COPIED TO CLIPBOARD', 'success');
                                    }}
                                    style={{
                                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                                        padding: '6px 12px', border: '1px solid var(--black)',
                                        display: 'flex', alignItems: 'center', gap: 6
                                    }}
                                >
                                    <Icon name="Copy" size={10} /> STEAL THIS
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN APP
// ============================================================================

const App = () => {
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    // Initialize view from storage or default to feed
    const [view, setView] = useState(() => localStorage.getItem('dailybars_view') || 'feed');
    const [bars, setBars] = useState([]);
    const [songs, setSongs] = useState([]);
    const [loadingBars, setLoadingBars] = useState(true);
    const [loadingSongs, setLoadingSongs] = useState(true);
    const [selectedBar, setSelectedBar] = useState(null);
    const [editingSong, setEditingSong] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [streak, setStreak] = useState(0);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [dailyPrompt, setDailyPrompt] = useState(null);
    const [crateModalBar, setCrateModalBar] = useState(null);
    const [showXPStore, setShowXPStore] = useState(false);
    const typingTimeoutRef = useRef(null);

    // XP SYSTEM LOGIC
    const addExperience = async (amount, reason) => {
        if (!user || !user.id) return;
        
        try {
            const currentXp = user.xp || 0;
            const currentLevel = user.level || 1;
            const newXp = currentXp + amount;
            const newLevel = Math.floor(newXp / 100) + 1;
            
            // Optimistic update
            const updatedUser = { ...user, xp: newXp, level: newLevel };
            setUser(updatedUser);
            localStorage.setItem('dailybars_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('dailybars_session')), user: updatedUser }));
            
            // API Update
            await api.update('users', user.id, { xp: newXp, level: newLevel });
            
            // Notifications
            // toast?.addToast(`+${amount} XP: ${reason}`, 'success'); // Need to expose toast here or use simple alert
            console.log(`⭐ +${amount} XP: ${reason}`);
            
            if (newLevel > currentLevel) {
                // Level Up!
                haptic('success');
                setTimeout(() => alert(`LEVEL UP! YOU ARE NOW LEVEL ${newLevel}`), 500); // Simple alert for now
            }
        } catch (err) {
            console.error('XP Update failed:', err);
        }
    };

    const updateStreak = useCallback(() => {
        if (!user) return;
        const today = new Date().toDateString();
        const lastPost = localStorage.getItem(`lastPostDate_${user.username}`);
        let currentStreak = parseInt(localStorage.getItem(`streakCount_${user.username}`) || '0');

        if (lastPost !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastPost === yesterday.toDateString()) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            
            localStorage.setItem(`streakCount_${user.username}`, currentStreak.toString());
            localStorage.setItem(`lastPostDate_${user.username}`, today);
            setStreak(currentStreak);
            
            // Award XP for daily activity (once per day)
            addExperience(10, 'DAILY CHECK-IN');
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const lastPost = localStorage.getItem(`lastPostDate_${user.username}`);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let currentStreak = parseInt(localStorage.getItem(`streakCount_${user.username}`) || '0');

        if (lastPost && new Date(lastPost) < yesterday && lastPost !== new Date().toDateString()) {
             currentStreak = 0;
             localStorage.setItem(`streakCount_${user.username}`, '0');
        }
        setStreak(currentStreak);
    }, [user]);

    useEffect(() => {
        const storedUser = localStorage.getItem('dailybars_session');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
                    setUser(parsed.user);
                } else {
                    localStorage.removeItem('dailybars_session');
                }
            } catch {
                localStorage.removeItem('dailybars_session');
            }
        }
        const legacyUser = localStorage.getItem('guap_user');
        if (legacyUser && !localStorage.getItem('dailybars_session')) {
            try {
                const parsed = JSON.parse(legacyUser);
                setUser(parsed);
                localStorage.setItem('dailybars_session', JSON.stringify({
                    user: parsed,
                    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
                }));
                localStorage.removeItem('guap_user');
            } catch {
                localStorage.removeItem('guap_user');
            }
        }
        setTimeout(() => setIsCheckingAuth(false), 500);
    }, []);

    // Data loading function - extracted so we can call after migration
    const loadUserData = async (targetUser = user) => {
        if (!targetUser?.username) {
            console.warn('⚠️ loadUserData called without valid user');
            return;
        }
        
        const username = targetUser.username.toLowerCase();
        console.log(`🔄 Loading data for @${username}...`);
        
        setLoadingBars(true);
        setLoadingSongs(true);
        
        try { 
            const res = await api.get('bars', { sort: '-created_at', limit: 1000 }); 
            const allBars = res.data || [];
            console.log(`📊 Total bars in DB: ${allBars.length}`);
            
            // Filter by username (case-insensitive for safety)
            const userBars = allBars.filter(b => 
                b.username?.toLowerCase() === username
            );
            
            // Also log orphan bars for debugging
            const orphanBars = allBars.filter(b => !b.username);
            if (orphanBars.length > 0) {
                console.log(`⚠️ Found ${orphanBars.length} orphan bars without username`);
            }
            
            console.log(`✅ Loaded ${userBars.length} bars for @${username}`);
            setBars(userBars); 
        } catch (err) { 
            console.error('❌ Bars load error:', err); 
            setBars([]);
        }
        setLoadingBars(false);
        
        try { 
            const res = await api.get('songs', { sort: '-updated_at', limit: 1000 }); 
            const allSongs = res.data || [];
            console.log(`📊 Total songs in DB: ${allSongs.length}`);
            
            const userSongs = allSongs.filter(s => 
                s.username?.toLowerCase() === username
            );
            
            const orphanSongs = allSongs.filter(s => !s.username);
            if (orphanSongs.length > 0) {
                console.log(`⚠️ Found ${orphanSongs.length} orphan songs without username`);
            }
            
            console.log(`✅ Loaded ${userSongs.length} songs for @${username}`);
            setSongs(userSongs); 
        } catch (err) { 
            console.error('❌ Songs load error:', err); 
            setSongs([]);
        }
        setLoadingSongs(false);
    };

    // Migration effect - runs for the first admin user to claim orphan data
    // Also migrates data from specific user ID e0f2c461-fc65-4d3e-9640-a715e3d1673c to guap
    useEffect(() => {
        const migrateData = async () => {
            // Only 'guap' can claim orphan data (admin account)
            if (user?.username?.toLowerCase() === 'guap') {
                try {
                    console.log('🔍 Checking for data to migrate to @guap...');
                    
                    // Target user ID and usernames to migrate FROM
                    const TARGET_USER_ID = 'e0f2c461-fc65-4d3e-9640-a715e3d1673c';
                    const TARGET_USERNAMES = ['guapdad4000', 'guapdad']; // Additional usernames to migrate
                    let totalMigrated = 0;
                    
                    // Get all bars
                    const allBars = await api.get('bars', { limit: 1000 });
                    const barsToMigrate = allBars.data?.filter(b => 
                        !b.username || // orphan bars
                        b.username === TARGET_USER_ID || // bars with user ID as username
                        b.user_id === TARGET_USER_ID || // bars with user_id field
                        TARGET_USERNAMES.includes(b.username?.toLowerCase()) // bars from target usernames
                    ) || [];
                    
                    if (barsToMigrate.length > 0) {
                        console.log(`🔄 Migrating ${barsToMigrate.length} bars to @guap...`);
                        for (const bar of barsToMigrate) {
                            await api.patch('bars', bar.id, { username: 'guap' });
                            totalMigrated++;
                        }
                        console.log(`✅ Migrated ${barsToMigrate.length} bars`);
                    }
                    
                    // Get all songs
                    const allSongs = await api.get('songs', { limit: 1000 });
                    const songsToMigrate = allSongs.data?.filter(s => 
                        !s.username || // orphan songs
                        s.username === TARGET_USER_ID || // songs with user ID as username
                        s.user_id === TARGET_USER_ID || // songs with user_id field
                        TARGET_USERNAMES.includes(s.username?.toLowerCase()) // songs from target usernames
                    ) || [];
                    
                    if (songsToMigrate.length > 0) {
                        console.log(`🔄 Migrating ${songsToMigrate.length} songs to @guap...`);
                        for (const song of songsToMigrate) {
                            await api.patch('songs', song.id, { username: 'guap' });
                            totalMigrated++;
                        }
                        console.log(`✅ Migrated ${songsToMigrate.length} songs`);
                    }
                    
                    // Reload data after migration
                    if (totalMigrated > 0) {
                        console.log(`🎉 Migration complete! Total items migrated: ${totalMigrated}`);
                        await loadUserData(user);
                    } else {
                        console.log('ℹ️ No data to migrate');
                    }
                } catch (e) {
                    console.error('❌ Migration failed:', e);
                }
            } else {
                console.log(`ℹ️ User @${user?.username} is not admin, skipping migration`);
            }
        };
        if (user) migrateData();
    }, [user]);

    const handleLogin = (userData) => {
        const session = {
            user: userData,
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
            createdAt: Date.now()
        };
        localStorage.setItem('dailybars_session', JSON.stringify(session));
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('dailybars_session');
        localStorage.removeItem('guap_user');
        setUser(null);
        setView('feed');
    };

    const handleTyping = () => {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 200);
    };
    
    // Handle Daily Drop prompt usage
    const handleUsePrompt = (prompt) => {
        setDailyPrompt(prompt);
        setView('feed');
        // Clear after a short delay so QuickInput can pick it up
        setTimeout(() => setDailyPrompt(null), 100);
    };
    
    const views = [
        { id: 'feed', label: 'FEED', subtitle: 'YOUR IDEAS' },
        { id: 'archive', label: 'ARCHIVE', subtitle: 'FLYER GRID' },
        { id: 'favorites', label: 'FAVORITES', subtitle: 'STARRED' },
        { id: 'crates', label: 'CRATES', subtitle: 'TRACKS' },
        { id: 'syndicate', label: 'SYNDICATE', subtitle: 'COMMUNITY' }
    ];
    
    const currentIndex = views.findIndex(v => v.id === view);
    const currentView = views[currentIndex];
    
    const swipeHandlers = useSwipe(
        () => {
            const nextView = views[(currentIndex + 1) % views.length].id;
            setView(nextView);
            localStorage.setItem('dailybars_view', nextView);
        },
        () => {
            const prevView = views[(currentIndex - 1 + views.length) % views.length].id;
            setView(prevView);
            localStorage.setItem('dailybars_view', prevView);
        }
    );
    
    // Initial data load when user changes
    useEffect(() => {
        if (user?.username) {
            console.log(`👤 User session active: @${user.username} (${user.email || 'no email'})`);
            // Small delay to ensure state is settled
            const loadTimeout = setTimeout(() => {
                loadUserData(user);
            }, 100);
            return () => clearTimeout(loadTimeout);
        }
    }, [user]);
    
    const addBar = async (data) => {
        try {
            const newBar = await api.create('bars', { 
                text: data.text, 
                tags: data.tags || [], 
                imageUrl: data.imageUrl || null, 
                audioUrl: data.audioUrl || null,
                isFavorite: false, 
                aiGenerated: false,
                username: user.username
            });
            setBars(prev => [newBar, ...prev]);
            updateStreak();
            addExperience(5, 'BAR WRITTEN');
        } catch (err) { console.error(err); }
    };
    
    const deleteBar = async (id) => {
        try { await api.delete('bars', id); setBars(prev => prev.filter(b => b.id !== id)); }
        catch (err) { console.error(err); }
    };
    
    const toggleFavorite = async (id, isFavorite) => {
        try { await api.patch('bars', id, { isFavorite }); setBars(prev => prev.map(b => b.id === id ? { ...b, isFavorite } : b)); }
        catch (err) { console.error(err); }
    };
    
    const editBar = async (id, text) => {
        try { await api.patch('bars', id, { text }); setBars(prev => prev.map(b => b.id === id ? { ...b, text } : b)); }
        catch (err) { console.error(err); }
    };
    
    const createSong = async (initialTitle = 'UNTITLED') => {
        try {
            const newSong = await api.create('songs', { 
                title: initialTitle, 
                blocks: [], 
                status: 'draft', 
                isFavorite: false, 
                coverImage: null,
                username: user.username
            });
            setSongs(prev => [newSong, ...prev]);
            setEditingSong(newSong);
            updateStreak();
            return newSong;
        } catch (err) { console.error(err); return null; }
    };
    
    const saveSong = async (songData) => {
        try {
            const updated = await api.update('songs', songData.id, { 
                title: songData.title, 
                blocks: songData.blocks, 
                status: songData.status, 
                coverImage: songData.coverImage,
                username: user.username 
            });
            setSongs(prev => prev.map(s => s.id === songData.id ? updated : s));
            updateStreak();
        } catch (err) { throw err; }
    };
    
    const handleAddToCrate = async (songId, bar) => {
        try {
            const song = songs.find(s => s.id === songId);
            if (!song) return;
            
            const newBlock = { 
                id: generateId(), 
                type: 'text', 
                content: bar.text 
            };
            
            const updatedBlocks = [...(song.blocks || []), newBlock];
            
            const updatedSong = await api.update('songs', songId, { 
                blocks: updatedBlocks,
                username: user.username 
            });
            
            setSongs(prev => prev.map(s => s.id === songId ? updatedSong : s));
            
            // Show toast via ToastProvider logic if accessible, or just console
            console.log('Added to crate!');
        } catch (err) {
            console.error('Failed to add to crate:', err);
        }
    };
    
    const handleSendToFreeGame = async (bar) => {
        try {
            await window.DailyDepositEngine.submitToSyndicate(bar.text, user.username, 'VERSE');
            console.log('Sent to free game'); 
            addExperience(25, 'CONTRIBUTED TO FREE GAME');
        } catch (err) {
            console.error(err);
        }
    };

    if (isCheckingAuth) return <div style={{ background: 'var(--paper)', minHeight: '100vh' }} />;
    
    if (!user) {
        return (
            <ToastProvider>
                <LoginScreen onLogin={handleLogin} />
            </ToastProvider>
        );
    }

    if (selectedBar) {
        return (
            <ToastProvider>
                <BarDetail bar={selectedBar} onClose={() => setSelectedBar(null)}
                    onDelete={(id) => { deleteBar(id); setSelectedBar(null); }}
                    onFavorite={toggleFavorite} onEdit={editBar} />
            </ToastProvider>
        );
    }
    
    if (editingSong) {
        return (
            <ToastProvider>
                <TrackEditor song={editingSong} onClose={() => setEditingSong(null)} onSave={saveSong} />
            </ToastProvider>
        );
    }
    
    return (
        <ToastProvider>
            <div style={{ minHeight: '100vh', paddingBottom: 40, display: 'flex', flexDirection: 'column' }}
                {...(!isInputExpanded ? swipeHandlers : {})}
                className="swipe-container"
            >
                <Header 
                    title={currentView.label} 
                    subtitle={currentView.subtitle}
                    currentView={view}
                    views={views}
                    onViewChange={(newView) => {
                        setView(newView);
                        localStorage.setItem('dailybars_view', newView);
                    }}
                    isTyping={isTyping}
                    onDailyDropUse={handleUsePrompt}
                />
                
                <main className="scrollable view-enter" style={{ flex: 1 }} key={view}>
                    {view === 'feed' && (
                        <FeedView 
                            bars={bars} 
                            onAddBar={addBar} 
                            onDeleteBar={deleteBar}
                            onFavorite={toggleFavorite} 
                            onEditBar={editBar} 
                            loading={loadingBars} 
                            onTyping={handleTyping}
                            onInputExpandChange={setIsInputExpanded}
                            dailyPrompt={dailyPrompt}
                            onAddToCrate={(bar) => setCrateModalBar(bar)}
                            onSendToFreeGame={handleSendToFreeGame}
                        />
                    )}
                    {view === 'syndicate' && (
                        <SyndicateView 
                            user={user} 
                            onTyping={handleTyping} 
                            onOpenStore={() => setShowXPStore(true)}
                            onAction={addExperience}
                        />
                    )}
                    {view === 'archive' && <ArchiveView bars={bars} onSelect={setSelectedBar} />}
                    {view === 'favorites' && <FavoritesView bars={bars} onSelect={setSelectedBar} />}
                    {view === 'crates' && <CratesView songs={songs} onCreateSong={() => createSong()} onEditSong={setEditingSong} />}
                </main>

                {showXPStore && (
                    <XPStoreView user={user} onClose={() => setShowXPStore(false)} />
                )}

                {crateModalBar && (
                    <AddToCrateModal 
                        bar={crateModalBar}
                        songs={songs}
                        onClose={() => setCrateModalBar(null)}
                        onSave={handleAddToCrate}
                        onCreateNew={async () => {
                            const newSong = await createSong(`NEW TRACK - ${formatDate(new Date())}`);
                            if (newSong) {
                                handleAddToCrate(newSong.id, crateModalBar);
                            }
                        }}
                    />
                )}

                <div style={{ position: 'fixed', bottom: 44, left: 16, zIndex: 100 }}>
                    <button onClick={handleLogout} style={{
                        background: 'var(--black)', color: 'var(--white)',
                        padding: '4px 8px', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em'
                    }}>LOGOUT @{user.username.toUpperCase()}</button>
                </div>

                <BottomBar currentView={view} streak={streak} />
            </div>
        </ToastProvider>
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
