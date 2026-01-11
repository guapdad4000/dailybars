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
    useVoiceRecorder, useMetronome, processImage, useSwipe,
    ToastProvider, useToast, Icon,
    DailyDropWidget, ImagePreview, BottomBar, Header,
    SocialExportModal, IdeaCard, RhymePopup, QuickInput,
    RhymeTextarea, RhymeHighlightedText,
    RadioWidget,
    LOGO_SOLID, LOGO_HOLLOW,
    UserProfileModal
} = window.DailyBarsApp;

// ============================================================================
// FEED VIEW
// ============================================================================

const FeedView = ({ bars, onAddBar, onDeleteBar, onFavorite, onEditBar, loading, onTyping, onInputExpandChange, dailyPrompt, onAddToCrate, onSendToFreeGame, canUseAI, onAIUse, onPremiumRequired }) => {
    const [previewImage, setPreviewImage] = useState(null);
    
    return (
        <div>
            <QuickInput
                onSave={onAddBar}
                onTyping={onTyping}
                onExpandChange={onInputExpandChange}
                initialPrompt={dailyPrompt}
                canUseAI={canUseAI}
                onAIUse={onAIUse}
                onPremiumRequired={onPremiumRequired}
                style={{ background: 'var(--white)' }}
            />
            
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
    const [isWide, setIsWide] = useState(window.innerWidth > 768);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [activeDate, setActiveDate] = useState(() => new Date());
    const featuredArtists = [
        {
            name: 'GUAPDAD 4000',
            role: 'Executive Producer',
            avatar: 'images/icon-180.png',
            stats: '8 placements • 2M spins',
            badge: 'Bay Royalty'
        },
        {
            name: 'DJ MUSTARD',
            role: 'Beat Architect',
            avatar: 'images/trophy/DJ_Mustard_“4Hunnid”_Hat_trophy.png',
            stats: '6 crates • 128 bpm master',
            badge: 'Heat Curator'
        },
        {
            name: 'MISSY ELLIOTT',
            role: 'Vibe Director',
            avatar: 'images/trophy/Missy_Elliott_Black_Trash_Bag_Suit_(Rain_Video)_trophy.png',
            stats: '11 concept flips',
            badge: 'Innovation Lab'
        }
    ];

    useEffect(() => {
        const handleResize = () => setIsWide(window.innerWidth > 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const backgroundUrl = isWide ? 'images/crate/crate-bg-wide.png' : 'images/crate/crate-bg-vertical.png';
    const calendarYear = calendarMonth.getFullYear();
    const calendarMonthIndex = calendarMonth.getMonth();
    const calendarLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonthIndex, 1).getDay();
    const calendarDays = useMemo(() => {
        const blanks = Array.from({ length: firstDayOfWeek }, () => null);
        const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
        return [...blanks, ...days];
    }, [firstDayOfWeek, daysInMonth]);
    const isSameDay = (dateA, dateB) =>
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate();
    const songsByDay = useMemo(() => {
        const map = new Map();
        songs.forEach(song => {
            const dateValue = song.updated_at || song.created_at;
            if (!dateValue) return;
            const dateKey = new Date(dateValue);
            const key = `${dateKey.getFullYear()}-${dateKey.getMonth()}-${dateKey.getDate()}`;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }, [songs]);
    const activeSongs = useMemo(() => {
        return songs.filter(song => {
            const dateValue = song.updated_at || song.created_at;
            if (!dateValue) return false;
            return isSameDay(new Date(dateValue), activeDate);
        });
    }, [songs, activeDate]);

    const spriteLayouts = useMemo(() => ([
        {
            padding: { top: 56, right: 36, bottom: 44, left: 48 },
            rotation: -1.1,
            translateX: -2
        },
        {
            padding: { top: 58, right: 40, bottom: 44, left: 70 },
            rotation: -0.2,
            translateX: -1
        },
        {
            padding: { top: 60, right: 50, bottom: 46, left: 62 },
            rotation: 1.1,
            translateX: -4
        },
        {
            padding: { top: 58, right: 36, bottom: 46, left: 50 },
            rotation: -0.6,
            translateX: 0
        },
        {
            padding: { top: 60, right: 42, bottom: 46, left: 72 },
            rotation: 0.8,
            translateX: 1
        },
        {
            padding: { top: 62, right: 52, bottom: 48, left: 64 },
            rotation: 1.6,
            translateX: -3
        }
    ]), []);

    return (
        <div style={{
            position: 'relative',
            minHeight: '100%',
            paddingBottom: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowX: 'hidden'
        }}>
            {/* Fixed Background Layer */}
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundImage: `url(${backgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: 0
            }} />

            {/* Content Layer (scrolls over background) */}
            <div className="font-serif" style={{
                padding: '40px 0 20px',
                fontSize: 48,
                fontWeight: 700,
                textAlign: 'center',
                width: '100%',
                marginBottom: 40,
                color: 'var(--electric)',
                zIndex: 20,
                position: 'relative', // Ensure above background
                textShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            <div style={{
                width: '90%',
                maxWidth: 400,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 40,
                zIndex: 15,
                position: 'relative'
            }}>
                <button
                    onClick={onCreateSong}
                    className="animate-slide-in"
                    style={{
                        flex: 1,
                        padding: '16px',
                        background: 'var(--black)',
                        color: 'var(--electric)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                        position: 'relative' // Ensure above background
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
                        START NEW SONG
                    </span>
                </button>
                <button
                    onClick={() => setShowCalendar(true)}
                    aria-label="Open calendar view"
                    style={{
                        width: 54,
                        height: 54,
                        background: 'var(--white)',
                        border: '2px solid var(--black)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '4px 4px 0 var(--black)',
                        position: 'relative'
                    }}
                >
                    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
                        <rect x="6" y="10" width="52" height="46" rx="6" fill="#FFFFFF" stroke="#111827" strokeWidth="3" />
                        <rect x="10" y="24" width="44" height="28" rx="2" fill="#111827" />
                        <circle cx="20" cy="32" r="2" fill="#4B5563" /> <circle cx="32" cy="32" r="2" fill="#4B5563" /> <circle cx="44" cy="32" r="2" fill="#4B5563" />
                        <circle cx="20" cy="42" r="2" fill="#4B5563" /> <circle cx="32" cy="42" r="2" fill="#EAB308" /> <circle cx="44" cy="42" r="2" fill="#4B5563" />
                        <rect x="14" y="6" width="8" height="8" rx="2" fill="#111827" />
                        <rect x="42" y="6" width="8" height="8" rx="2" fill="#111827" />
                    </svg>
                </button>
            </div>

            {showCalendar && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `url(${backgroundUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(2px)'
                    }} />
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 520,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        zIndex: 2
                    }}>
                        <div style={{
                            position: 'relative',
                            background: 'transparent',
                            filter: 'drop-shadow(8px 8px 0 var(--black))',
                            width: '100%'
                        }}>
                            <svg viewBox="0 0 520 400" width="100%" height="auto" aria-hidden="true" style={{ display: 'block' }}>
                                <defs>
                                    <linearGradient id="rack-metal" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#374151" />
                                        <stop offset="100%" stopColor="#1F2937" />
                                    </linearGradient>
                                    <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4B5563" strokeWidth="0.5"/>
                                    </pattern>
                                </defs>
                                
                                {/* Main Chassis */}
                                <rect x="2" y="2" width="516" height="396" rx="16" fill="#111827" stroke="#000" strokeWidth="2" />
                                <rect x="10" y="10" width="500" height="380" rx="8" fill="url(#rack-metal)" stroke="#4B5563" strokeWidth="1" />
                                
                                {/* Screen Bezel */}
                                <rect x="24" y="80" width="472" height="300" rx="4" fill="#000" stroke="#111827" strokeWidth="2" />
                                
                                {/* Screen Area */}
                                <rect x="32" y="88" width="456" height="284" rx="2" fill="#1F2937" />
                                <rect x="32" y="88" width="456" height="284" rx="2" fill="url(#grid-pattern)" opacity="0.2" />
                                
                                {/* Header / Top Panel */}
                                <rect x="24" y="24" width="472" height="44" rx="4" fill="#111827" stroke="#000" strokeWidth="1" />
                                
                                {/* Decorative Screws */}
                                <circle cx="20" cy="20" r="4" fill="#6B7280" /> <path d="M18 18L22 22M22 18L18 22" stroke="#374151" strokeWidth="1" />
                                <circle cx="500" cy="20" r="4" fill="#6B7280" /> <path d="M498 18L502 22M502 18L498 22" stroke="#374151" strokeWidth="1" />
                                <circle cx="20" cy="380" r="4" fill="#6B7280" /> <path d="M18 378L22 382M22 378L18 382" stroke="#374151" strokeWidth="1" />
                                <circle cx="500" cy="380" r="4" fill="#6B7280" /> <path d="M498 378L502 382M502 378L498 382" stroke="#374151" strokeWidth="1" />
                                
                                {/* Label */}
                                <text x="260" y="20" textAnchor="middle" fill="#4B5563" fontSize="6" fontFamily="monospace" letterSpacing="2">SEQUENCE CALENDAR</text>
                            </svg>
                            
                            {/* Screen Content Container - Absolutely positioned to match the screen rect */}
                            <div style={{
                                position: 'absolute',
                                top: '22%',    // 88 / 400
                                left: '6.15%', // 32 / 520
                                width: '87.7%', // 456 / 520
                                height: '71%',  // 284 / 400
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                padding: '4% 4% 2%' // Internal padding
                            }}>
                                {/* Controls Row */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '4%'
                                }}>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}
                                        style={{
                                            padding: '2% 5%',
                                            borderRadius: 4,
                                            background: '#374151',
                                            color: '#E5E5E5',
                                            fontSize: 'clamp(8px, 2vw, 10px)',
                                            fontWeight: 700,
                                            boxShadow: '0 2px 0 #000',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        PREV
                                    </button>
                                    <div className="font-display" style={{ 
                                        fontSize: 'clamp(12px, 3.5vw, 16px)', 
                                        fontWeight: 900, 
                                        letterSpacing: '0.2em', 
                                        color: '#EAB308', 
                                        textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' 
                                    }}>
                                        {calendarLabel}
                                    </div>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}
                                        style={{
                                            padding: '2% 5%',
                                            borderRadius: 4,
                                            background: '#374151',
                                            color: '#E5E5E5',
                                            fontSize: 'clamp(8px, 2vw, 10px)',
                                            fontWeight: 700,
                                            boxShadow: '0 2px 0 #000',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        NEXT
                                    </button>
                                </div>
                                
                                {/* Calendar Grid */}
                                <div style={{
                                    flex: 1,
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gridTemplateRows: 'auto repeat(6, 1fr)', // Header row + up to 6 weeks
                                    gap: '1%',
                                    height: '100%',
                                    alignContent: 'start'
                                }}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                        <div key={day} className="font-mono" style={{
                                            fontSize: 'clamp(8px, 2vw, 10px)',
                                            letterSpacing: '0.1em',
                                            textAlign: 'center',
                                            fontWeight: 700,
                                            color: '#6B7280',
                                            alignSelf: 'end',
                                            paddingBottom: 4
                                        }}>
                                            {day}
                                        </div>
                                    ))}
                                    {calendarDays.map((day, index) => {
                                        if (!day) {
                                            return <div key={`blank-${index}`} />;
                                        }
                                        const dayDate = new Date(calendarYear, calendarMonthIndex, day);
                                        const dayKey = `${calendarYear}-${calendarMonthIndex}-${day}`;
                                        const count = songsByDay.get(dayKey) || 0;
                                        const isActive = isSameDay(dayDate, activeDate);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setActiveDate(dayDate)}
                                                style={{
                                                    position: 'relative',
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: 4,
                                                    background: isActive ? '#EAB308' : (count > 0 ? '#374151' : 'transparent'),
                                                    color: isActive ? '#000' : (count > 0 ? '#fff' : '#9CA3AF'),
                                                    border: isActive ? 'none' : '1px solid #374151',
                                                    fontSize: 'clamp(9px, 2.5vw, 12px)',
                                                    fontWeight: 700,
                                                    transition: 'all 0.2s ease',
                                                    padding: 0,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {day}
                                                {count > 0 && !isActive && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '10%',
                                                        right: '10%',
                                                        width: '15%',
                                                        height: '15%',
                                                        borderRadius: '50%',
                                                        background: '#EAB308',
                                                        boxShadow: '0 0 4px #EAB308'
                                                    }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            background: '#1F2937',
                            border: '2px solid #000',
                            boxShadow: '6px 6px 0 var(--black)',
                            padding: 16,
                            borderRadius: 8
                        }}>
                            <div className="font-display" style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 10, color: '#EAB308' }}>
                                {activeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            {activeSongs.length === 0 ? (
                                <div className="font-mono" style={{ fontSize: 10, color: '#9CA3AF' }}>
                                    NO SONGS LOGGED FOR THIS DAY.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {activeSongs.map(song => (
                                        <button
                                            key={song.id}
                                            onClick={() => {
                                                onEditSong(song);
                                                setShowCalendar(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '10px 12px',
                                                border: '1px solid #4B5563',
                                                background: '#111827',
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 700
                                            }}
                                        >
                                            <span>{song.title || 'UNTITLED SONG'}</span>
                                            <span className="font-mono" style={{ fontSize: 9, color: '#6B7280' }}>
                                                {formatTime(song.updated_at || song.created_at)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCalendar(false)}
                            style={{
                                alignSelf: 'center',
                                padding: '10px 16px',
                                borderRadius: 20,
                                background: '#EAB308',
                                color: '#000',
                                border: '2px solid #000',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: '0.1em',
                                boxShadow: '0 4px 0 rgba(0,0,0,0.5)'
                            }}
                        >
                            CLOSE CALENDAR
                        </button>
                    </div>
                </div>
            )}

            <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 20,
                position: 'relative', // Ensure above background
                zIndex: 10
            }}>
                {songs.length === 0 ? (
                    <div style={{ padding: '60px 0', textAlign: 'center', opacity: 0.8, color: 'var(--black)', background: 'rgba(255,255,255,0.7)', borderRadius: 12, backdropFilter: 'blur(4px)', width: '80%' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                            <div style={{ width: 60, height: 60, border: '2px solid var(--black)', backgroundImage: 'url(images/newspaper-sprites.png)', backgroundSize: '200% 200%', backgroundPosition: '0% 0%' }}></div>
                        </div>
                        <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>NO NEWS IS GOOD NEWS</div>
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
                        const layout = spriteLayouts[spriteIndex] || spriteLayouts[0];
                        const paddingConfig = layout.padding;
                        const translateX = layout.translateX || 0;
                        const rotation = (layout.rotation || 0) + (i % 2 === 0 ? -0.35 : 0.35);

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
                                    transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
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
                                            {snippet || "No content available for this song. Tap to write..."}
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                            <span className="crate-meta-pill"><Icon name="Building2" size={12} /> {song.studio || 'No studio logged'}</span>
                                            <span className="crate-meta-pill"><Icon name="BadgeCheck" size={12} /> {song.producer || 'Producer TBD'}</span>
                                            <span className="crate-meta-pill"><Icon name="Music" size={12} /> {song.key || 'Key open'}</span>
                                            <span className="crate-meta-pill"><Icon name="Activity" size={12} /> {song.bpm ? `${song.bpm} BPM` : 'BPM free'}</span>
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
                padding: '16px 16px 16px 16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
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
                        <div style={{ background: 'var(--electric)', padding: 12, margin: -8 }}>
                            <RhymeTextarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                autoFocus
                                className="font-serif rhyme-editor-active"
                                style={{
                                    width: '100%', minHeight: 200, fontSize: 20, lineHeight: 1.6
                                }}
                            />
                        </div>
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
                            marginTop: 20
                        }}>
                            <div style={{ 
                                fontSize: 9, 
                                fontWeight: 700, 
                                letterSpacing: '0.15em', 
                                marginBottom: 8,
                                color: 'var(--gray)'
                            }}>
                                VOICE MEMO
                            </div>
                            {window.VinylAudioPlayer ? (
                                <window.VinylAudioPlayer src={bar.audioUrl} />
                            ) : (
                                <audio src={bar.audioUrl} controls style={{ width: '100%', height: 40 }} />
                            )}
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

const TrackEditor = ({ song, onClose, onSave, isPremium, canUseAI, onAIUse, onPremiumRequired, user }) => {
    const [title, setTitle] = useState(song?.title || 'UNTITLED');
    const [blocks, setBlocks] = useState(song?.blocks || []);
    const [status, setStatus] = useState(song?.status || 'draft');
    const [coverImage, setCoverImage] = useState(song?.coverImage || null);
    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const [studio, setStudio] = useState(song?.studio || '');
    const [producer, setProducer] = useState(song?.producer || '');
    const [otherArtists, setOtherArtists] = useState(song?.otherArtists || '');
    const [songKey, setSongKey] = useState(song?.key || '');
    const [bpm, setBpm] = useState(song?.bpm ? String(song?.bpm) : '');
    const [sessionDetailsOpen, setSessionDetailsOpen] = useState(true);

    const [beatUrl, setBeatUrl] = useState(song?.beatUrl || '');
    const [videoUrl, setVideoUrl] = useState(song?.videoUrl || '');
    const [beatPlaying, setBeatPlaying] = useState(false);
    const [showBeatLocker, setShowBeatLocker] = useState(false);
    const [beatUrlInput, setBeatUrlInput] = useState('');
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const beatAudioRef = useRef(null);
    const [rhymePopup, setRhymePopup] = useState({ show: false, word: '', position: { x: 0, y: 0 }, blockIndex: null });
    const [recordingBlockIndex, setRecordingBlockIndex] = useState(null);
    const { isRecording, audioUrl, duration, error: recordError, startRecording, stopRecording, clearRecording, getBase64 } = useVoiceRecorder(30000);
    
    // Collaboration state
    const [showCollabModal, setShowCollabModal] = useState(false);
    const [collaborators, setCollaborators] = useState([]);
    const [collabLink, setCollabLink] = useState('');
    const [activeUsers, setActiveUsers] = useState([]);
    const realtimeChannel = useRef(null);
    const presenceChannel = useRef(null);
    
    const toast = useToast();
    
    // Set up real-time collaboration
    useEffect(() => {
        if (!song?.id) return;
        
        // Subscribe to song changes
        realtimeChannel.current = window.DailyDepositEngine.subscribeToSong(song.id, (updatedSong) => {
            // Only update if change came from another user
            if (updatedSong.updated_by !== user?.id) {
                setTitle(updatedSong.title || 'UNTITLED');
                setBlocks(updatedSong.blocks || []);
                setCoverImage(updatedSong.cover_image || null);
                setBeatUrl(updatedSong.beat_url || '');
                setVideoUrl(updatedSong.video_url || '');
                setOtherArtists(updatedSong.otherArtists || '');
                toast?.addToast('TRACK UPDATED BY COLLABORATOR', 'info');
                haptic('light');
            }
        });
        
        // Join presence channel to see who's online
        const setupPresence = async () => {
            presenceChannel.current = await window.DailyDepositEngine.joinSongSession(
                song.id, 
                user?.id, 
                user?.username
            );
            
            // Listen for presence changes
            presenceChannel.current.on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.current.presenceState();
                const users = Object.values(state).flat().map(p => ({
                    id: p.user_id,
                    username: p.username,
                    online_at: p.online_at
                }));
                setActiveUsers(users);
            });
        };
        
        setupPresence();
        
        // Load collaborators
        window.DailyDepositEngine.getSongCollaborators(song.id).then(setCollaborators);
        
        return () => {
            // Cleanup subscriptions
            if (realtimeChannel.current) {
                window.DailyDepositEngine.unsubscribeFromSong(realtimeChannel.current);
            }
            if (presenceChannel.current) {
                presenceChannel.current.unsubscribe();
            }
        };
    }, [song?.id, user?.id, user?.username]);
    
    // Generate collaboration link
    const handleCreateCollabLink = async () => {
        try {
            const link = await window.DailyDepositEngine.createCollabLink(song.id, user?.id);
            setCollabLink(link);
            haptic('success');
        } catch (err) {
            toast?.addToast('FAILED TO CREATE LINK', 'error');
        }
    };
    
    const copyCollabLink = async () => {
        if (collabLink) {
            await navigator.clipboard.writeText(collabLink);
            toast?.addToast('LINK COPIED!', 'success');
            haptic('success');
        }
    };
    
    const addBlock = (type, options = {}) => {
        setBlocks([
            ...blocks,
            {
                id: generateId(),
                type,
                content: options.content ?? '',
                label: options.label,
                placeholder: options.placeholder,
                source: options.source
            }
        ]);
        haptic('medium');
    };
    const updateBlock = (idx, content) => { const newBlocks = [...blocks]; newBlocks[idx].content = content; setBlocks(newBlocks); };
    const deleteBlock = (idx) => { setBlocks(blocks.filter((_, i) => i !== idx)); };
    
    const moveBlock = (idx, direction) => {
        if (direction === 'up' && idx > 0) {
            const newBlocks = [...blocks];
            [newBlocks[idx], newBlocks[idx - 1]] = [newBlocks[idx - 1], newBlocks[idx]];
            setBlocks(newBlocks);
            haptic('light');
        } else if (direction === 'down' && idx < blocks.length - 1) {
            const newBlocks = [...blocks];
            [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
            setBlocks(newBlocks);
            haptic('light');
        }
    };
    
    const handleAI = async (mode) => {
        if (canUseAI && !canUseAI()) {
            toast?.addToast('PREMIUM REQUIRED', 'error');
            onPremiumRequired?.('AI tools are limited to premium after 3 runs.');
            return;
        }
        onAIUse?.();
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
            setBlocks(prev => [...prev, { id: generateId(), type: 'text', content: result, source: 'ai' }]);
            toast?.addToast('GENERATED', 'success');
        }
        setAiLoading(false);
    };

    const handleWordDoubleTap = useCallback(({ word, position, blockIndex }) => {
        if (word && word.length >= 2) {
            setRhymePopup({
                show: true,
                word,
                position,
                blockIndex
            });
        }
    }, []);

    const handleRhymeSelect = (rhyme) => {
        setBlocks(prev => prev.map((block, idx) => {
            if (idx !== rhymePopup.blockIndex) return block;
            const needsSpace = block.content && !block.content.endsWith(' ');
            return { ...block, content: `${block.content || ''}${needsSpace ? ' ' : ''}${rhyme}` };
        }));
        setRhymePopup({ show: false, word: '', position: { x: 0, y: 0 }, blockIndex: null });
        toast?.addToast(`ADDED: ${rhyme.toUpperCase()}`, 'success');
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

    const handleBlockAudioUpload = async (idx, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name?.toLowerCase() || '';
        const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.webm', '.flac', '.aiff'];
        const hasAudioExtension = audioExtensions.some(ext => fileName.endsWith(ext));
        const isAudioMime = file.type?.startsWith('audio/');

        if (!isAudioMime && !hasAudioExtension) {
            toast?.addToast('AUDIO FILES ONLY', 'error');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = () => {
                updateBlock(idx, reader.result);
                haptic('success');
                toast?.addToast('VOICE NOTE ADDED', 'success');
            };
            reader.onerror = () => toast?.addToast('UPLOAD FAILED', 'error');
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Audio upload failed', err);
            toast?.addToast('UPLOAD FAILED', 'error');
        }
    };

    const handleStartBlockRecording = async (idx) => {
        if (isRecording) return;
        clearRecording();
        setRecordingBlockIndex(idx);
        await startRecording();
        haptic('medium');
    };

    const handleStopBlockRecording = () => {
        if (isRecording) {
            stopRecording();
        }
    };

    const handleSaveBlockRecording = async (idx) => {
        if (!audioUrl || recordingBlockIndex !== idx) return;
        try {
            const base64 = await getBase64();
            updateBlock(idx, base64);
            clearRecording();
            setRecordingBlockIndex(null);
            haptic('success');
            toast?.addToast('VOICE NOTE ADDED', 'success');
        } catch (err) {
            toast?.addToast('SAVE FAILED', 'error');
        }
    };

    const handleDiscardBlockRecording = () => {
        clearRecording();
        setRecordingBlockIndex(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                ...song,
                title,
                blocks,
                status,
                coverImage,
                beatUrl,
                videoUrl,
                studio,
                producer,
                otherArtists,
                key: songKey,
                bpm: bpm ? parseInt(bpm, 10) : null,
                updated_by: user?.id // Track who made the update for realtime
            });
            toast?.addToast('SAVED', 'success');
        } catch { toast?.addToast('SAVE FAILED', 'error'); }
        setSaving(false);
    };
    
    const handleBeatUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Check by file extension as fallback (Safari/iOS doesn't always report MIME type)
        const fileName = file.name?.toLowerCase() || '';
        const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.webm', '.flac', '.aiff', '.mp4'];
        const hasAudioExtension = audioExtensions.some(ext => fileName.endsWith(ext));
        const isAudioMime = file.type?.startsWith('audio/') || file.type === 'video/mp4';
        
        if (!isAudioMime && !hasAudioExtension) {
            toast?.addToast('AUDIO FILES ONLY', 'error');
            return;
        }
        
        // Check if user can upload (premium/admin)
        const canUpload = await window.DailyDepositEngine.canUploadBeats(user?.id);
        if (!canUpload) {
            toast?.addToast('PREMIUM REQUIRED', 'error');
            onPremiumRequired?.('Uploading beats to save with your track is a premium perk.');
            return;
        }

        try {
            toast?.addToast('UPLOADING BEAT...', 'info');
            
            // Simple metadata - just use filename
            const beatMetadata = {
                title: file.name.replace(/\.[^.]+$/, '')
            };
            
            // Upload to Supabase Storage with timeout
            const uploadPromise = window.DailyDepositEngine.uploadBeat(
                user?.id,
                file,
                song?.id,
                beatMetadata
            );
            const uploadTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Upload timed out. Please try again.')), 60000)
            );
            
            const result = await Promise.race([uploadPromise, uploadTimeoutPromise]);
            
            if (result && result.success) {
                setBeatUrl(result.url);
                setShowBeatLocker(false);
                haptic('success');
                toast?.addToast('BEAT UPLOADED!', 'success');
                
                // Auto-save the song with the new beat URL
                try {
                    await onSave({
                        ...song,
                        title,
                        blocks,
                        status,
                        coverImage,
                        beatUrl: result.url,
                        videoUrl,
                        studio,
                        producer,
                        otherArtists,
                        key: songKey,
                        bpm: bpm ? parseInt(bpm, 10) : null,
                        updated_by: user?.id
                    });
                    toast?.addToast('SONG SAVED!', 'success');
                } catch (saveErr) {
                    console.error('Failed to save song with beat:', saveErr);
                }
            } else {
                throw new Error(result?.error || 'Upload failed. Check storage config.');
            }
        } catch (err) {
            console.error('Beat upload failed:', err);
            
            // Check for RLS policy error (Supabase storage not configured)
            const isRLSError = err.message?.includes('row-level security') || 
                              err.message?.includes('StorageApiError') ||
                              err.message?.includes('policy');
            
            if (isRLSError) {
                console.warn('⚠️ Supabase Storage RLS not configured. Using local storage fallback.');
                console.info('To fix: Configure storage bucket RLS policies in Supabase dashboard.');
            }
            
            // Always try local storage fallback first (up to 15MB for mobile)
            const maxLocalSize = 15 * 1024 * 1024; // 15MB
            if (file.size <= maxLocalSize) {
                try {
                    toast?.addToast('SAVING LOCALLY...', 'info');
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    setBeatUrl(dataUrl);
                    setShowBeatLocker(false);
                    haptic('success');
                    toast?.addToast('BEAT SAVED!', 'success');
                    
                    // Auto-save the song with the local beat URL
                    try {
                        await onSave({
                            ...song,
                            title,
                            blocks,
                            status,
                            coverImage,
                            beatUrl: dataUrl,
                            videoUrl,
                            studio,
                            producer,
                            otherArtists,
                            key: songKey,
                            bpm: bpm ? parseInt(bpm, 10) : null,
                            updated_by: user?.id
                        });
                    } catch (saveErr) {
                        console.error('Failed to save song with local beat:', saveErr);
                    }
                    return; // Success with local fallback
                } catch (e) {
                    console.error('Local storage fallback failed:', e);
                }
            }
            
            // Show appropriate error message
            if (file.size > maxLocalSize) {
                toast?.addToast('FILE TOO LARGE (MAX 15MB)', 'error');
            } else {
                toast?.addToast('UPLOAD FAILED', 'error');
            }
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

    const handleVideoUrlSet = () => {
        if (videoUrlInput.trim()) {
            // Basic YouTube ID extraction
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = videoUrlInput.match(regExp);
            
            if (match && match[2].length === 11) {
                const embedUrl = `https://www.youtube.com/embed/${match[2]}`;
                setVideoUrl(embedUrl);
                setVideoUrlInput('');
                setShowBeatLocker(false);
                haptic('success');
                toast?.addToast('VIDEO LINKED!', 'success');
            } else {
                toast?.addToast('INVALID YOUTUBE LINK', 'error');
            }
        }
    };
    
    // --- PDF EXPORT FUNCTION ---
    const handlePDFExport = async () => {
        if (!blocks.length && !coverImage) {
            toast?.addToast('NOTHING TO EXPORT', 'error');
            return;
        }
        
        toast?.addToast('GENERATING PDF...', 'info');

        // Ensure jsPDF is loaded
        if (!window.jspdf) {
             console.log('⚠️ jsPDF not found, attempting dynamic load...');
             try {
                 await new Promise((resolve, reject) => {
                     const script = document.createElement('script');
                     script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
                     script.onload = resolve;
                     script.onerror = () => reject(new Error("Script load failed"));
                     document.head.appendChild(script);
                 });
             } catch (e) {
                 console.error("Failed to load jsPDF:", e);
                 toast?.addToast('PDF LIB FAILED TO LOAD', 'error');
                 return;
             }
        }

        if (!window.jspdf) {
            toast?.addToast('PDF LIB MISSING', 'error');
            return;
        }
        
        // Create hidden container for PDF layout
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '0';
        container.style.width = '800px'; // Approx A4 width at 96 DPI
        container.style.background = '#f4f4f0'; // Paper color
        container.style.color = '#000';
        container.style.fontFamily = "'Courier Prime', 'IBM Plex Mono', monospace";
        container.style.padding = '40px';
        container.style.boxSizing = 'border-box';
        
        // Title
        const titleEl = document.createElement('h1');
        titleEl.textContent = title || 'UNTITLED';
        titleEl.style.fontFamily = "'Playfair Display', serif";
        titleEl.style.fontSize = '48px';
        titleEl.style.fontWeight = '700';
        titleEl.style.fontStyle = 'italic';
        titleEl.style.textAlign = 'center';
        titleEl.style.margin = '0 0 10px 0';
        titleEl.style.textTransform = 'uppercase';
        container.appendChild(titleEl);
        
        // Metadata
        const metaEl = document.createElement('div');
        metaEl.style.textAlign = 'center';
        metaEl.style.fontSize = '12px';
        metaEl.style.marginBottom = '40px';
        metaEl.style.borderBottom = '2px solid #000';
        metaEl.style.paddingBottom = '20px';
        metaEl.style.letterSpacing = '0.1em';
        metaEl.style.textTransform = 'uppercase';
        metaEl.innerHTML = `
            ${new Date().toLocaleDateString()} • ${studio || 'NO STUDIO'} • ${producer || 'NO PRODUCER'} • ${songKey || 'KEY?'} • ${bpm || '?'} BPM
        `;
        container.appendChild(metaEl);
        
        // Cover Image
        if (coverImage) {
            const imgContainer = document.createElement('div');
            imgContainer.style.marginBottom = '40px';
            imgContainer.style.textAlign = 'center';
            
            const img = document.createElement('img');
            img.src = coverImage;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '400px';
            img.style.border = '4px solid #000';
            img.style.filter = 'grayscale(100%) contrast(1.1)';
            
            imgContainer.appendChild(img);
            container.appendChild(imgContainer);
        }
        
        // Blocks
        blocks.forEach(block => {
            const blockEl = document.createElement('div');
            blockEl.style.marginBottom = '24px';
            
            if (block.type === 'heading') {
                blockEl.textContent = block.content;
                blockEl.style.fontFamily = "'Archivo Black', sans-serif";
                blockEl.style.fontSize = '24px';
                blockEl.style.fontWeight = '900';
                blockEl.style.textTransform = 'uppercase';
                blockEl.style.borderBottom = '2px solid #000';
                blockEl.style.paddingBottom = '4px';
                blockEl.style.marginTop = '32px';
            } else if (block.type === 'text') {
                blockEl.textContent = block.content;
                blockEl.style.whiteSpace = 'pre-wrap';
                blockEl.style.fontSize = '14px';
                blockEl.style.lineHeight = '1.6';
            } else if (block.type === 'image' && block.content) {
                const bImg = document.createElement('img');
                bImg.src = block.content;
                bImg.style.maxWidth = '100%';
                bImg.style.border = '2px solid #000';
                bImg.style.filter = 'grayscale(100%)';
                blockEl.appendChild(bImg);
            } else if (block.type === 'audio' && block.content) {
                const audioBadge = document.createElement('div');
                audioBadge.textContent = '🎤 VOICE NOTE ATTACHED';
                audioBadge.style.display = 'inline-block';
                audioBadge.style.padding = '6px 10px';
                audioBadge.style.border = '2px solid #000';
                audioBadge.style.fontFamily = "'Archivo Black', sans-serif";
                audioBadge.style.fontSize = '12px';
                audioBadge.style.letterSpacing = '0.1em';
                audioBadge.style.background = '#fef3c7';
                blockEl.appendChild(audioBadge);
            } else if (block.type === 'divider') {
                blockEl.style.textAlign = 'center';
                blockEl.style.fontSize = '12px';
                blockEl.style.letterSpacing = '0.2em';
                blockEl.style.opacity = '0.5';
                blockEl.textContent = '— • —';
            }
            
            container.appendChild(blockEl);
        });
        
        // Footer
        const footerEl = document.createElement('div');
        footerEl.style.marginTop = '60px';
        footerEl.style.textAlign = 'center';
        footerEl.style.fontSize = '10px';
        footerEl.style.opacity = '0.6';
        footerEl.textContent = 'GENERATED WITH DAILY BARS // GUAPDAD 4000';
        container.appendChild(footerEl);
        
        document.body.appendChild(container);
        
        try {
            // Wait for images to load? They are base64 so should be instant
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f4f4f0'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Access jsPDF safely
            const jsPDF = window.jspdf.jsPDF;
            if (!jsPDF) throw new Error("jsPDF constructor not found");
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Handle multi-page
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'track'}_export.pdf`);
            haptic('success');
            toast?.addToast('PDF DOWNLOADED!', 'success');
            
        } catch (err) {
            console.error('PDF Export Error:', err);
            toast?.addToast('PDF EXPORT FAILED', 'error');
        } finally {
            document.body.removeChild(container);
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

    const clearVideo = () => {
        setVideoUrl('');
        haptic('light');
    };
    
    useEffect(() => {
        if (beatAudioRef.current) {
            beatAudioRef.current.loop = true;
        }
    }, [beatUrl]);

    const userBlockOptions = [
        { type: 'text', icon: 'FileText', label: 'VERSE', placeholder: 'WRITE YOUR VERSE...', tag: 'VERSE' },
        { type: 'text', icon: 'Music', label: 'HOOK', placeholder: 'WRITE YOUR HOOK...', tag: 'HOOK' },
        { type: 'text', icon: 'Activity', label: 'BRIDGE', placeholder: 'WRITE YOUR BRIDGE...', tag: 'BRIDGE' },
        { type: 'heading', icon: 'Type', label: 'TITLE' },
        { type: 'image', icon: 'Image', label: 'IMG' },
        { type: 'audio', icon: 'Mic', label: 'AUDIO' },
        { type: 'divider', icon: 'Minus', label: 'BREAK' }
    ];
    
    return (
        <div style={{ position: 'fixed', inset: 0, backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            {beatUrl && (
                <audio ref={beatAudioRef} src={beatUrl} loop onEnded={() => setBeatPlaying(false)} />
            )}
            
            <button onClick={onClose} style={{
                position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', left: 16, zIndex: 102,
                width: 40, height: 40, background: 'var(--white)', border: '2px solid var(--black)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}><Icon name="ArrowLeft" size={20} /></button>
            
            {/* Active collaborators indicator */}
            {activeUsers.length > 1 && (
                <div style={{
                    position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 102, display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', background: 'var(--electric)', border: '2px solid var(--black)',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.05em'
                }}>
                    <span className="animate-pulse" style={{ width: 8, height: 8, background: '#22C55E', borderRadius: '50%' }} />
                    {activeUsers.length} WRITERS LIVE
                </div>
            )}
            
            <button onClick={() => setShowCollabModal(true)} style={{
                position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', right: 130, zIndex: 102,
                padding: '10px 12px', background: 'var(--electric)', color: 'var(--black)',
                border: '2px solid var(--black)', fontSize: 10, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6
            }}>
                <Icon name="Users" size={14} />
            </button>
            
            <button onClick={handlePDFExport} style={{
                position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', right: 80, zIndex: 102,
                padding: '10px 12px', background: 'var(--white)', color: 'var(--black)',
                border: '2px solid var(--black)', fontSize: 10, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 6
            }}>
                <Icon name="FileText" size={14} />
            </button>
            
            <button onClick={handleSave} disabled={saving} style={{
                position: 'fixed', top: 'calc(env(safe-area-inset-top) + 16px)', right: 16, zIndex: 102,
                padding: '10px 16px', background: 'var(--brand-green)', color: 'var(--white)',
                border: '2px solid var(--black)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: saving ? 0.7 : 1
            }}>{saving ? 'SAVING...' : 'SAVE'}</button>
            
            {/* COLLABORATION MODAL */}
            {showCollabModal && (
                <div 
                    className="animate-fade-in"
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                    }}
                >
                    <div 
                        className="animate-scale-in"
                        style={{
                            width: '100%', maxWidth: 380,
                            backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover',
                            border: '3px solid var(--black)', boxShadow: '8px 8px 0 var(--black)'
                        }}
                    >
                        <div style={{
                            background: 'var(--crates-blue)', color: 'var(--white)', padding: 16,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '3px solid var(--black)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon name="Users" size={24} />
                                <span className="font-display" style={{ fontSize: 16, fontWeight: 900 }}>COLLABORATE</span>
                            </div>
                            <button onClick={() => setShowCollabModal(false)}>
                                <Icon name="X" size={20} color="white" />
                            </button>
                        </div>
                        
                        <div style={{ padding: 20 }}>
                            {/* Active Users */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                                    LIVE NOW ({activeUsers.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {activeUsers.map((u, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '6px 10px', background: 'var(--white)',
                                            border: '1px solid var(--black)', fontSize: 10
                                        }}>
                                            <span style={{ width: 8, height: 8, background: '#22C55E', borderRadius: '50%' }} />
                                            @{u.username || 'Guest'}
                                        </div>
                                    ))}
                                    {activeUsers.length === 0 && (
                                        <div style={{ fontSize: 10, color: 'var(--gray)' }}>Just you right now</div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Invite Link */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                                    INVITE COLLABORATORS
                                </div>
                                {collabLink ? (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input 
                                            value={collabLink} 
                                            readOnly 
                                            style={{
                                                flex: 1, padding: 10, border: '2px solid var(--black)',
                                                fontSize: 9, fontFamily: 'monospace', background: 'var(--white)'
                                            }}
                                        />
                                        <button onClick={copyCollabLink} style={{
                                            padding: '10px 14px', background: 'var(--black)', color: 'var(--white)',
                                            fontWeight: 700, fontSize: 10
                                        }}>COPY</button>
                                    </div>
                                ) : (
                                    <button onClick={handleCreateCollabLink} style={{
                                        width: '100%', padding: 14, background: 'var(--electric)',
                                        border: '2px solid var(--black)', fontSize: 11, fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}>
                                        <Icon name="Link" size={16} /> GENERATE INVITE LINK
                                    </button>
                                )}
                                <div style={{ fontSize: 9, color: 'var(--gray)', marginTop: 8 }}>
                                    Link expires in 7 days. Anyone with link can edit.
                                </div>
                            </div>
                            
                            {/* Collaborators List */}
                            {collaborators.length > 0 && (
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 10 }}>
                                        COLLABORATORS ({collaborators.length})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {collaborators.map((c, i) => (
                                            <div key={i} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '8px 10px', background: 'var(--white)', border: '1px solid var(--light-gray)'
                                            }}>
                                                <span style={{ fontSize: 11 }}>@{c.username || 'Anonymous'}</span>
                                                <span style={{ fontSize: 9, color: 'var(--gray)', textTransform: 'uppercase' }}>{c.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* BEAT LOCKER MODAL */}
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
                            backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                            backgroundSize: 'cover',
                            border: '3px solid var(--black)',
                            boxShadow: '8px 8px 0 var(--black)'
                        }}
                    >
                        <div style={{
                            background: '#EF4444',
                            color: 'var(--white)',
                            padding: 16,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '3px solid var(--black)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon name="Headphones" size={24} />
                                <span className="font-display" style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>BEAT LOCKER</span>
                            </div>
                            <button onClick={() => setShowBeatLocker(false)}>
                                <Icon name="X" size={20} color="white" />
                            </button>
                        </div>
                        
                        <div style={{ padding: 20 }}>
                            {/* MP3 Section */}
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 24,
                                border: '2px dashed var(--black)',
                                cursor: 'pointer',
                                gap: 10,
                                marginBottom: 16,
                                background: 'rgba(255,255,255,0.5)'
                            }}>
                                <Icon name="Upload" size={32} style={{ opacity: 0.5 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>UPLOAD MP3 FILE</span>
                                <span style={{ fontSize: 9, color: 'var(--gray)' }}>Local file, loops forever</span>
                                <input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.webm,.flac,.aiff,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/ogg,audio/webm,audio/flac" onChange={handleBeatUpload} style={{ display: 'none' }} />
                            </label>
                            
                            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                                <input 
                                    value={beatUrlInput}
                                    onChange={(e) => setBeatUrlInput(e.target.value)}
                                    placeholder="PASTE MP3 URL..."
                                    className="font-mono"
                                    style={{
                                        flex: 1,
                                        padding: 12,
                                        border: '2px solid var(--black)',
                                        fontSize: 11,
                                        background: 'var(--white)'
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

                            <div style={{ height: 1, background: 'var(--black)', margin: '0 0 24px', opacity: 0.2 }}></div>

                            {/* YouTube Section */}
                            <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>ADD YOUTUBE VIDEO</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input 
                                    value={videoUrlInput}
                                    onChange={(e) => setVideoUrlInput(e.target.value)}
                                    placeholder="PASTE YOUTUBE LINK..."
                                    className="font-mono"
                                    style={{
                                        flex: 1,
                                        padding: 12,
                                        border: '2px solid var(--black)',
                                        fontSize: 11,
                                        background: 'var(--white)'
                                    }}
                                />
                                <button 
                                    onClick={handleVideoUrlSet}
                                    style={{
                                        padding: '12px 16px',
                                        background: '#FF0000',
                                        color: 'var(--white)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        border: '2px solid var(--black)'
                                    }}
                                >ADD</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ borderBottom: '2px solid var(--black)', backgroundImage: 'url(images/smooth-paper-texture.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', paddingTop: 'max(60px, calc(env(safe-area-inset-top) + 50px))' }}>
                {/* Media Area: Radio (Left) & Video (Right) */}
                <div style={{ 
                    borderTop: '2px solid var(--black)',
                    display: 'flex',
                    height: 180, // Increased height for spacing
                    background: 'transparent',
                    position: 'relative'
                }}>
                    {/* LEFT: Radio Beat Player - Full width if no video, 50% if video */}
                    <div style={{ 
                        width: videoUrl ? '50%' : '100%',
                        borderRight: videoUrl ? '2px solid var(--black)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 12px 12px', // Added top padding to prevent clipping
                        position: 'relative',
                        transition: 'width 0.3s ease'
                    }}>
                        <div style={{ 
                            width: '100%', 
                            flex: 1,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Radio Widget - Centered */}
                            <div 
                                onClick={beatUrl ? toggleBeat : () => setShowBeatLocker(true)}
                                style={{
                                    width: '100%',
                                    maxWidth: videoUrl ? '100%' : '300px', // Constrain width when centered alone
                                    height: '100%',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    pointerEvents: 'auto'
                                }}
                            >
                                <RadioWidget isPlaying={beatPlaying} />
                            </div>

                            {/* Eject Button (Mini) */}
                            {beatUrl && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); clearBeat(); }}
                                    style={{
                                        position: 'absolute', top: -4, right: -4,
                                        background: 'var(--black)', color: 'var(--white)',
                                        width: 20, height: 20, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 20, border: '1px solid var(--white)'
                                    }}
                                >
                                    <Icon name="X" size={12} />
                                </button>
                            )}

                            {/* Text Overlay - Positioned over the radio */}
                            <div 
                                style={{ 
                                    position: 'absolute',
                                    bottom: '20%', // ~Quarter up from bottom
                                    left: 0, 
                                    right: 0,
                                    textAlign: 'center',
                                    pointerEvents: 'none', // Let clicks pass through to radio
                                    zIndex: 10
                                }}
                            >
                                <span style={{
                                    fontSize: 9, 
                                    fontWeight: 900, 
                                    letterSpacing: '0.1em',
                                    color: 'var(--black)',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    padding: '2px 6px',
                                    borderRadius: 2,
                                    backdropFilter: 'blur(2px)'
                                }}>
                                    {!beatUrl ? "OPEN BEAT LOCKER" : (beatPlaying ? "NOW PLAYING" : "CLICK TO PLAY")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Video Player - Only visible if videoUrl exists */}
                    {videoUrl && (
                        <div style={{ 
                            width: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            background: '#000'
                        }}>
                            <iframe 
                                src={videoUrl} 
                                style={{ width: '100%', height: '100%', border: 'none' }} 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            />
                            
                            <button 
                                onClick={clearVideo}
                                style={{
                                    position: 'absolute', top: 4, right: 4,
                                    background: 'rgba(0,0,0,0.6)', color: 'var(--white)',
                                    width: 24, height: 24, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 20, border: '1px solid var(--white)'
                                }}
                            >
                                <Icon name="X" size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Title Input */}
                <div style={{ padding: '12px 16px 12px', background: 'rgba(255,255,255,0.5)', borderTop: '2px solid var(--black)' }}>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="TRACK TITLE"
                        className="font-display" style={{ 
                            width: '100%', 
                            fontSize: 28, 
                            fontWeight: 900, 
                            textTransform: 'uppercase', 
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none'
                        }} 
                    />
                </div>
            </header>
            
            <div className="scrollable" style={{ flex: 1, paddingBottom: 220 }}>
                {/* 1. Cover Art */}
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

                {/* 1.5 Session Details */}
                <div style={{ padding: 16, borderBottom: '1px solid var(--black)', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(244,244,240,0.9))' }}>
                    <button
                        onClick={() => setSessionDetailsOpen((prev) => !prev)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left' }}
                    >
                        <div style={{ width: 32, height: 32, border: '2px solid var(--black)', backgroundImage: 'url(images/paper-texture.jpg)', backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0 var(--black)' }}>
                            <Icon name="NotebookText" size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div className="font-display" style={{ fontSize: 14, letterSpacing: '0.1em' }}>SESSION DETAILS</div>
                            <div className="font-mono" style={{ fontSize: 10, color: 'var(--gray)' }}>Dial in the credits and cadence</div>
                        </div>
                        <div style={{ width: 28, height: 28, border: '2px solid var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
                            <Icon name={sessionDetailsOpen ? 'ChevronUp' : 'ChevronDown'} size={16} />
                        </div>
                    </button>
                    {sessionDetailsOpen && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
                            <div className="session-input">
                                <label className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--gray)' }}>STUDIO</label>
                                <input
                                    value={studio}
                                    onChange={(e) => setStudio(e.target.value)}
                                    placeholder="E.g. OAKLAND HQ"
                                    style={{ width: '100%', padding: '10px 12px', border: '2px solid var(--black)', background: 'var(--white)', fontSize: 12, fontWeight: 700 }}
                                />
                            </div>
                            <div className="session-input">
                                <label className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--gray)' }}>PRODUCER</label>
                                <input
                                    value={producer}
                                    onChange={(e) => setProducer(e.target.value)}
                                    placeholder="E.g. GUAPDAD"
                                    style={{ width: '100%', padding: '10px 12px', border: '2px solid var(--black)', background: 'var(--white)', fontSize: 12, fontWeight: 700 }}
                                />
                            </div>
                            <div className="session-input">
                                <label className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--gray)' }}>OTHER ARTISTS</label>
                                <input
                                    value={otherArtists}
                                    onChange={(e) => setOtherArtists(e.target.value)}
                                    placeholder="E.g. FEATURED VOCALS"
                                    style={{ width: '100%', padding: '10px 12px', border: '2px solid var(--black)', background: 'var(--white)', fontSize: 12, fontWeight: 700 }}
                                />
                            </div>
                            <div className="session-input">
                                <label className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--gray)' }}>KEY</label>
                                <input
                                    value={songKey}
                                    onChange={(e) => setSongKey(e.target.value)}
                                    placeholder="E.g. B MINOR"
                                    style={{ width: '100%', padding: '10px 12px', border: '2px solid var(--black)', background: 'var(--white)', fontSize: 12, fontWeight: 700 }}
                                />
                            </div>
                            <div className="session-input">
                                <label className="font-mono" style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--gray)' }}>BPM</label>
                                <input
                                    type="number"
                                    value={bpm}
                                    onChange={(e) => setBpm(e.target.value)}
                                    placeholder="E.g. 92"
                                    style={{ width: '100%', padding: '10px 12px', border: '2px solid var(--black)', background: 'var(--white)', fontSize: 12, fontWeight: 700 }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Blocks List */}
                {blocks.map((block, i) => (
                    <div key={block.id} style={{ borderBottom: '1px solid var(--light-gray)', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 4
                        }}>
                            {i > 0 && (
                                <button onClick={() => moveBlock(i, 'up')} style={{
                                    width: 24, height: 24, background: 'var(--white)', border: '1px solid var(--black)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon name="ArrowUp" size={12} />
                                </button>
                            )}
                            {i < blocks.length - 1 && (
                                <button onClick={() => moveBlock(i, 'down')} style={{
                                    width: 24, height: 24, background: 'var(--white)', border: '1px solid var(--black)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon name="ArrowDown" size={12} />
                                </button>
                            )}
                            <button onClick={() => deleteBlock(i)} style={{
                                width: 24, height: 24, background: 'var(--white)', border: '1px solid var(--black)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444'
                            }}>
                                <Icon name="X" size={12} />
                            </button>
                        </div>
                        
                        {block.type === 'text' ? (
                            <div style={{ padding: 16, background: 'var(--white)' }}>
                                {(block.label || block.source === 'ai') && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                        {block.label && (
                                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em' }}>{block.label}</span>
                                        )}
                                        {block.source === 'ai' && (
                                            <span style={{ fontSize: 8, letterSpacing: '0.1em', background: 'var(--electric)', padding: '2px 6px', border: '1px solid var(--black)' }}>AI DRAFT</span>
                                        )}
                                    </div>
                                )}
                                <RhymeTextarea
                                    value={block.content}
                                    onChange={(e) => updateBlock(i, e.target.value)}
                                    placeholder="WRITE YOUR VERSE..."
                                    onWordDoubleTap={({ word, position }) => handleWordDoubleTap({ word, position, blockIndex: i })}
                                    className="font-mono rhyme-editor-active"
                                    style={{ width: '100%', minHeight: 100, fontSize: 14, lineHeight: 1.6, overflowAnchor: 'none' }}
                                />
                            </div>
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
                        ) : block.type === 'audio' ? (
                            <div style={{ padding: 16, background: 'var(--white)' }}>
                                {block.content ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {window.VinylAudioPlayer ? (
                                            <window.VinylAudioPlayer src={block.content} compact={true} />
                                        ) : (
                                            <audio src={block.content} controls style={{ width: '100%' }} />
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            <label style={{
                                                alignSelf: 'flex-start',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '6px 10px',
                                                border: '1px solid var(--black)',
                                                background: 'transparent',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                letterSpacing: '0.05em',
                                                cursor: 'pointer'
                                            }}>
                                                <Icon name="RefreshCw" size={12} /> REPLACE CLIP
                                                <input type="file" accept="audio/*" onChange={(e) => handleBlockAudioUpload(i, e)} style={{ display: 'none' }} />
                                            </label>
                                            <button
                                                onClick={() => handleStartBlockRecording(i)}
                                                disabled={isRecording && recordingBlockIndex !== i}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 10px',
                                                    border: '1px solid var(--black)',
                                                    background: 'transparent',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    letterSpacing: '0.05em',
                                                    cursor: isRecording && recordingBlockIndex !== i ? 'not-allowed' : 'pointer',
                                                    opacity: isRecording && recordingBlockIndex !== i ? 0.5 : 1
                                                }}
                                            >
                                                <Icon name="Mic" size={12} /> RECORD NEW
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <button
                                            onClick={() => handleStartBlockRecording(i)}
                                            disabled={isRecording && recordingBlockIndex !== i}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                height: 56, border: '2px solid #EF4444',
                                                cursor: isRecording && recordingBlockIndex !== i ? 'not-allowed' : 'pointer', gap: 8,
                                                background: 'transparent',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: '0.1em',
                                                color: '#EF4444',
                                                opacity: isRecording && recordingBlockIndex !== i ? 0.5 : 1
                                            }}
                                        >
                                            <Icon name="Mic" size={16} /> RECORD VOICE NOTE
                                        </button>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            height: 56, border: '1px dashed var(--gray)',
                                            cursor: 'pointer', gap: 8,
                                            fontSize: 10,
                                            letterSpacing: '0.1em'
                                        }}>
                                            <Icon name="Upload" size={14} /> UPLOAD AUDIO
                                            <input type="file" accept="audio/*" onChange={(e) => handleBlockAudioUpload(i, e)} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                )}
                                {recordingBlockIndex === i && (isRecording || audioUrl || recordError) && (
                                    <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--black)', background: 'var(--paper)' }}>
                                        {isRecording ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span className="animate-pulse" style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#EF4444' }}>REC</span>
                                                </div>
                                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                                                </span>
                                                <button onClick={handleStopBlockRecording} style={{
                                                    padding: '6px 10px', border: '2px solid #EF4444', background: 'transparent',
                                                    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#EF4444'
                                                }}>
                                                    STOP
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {audioUrl && (
                                                    window.VinylAudioPlayer ? (
                                                        <window.VinylAudioPlayer src={audioUrl} compact={true} />
                                                    ) : (
                                                        <audio src={audioUrl} controls style={{ width: '100%' }} />
                                                    )
                                                )}
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => handleSaveBlockRecording(i)} style={{
                                                        flex: 1, padding: '8px 10px', background: 'var(--brand-green)',
                                                        color: 'var(--white)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                                                        border: 'none'
                                                    }}>
                                                        SAVE
                                                    </button>
                                                    <button onClick={handleDiscardBlockRecording} style={{
                                                        flex: 1, padding: '8px 10px', border: '2px solid var(--black)',
                                                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent'
                                                    }}>
                                                        DISCARD
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {recordError && (
                                            <div style={{ marginTop: 8, fontSize: 10, color: '#EF4444', textAlign: 'center' }}>
                                                {recordError} - ENABLE MICROPHONE ACCESS
                                            </div>
                                        )}
                                    </div>
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
            
            {/* 4. Input & AI Toolbars (Sticky Bottom) */}
            <div style={{
                position: 'sticky', bottom: 0, left: 0, right: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0
            }}>
                <div style={{
                    background: 'var(--paper)',
                    borderTop: '2px solid var(--black)',
                    padding: '10px 12px 12px'
                }}>
                    <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--gray)', marginBottom: 8 }}>
                        YOUR INPUT
                    </div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                        {userBlockOptions.map(item => (
                            <button key={item.label} onClick={() => addBlock(item.type, {
                                placeholder: item.placeholder,
                                label: item.tag,
                                source: item.type === 'text' ? 'user' : undefined
                            })} style={{
                                flex: 1,
                                minWidth: 76,
                                padding: '10px 12px', 
                                background: 'var(--white)',
                                border: '1px solid var(--black)',
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: 6, 
                                fontSize: 9, 
                                fontWeight: 700, 
                                letterSpacing: '0.1em',
                                boxShadow: '2px 2px 0 rgba(0,0,0,0.1)'
                            }}>
                                <Icon name={item.icon} size={16} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    background: 'var(--black)', 
                    padding: '8px 0 0',
                    borderTop: '2px solid var(--electric)',
                    paddingBottom: 'max(0px, env(safe-area-inset-bottom))'
                }}>
                    <div className="font-mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--electric)', padding: '0 12px 6px' }}>
                        AI ASSIST
                    </div>
                    <div style={{ display: 'flex' }}>
                        {[
                            { id: 'next', label: '✦ NEXT BARS' },
                            { id: 'hook', label: 'HOOK' },
                            { id: 'bridge', label: 'BRIDGE' },
                            { id: 'freestyle', label: 'FREESTYLE' }
                        ].map((item, i) => (
                            <button key={item.id} onClick={() => handleAI(item.id)} disabled={aiLoading} style={{
                                flex: 1,
                                padding: '16px 4px', 
                                border: 'none',
                                borderRight: i < 3 ? '1px solid #333' : 'none',
                                fontSize: 10, 
                                fontWeight: 900, 
                                letterSpacing: '0.1em', 
                                whiteSpace: 'nowrap',
                                background: 'transparent',
                                color: aiLoading ? '#666' : 'var(--electric)',
                                opacity: aiLoading ? 0.5 : 1
                            }}>
                                {aiLoading ? '...' : item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {rhymePopup.show && (
                <RhymePopup
                    word={rhymePopup.word}
                    position={rhymePopup.position}
                    onSelect={handleRhymeSelect}
                    onClose={() => setRhymePopup({ show: false, word: '', position: { x: 0, y: 0 }, blockIndex: null })}
                />
            )}
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
                
                let guapUser = adminUser;
                if (!adminUser) {
                    // Create admin user with guapdad@gmail.com as primary email
                    guapUser = await api.create('users', { 
                        username: 'guap', 
                        email: 'guapdad@gmail.com',
                        password: simpleHash('admin123'),
                        last_login: new Date().toISOString(),
                        is_verified: true,
                        xp: 0,
                        level: 1
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
                // Pass full user object including ID for XP system
                onLogin({ id: guapUser.id, username: guapUser.username || 'guap', email: guapUser.email || 'guapdad@gmail.com', xp: guapUser.xp || 0, level: guapUser.level || 1 });
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
                    // Pass full user object including ID for XP system
                    onLogin({ id: newUser.id, username: newUser.username, email: newUser.email, xp: newUser.xp || 0, level: newUser.level || 1 });
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
                    // Pass full user object including ID for XP system
                    onLogin({ id: existingUser.id, username: existingUser.username, email: existingUser.email, xp: existingUser.xp || 0, level: existingUser.level || 1 });
                } else if (existingUser && existingUser.password === password) {
                    await api.update('users', existingUser.id, { 
                        password: simpleHash(password),
                        last_login: new Date().toISOString() 
                    });
                    
                    if (rememberMe) {
                        localStorage.setItem('dailybars_remembered_login', loginIdentifier);
                    }
                    
                    haptic('success');
                    // Pass full user object including ID for XP system
                    onLogin({ id: existingUser.id, username: existingUser.username, email: existingUser.email, xp: existingUser.xp || 0, level: existingUser.level || 1 });
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SvgIcon name="lock" size={12} color="var(--gray)" /> SECURE</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SvgIcon name="bolt" size={12} color="var(--gray)" /> MOBILE-FIRST</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><SvgIcon name="mic" size={12} color="var(--gray)" /> ARTIST-BUILT</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// TROPHY CASE VIEW (REPLACES XP STORE)
// ============================================================================

const TrophyCaseView = ({ user, onClose, onSpendXP, onSelectForShowcase }) => {
    const [tiles, setTiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userUnlocks, setUserUnlocks] = useState(new Set());
    const [allTrophies, setAllTrophies] = useState([]);
    const [confirmUnlock, setConfirmUnlock] = useState(null); // Trophy to confirm unlock
    const [selectedForShowcase, setSelectedForShowcase] = useState(new Set(user?.selected_trophies || user?.selectedTrophies || []));
    const toast = useToast();

    // --- CONFIGURATION ---
    const CABINET_CONFIG = {
        rows: [
            { id: 1, top: 12, height: 20, width: 87.5, x: 0 },
            { id: 2, top: 43.5, height: 21, width: 80, x: 0 },
            { id: 3, top: 76.5, height: 20, width: 87.5, x: 0 }
        ],
        image: "images/trophy/trophy-case.png"
    };

    // Helper to chunk array into groups of N
    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // Prepare data for the cabinet view
    const processTrophies = (trophies, unlocks) => {
        // We need 9 items per tile (3 rows * 3 items)
        const itemsPerTile = 9;
        
        // Map trophies to display format
        const formattedItems = trophies.map(t => ({
            ...t,
            unlocked: unlocks.has(t.id),
            // Random visual properties that stay consistent
            scale: 0.8 + (parseInt(t.id.slice(-2), 16) % 4) * 0.1, // Deterministic scale based on ID
            glow: unlocks.has(t.id) // Glow if unlocked
        }));

        const chunks = chunkArray(formattedItems, itemsPerTile);
        
        return chunks.map((tileItems, tileIndex) => {
            // Split tile items into 3 rows of 3
            const rows = [
                tileItems.slice(0, 3),
                tileItems.slice(3, 6),
                tileItems.slice(6, 9)
            ];
            
            // Pad rows with nulls if needed to ensure grid alignment
            const paddedRows = rows.map(row => {
                const padded = [...row];
                while (padded.length < 3) padded.push(null);
                return padded;
            });

            return {
                id: tileIndex,
                data: paddedRows
            };
        });
    };

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch all trophies
                const trophies = await window.DailyDepositEngine.getTrophies();
                setAllTrophies(trophies);

                // Fetch user unlocks
                if (user?.id) {
                    const unlockIds = await window.DailyDepositEngine.getUserTrophies(user.id);
                    setUserUnlocks(new Set(unlockIds));
                    setTiles(processTrophies(trophies, new Set(unlockIds)));
                } else {
                    setTiles(processTrophies(trophies, new Set()));
                }
            } catch (err) {
                console.error("Trophy load error:", err);
                toast?.addToast("FAILED TO LOAD TROPHIES", "error");
            }
            setLoading(false);
        };
        loadData();
    }, [user]);

    const handleUnlockAttempt = async (trophy) => {
        if (trophy.unlocked) {
            // If already unlocked, allow selecting for showcase
            if (onSelectForShowcase) {
                const newSet = new Set(selectedForShowcase);
                if (newSet.has(trophy.id)) {
                    newSet.delete(trophy.id);
                    toast?.addToast(`${trophy.name.toUpperCase()} REMOVED FROM SHOWCASE`, 'info');
                } else {
                    if (newSet.size >= 3) {
                        // Remove oldest (first in set)
                        const firstItem = Array.from(newSet)[0];
                        newSet.delete(firstItem);
                    }
                    newSet.add(trophy.id);
                    toast?.addToast(`${trophy.name.toUpperCase()} ADDED TO SHOWCASE!`, 'success');
                }
                setSelectedForShowcase(newSet);
                await onSelectForShowcase(trophy.id);
            } else {
                toast?.addToast(`${trophy.name.toUpperCase()} - ALREADY YOURS!`, 'success');
            }
            return;
        }
        
        const currentXP = user.xp || 0;
        
        if (currentXP >= trophy.xp_cost) {
            // Show in-app confirm dialog
            setConfirmUnlock(trophy);
        } else {
            haptic('heavy');
            const needed = trophy.xp_cost - currentXP;
            toast?.addToast(`NEED ${needed} MORE XP! (${currentXP}/${trophy.xp_cost})`, 'error');
        }
    };
    
    const executeUnlock = async (trophy) => {
        try {
            // 1. Spend the XP first
            if (onSpendXP) {
                await onSpendXP(trophy.xp_cost);
            }
            
            // 2. Record the trophy unlock
            await window.DailyDepositEngine.unlockTrophy(user.id, trophy.id);
            
            // 3. Optimistic UI update
            const newUnlocks = new Set(userUnlocks);
            newUnlocks.add(trophy.id);
            setUserUnlocks(newUnlocks);
            setTiles(processTrophies(allTrophies, newUnlocks));
            
            haptic('success');
            toast?.addToast(`UNLOCKED: ${trophy.name.toUpperCase()}! (-${trophy.xp_cost} XP)`, 'success');
        } catch (e) {
            console.error('Trophy unlock error:', e);
            toast?.addToast("UNLOCK FAILED - XP REFUNDED", "error");
        }
        setConfirmUnlock(null);
    };

    // --- SUB-COMPONENTS ---

    const ShelfItem = ({ item }) => {
        if (!item) return <div style={{ width: 60 }} />; // Spacer
        
        const isShowcased = selectedForShowcase.has(item.id);

        return (
            <div 
                onClick={() => handleUnlockAttempt(item)}
                style={{ 
                    position: 'relative', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'flex-end',
                    transition: 'transform 0.3s ease',
                    cursor: 'pointer',
                    marginTop: '10%' // Push items down 10%
                }}
                className="trophy-item"
            >
                {/* Showcase indicator - Gold border */}
                {isShowcased && item.unlocked && (
                    <div style={{
                        position: 'absolute',
                        inset: -8,
                        border: '3px solid #EAB308',
                        borderRadius: '50%',
                        zIndex: 5,
                        animation: 'pulse 2s infinite'
                    }} />
                )}
                
                {/* Glow Effect for unlocked */}
                {item.unlocked && (
                    <div style={{
                        position: 'absolute', inset: -10,
                        background: `${item.color}4D`,
                        filter: 'blur(15px)',
                        borderRadius: '50%',
                        opacity: 0.6,
                        animation: 'pulse 2s infinite'
                    }} />
                )}
                
                {/* Trophy Image - DOUBLED SIZE */}
                <div style={{ 
                    position: 'relative', 
                    zIndex: 10, 
                    filter: item.unlocked 
                        ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' 
                        : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3)) brightness(0.7)', 
                    color: item.color 
                }}>
                    {item.image_url ? (
                        <img 
                            src={item.image_url} 
                            alt={item.name}
                            style={{ 
                                width: item.unlocked ? 90 : 80, // DOUBLED from 56/40
                                height: item.unlocked ? 90 : 80,
                                objectFit: 'contain',
                                borderRadius: 6,
                                opacity: item.unlocked ? 1 : 0.75, // Brighter when locked (was too dim)
                                filter: item.unlocked ? 'none' : 'saturate(0.3)' // Slight desaturation instead of full grayscale
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                            }}
                        />
                    ) : (
                        <Icon name={item.icon || 'Trophy'} size={item.unlocked ? 72 : 64} />
                    )}
                    {/* Fallback icon if image fails */}
                    <div style={{ display: 'none' }}>
                        <Icon name={item.icon || 'Trophy'} size={72} />
                    </div>
                    
                    {/* XP Cost Badge for locked items */}
                    {!item.unlocked && (
                        <div style={{ 
                            position: 'absolute',
                            bottom: -8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 10, 
                            fontWeight: 700,
                            textAlign: 'center',
                            background: 'rgba(0,0,0,0.9)', 
                            padding: '3px 8px', 
                            borderRadius: 6,
                            color: '#FFD700',
                            border: '1px solid #FFD700',
                            whiteSpace: 'nowrap'
                        }}>
                            {item.xp_cost} XP
                        </div>
                    )}
                </div>

                {/* Reflection */}
                <div style={{
                    height: 10, width: '80%',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '50%',
                    filter: 'blur(5px)',
                    marginTop: 8,
                    opacity: 0.5
                }} />
                
                {/* Tooltip */}
                <div className="trophy-tooltip" style={{
                    position: 'absolute', bottom: '100%', marginBottom: 8,
                    background: 'rgba(0,0,0,0.9)', color: 'white',
                    padding: '6px 10px', borderRadius: 4,
                    pointerEvents: 'none', zIndex: 20,
                    opacity: 0, transition: 'opacity 0.2s',
                    textAlign: 'center', width: 140
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{item.description}</div>}
                </div>
            </div>
        );
    };

    const Shelf = ({ config, items }) => {
        return (
            <div 
                style={{
                    position: 'absolute',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    alignItems: 'flex-end',
                    justifyItems: 'center',
                    padding: '0 16px 8px',
                    top: `${config.top}%`,
                    height: `${config.height}%`,
                    width: `${config.width}%`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                }}
            >
                {items.map((item, i) => (
                    <ShelfItem key={item?.id || i} item={item} />
                ))}
            </div>
        );
    };

    const CabinetTile = ({ rowData }) => {
        return (
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%', margin: '0 auto', marginBottom: 14 }}>
                <img 
                    src={CABINET_CONFIG.image} 
                    alt="" 
                    style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
                />
                <div style={{ position: 'absolute', inset: 0 }}>
                    {CABINET_CONFIG.rows.map((rowConfig, idx) => (
                        <Shelf 
                            key={rowConfig.id} 
                            config={rowConfig} 
                            items={rowData[idx] || [null, null, null]} 
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-slide-up" style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#1a1a1a', color: 'white',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 16px 16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 8, background: 'rgba(234, 179, 8, 0.2)', borderRadius: 8 }}>
                        <Icon name="Trophy" size={24} color="#FACC15" />
                    </div>
                    <div>
                        <h1 style={{ 
                            fontSize: 16, fontWeight: 700, letterSpacing: '0.1em',
                            background: 'linear-gradient(to right, #FDE047, #D97706)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            HALL OF FAME
                        </h1>
                        <div style={{ fontSize: 10, color: '#9CA3AF' }}>{tiles.length * 3} SHELVES LOADED</div>
                    </div>
                </div>
                <button onClick={onClose} style={{ color: 'white', padding: 8 }}>
                    <Icon name="X" size={24} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="scrollable" style={{ flex: 1, paddingTop: 80, paddingBottom: 80 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {tiles.map((tile) => (
                        <CabinetTile 
                            key={tile.id} 
                            rowData={tile.data} 
                        />
                    ))}
                </div>

                {/* Loading Indicator */}
                {loading && (
                    <div style={{ height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div className="animate-spin" style={{ 
                                width: 32, height: 32, 
                                border: '4px solid #EAB308', borderTopColor: 'transparent', 
                                borderRadius: '50%' 
                            }} />
                            <span className="animate-pulse" style={{ color: 'rgba(234, 179, 8, 0.8)', fontSize: 12, fontWeight: 500 }}>
                                POLISHING TROPHIES...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Scroll Top FAB */}
            <button 
                onClick={() => document.querySelector('.scrollable').scrollTo({ top: 0, behavior: 'smooth' })}
                style={{
                    position: 'fixed', bottom: 24, right: 24,
                    padding: 12, background: '#EAB308', color: 'black',
                    borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer'
                }}
            >
                <SvgIcon name="arrowUp" size={24} color="black" />
            </button>
            
            {/* Confirm Unlock Dialog */}
            {confirmUnlock && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div 
                        onClick={() => setConfirmUnlock(null)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 340,
                        backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: 4,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '2px solid var(--black)'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px 12px',
                            borderBottom: '2px solid var(--black)'
                        }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 900,
                                letterSpacing: '0.15em',
                                color: 'var(--black)'
                            }}>
                                UNLOCK TROPHY
                            </h2>
                            <button 
                                onClick={() => setConfirmUnlock(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            >
                                <SvgIcon name="x" size={20} color="var(--black)" />
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: 20, textAlign: 'center' }}>
                            <div style={{ marginBottom: 16 }}>
                                <SvgIcon name="trophy" size={48} color="var(--black)" />
                            </div>
                            <div style={{ 
                                fontSize: 16, 
                                fontWeight: 700, 
                                marginBottom: 8,
                                color: 'var(--black)'
                            }}>
                                {confirmUnlock.name}
                            </div>
                            <div style={{ 
                                fontSize: 12, 
                                color: 'var(--gray)',
                                marginBottom: 16
                            }}>
                                Spend {confirmUnlock.xp_cost} XP to unlock this trophy?
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600
                            }}>
                                <span>YOUR XP: {user.xp || 0}</span>
                                <span>AFTER: {(user.xp || 0) - confirmUnlock.xp_cost}</span>
                            </div>
                        </div>
                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            gap: 12,
                            padding: '12px 20px 20px'
                        }}>
                            <button
                                onClick={() => setConfirmUnlock(null)}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    border: '2px solid var(--black)',
                                    background: 'transparent',
                                    color: 'var(--black)',
                                    cursor: 'pointer'
                                }}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => executeUnlock(confirmUnlock)}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    border: 'none',
                                    background: 'var(--black)',
                                    color: 'var(--white)',
                                    cursor: 'pointer'
                                }}
                            >
                                UNLOCK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .trophy-item:hover .trophy-tooltip { opacity: 1 !important; }
                .trophy-item:hover { transform: translateY(-8px) scale(var(--scale, 1)) !important; }
            `}</style>
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
        wall: "images/safe/safe-wall.png",
        backOfSafe: "images/safe/back-of-safe.png",
        gearLarge: "images/safe/large-gear.png",
        gearMedium: "images/safe/medium-gear.png",
        gearSmall: "images/safe/small-gear.png",
        hinges: "images/safe/hinges-and-bolts.png",
        knob: "images/safe/center-knob.png"
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

    const LAYER_ORDER = ['backOfSafe', 'gearLarge', 'gearMedium', 'gearSmall', 'hinges', 'knob'];

    // Gear Ratios (Controls speed and direction)
    const RATIOS = {
        backOfSafe: 0, hinges: 0,
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
            backgroundColor: '#1a1a1a' // Dark background for the safe
        }}>
            {/* Wall Background - Separated to cover full screen */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${ASSETS.wall})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.7)' // Slightly darken wall to make safe pop
            }} />

            {/* Safe Mechanism - Scaled Container */}
            <div style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transform: `scale(${GLOBAL_SCALE})`,
                width: '100%',
                height: '100%'
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

const SyndicateView = ({ user, onTyping, onOpenStore, onAction, onShowProfile }) => {
    const [tab, setTab] = useState('vault'); // 'vault' (Prompts) or 'free_game' (Bars) or 'courses'
    const [loading, setLoading] = useState(false);
    const [feed, setFeed] = useState([]);
    const [promptText, setPromptText] = useState('');
    const [submitting, setSubmission] = useState(false);
    const [courses, setCourses] = useState([]);
    const [courseHtml, setCourseHtml] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [previewCourse, setPreviewCourse] = useState(null);
    const [upvotedPosts, setUpvotedPosts] = useState(new Set());
    const toast = useToast();

    const courseStorageKey = useMemo(() => (
        user?.username ? `syndicate_courses_${user.username}` : 'syndicate_courses_guest'
    ), [user?.username]);

    // Load initial data
    useEffect(() => {
        loadFeed();
    }, [tab]);

    const loadFeed = async () => {
        if (tab === 'courses') {
            setFeed([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const data = await window.DailyDepositEngine.getSyndicateFeed();
        
        // Filter based on tab
        const filtered = data.filter(post => {
            if (tab === 'vault') return post.submission_type === 'PROMPT' || !post.submission_type; // Legacy assumes PROMPT
            if (tab === 'free_game') return post.submission_type === 'VERSE';
            return true;
        });
        
        setFeed(filtered);
        
        // Load upvote status for each post
        if (user?.id && filtered.length > 0) {
            const upvotedSet = new Set();
            await Promise.all(filtered.map(async (post) => {
                const hasVoted = await window.DailyDepositEngine.hasUpvoted(post.id, user.id);
                if (hasVoted) {
                    upvotedSet.add(post.id);
                }
            }));
            setUpvotedPosts(upvotedSet);
        }
        
        setLoading(false);
    };

    const loadCoursesFromStorage = useCallback(() => {
        try {
            const raw = localStorage.getItem(courseStorageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('❌ Failed to load courses:', error);
            return [];
        }
    }, [courseStorageKey]);

    const persistCourses = useCallback((nextCourses) => {
        setCourses(nextCourses);
        try {
            localStorage.setItem(courseStorageKey, JSON.stringify(nextCourses));
        } catch (error) {
            console.error('❌ Failed to save courses:', error);
        }
    }, [courseStorageKey]);

    useEffect(() => {
        if (tab === 'courses') {
            setCourses(loadCoursesFromStorage());
        }
    }, [tab, loadCoursesFromStorage]);

    useEffect(() => {
        setCourses(loadCoursesFromStorage());
    }, [courseStorageKey, loadCoursesFromStorage]);

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

    const handleSaveCourse = (e) => {
        e.preventDefault();
        if (!courseHtml.trim()) return;

        const newCourse = {
            id: Date.now(),
            title: courseTitle.trim() || 'Untitled Course',
            html: courseHtml,
            savedAt: new Date().toISOString()
        };

        const nextCourses = [newCourse, ...courses];
        persistCourses(nextCourses);
        setCourseHtml('');
        setCourseTitle('');
        toast?.addToast('COURSE DRAFT SAVED', 'success');
    };

    const handleOpenCourse = (course) => {
        try {
            const blob = new Blob([course.html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setPreviewCourse(course);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error) {
            console.error('❌ Failed to open course HTML:', error);
            toast?.addToast('COULD NOT OPEN COURSE', 'error');
        }
    };

    const handleLoadCourseToEditor = useCallback((course) => {
        setCourseTitle(course.title || '');
        setCourseHtml(course.html || '');
        setPreviewCourse(course);
        toast?.addToast('COURSE LOADED TO EDITOR', 'info');
    }, [toast]);

    const handleDeleteCourse = useCallback((courseId) => {
        const nextCourses = courses.filter(c => c.id !== courseId);
        persistCourses(nextCourses);
        if (previewCourse?.id === courseId) {
            setPreviewCourse(null);
        }
        toast?.addToast('COURSE REMOVED', 'success');
    }, [courses, persistCourses, previewCourse?.id, toast]);

    const handleCopyCourseHtml = useCallback(async (course) => {
        try {
            await navigator?.clipboard?.writeText(course.html);
            toast?.addToast('HTML COPIED', 'success');
            setPreviewCourse(course);
        } catch (error) {
            console.error('❌ Failed to copy course HTML:', error);
            toast?.addToast('COPY FAILED', 'error');
        }
    }, [toast]);

    const renderCoursePreview = (course) => (
        <div
            style={{ background: 'var(--white)', border: '1px solid var(--black)', padding: 10, maxHeight: 240, overflow: 'auto' }}
        >
            <iframe
                title={`course-${course.id}-preview`}
                sandbox="allow-forms allow-same-origin"
                style={{ width: '100%', height: 200, border: 'none' }}
                srcDoc={course.html}
            />
        </div>
    );

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
                    onClick={() => setTab('courses')}
                    style={{
                        flex: 1, padding: 16,
                        background: tab === 'courses' ? 'var(--black)' : 'transparent',
                        color: tab === 'courses' ? 'var(--white)' : 'var(--black)',
                        fontSize: 11, fontWeight: 900, letterSpacing: '0.1em'
                    }}
                >
                    COURSES
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
                                {feed.map((p, i) => {
                                    const hasVoted = upvotedPosts.has(p.id);
                                    return (
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
                                                alignItems: 'center',
                                                fontSize: 9, 
                                                color: 'var(--gray)',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase'
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        if (onShowProfile && p.author) {
                                                            onShowProfile(p.author);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        padding: 0,
                                                        cursor: 'pointer',
                                                        fontSize: 9,
                                                        color: 'var(--gray)',
                                                        letterSpacing: '0.1em',
                                                        textTransform: 'uppercase',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    @{p.author}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (hasVoted) {
                                                            toast?.addToast('ALREADY UPVOTED', 'info');
                                                            return;
                                                        }
                                                        try {
                                                            const result = await window.DailyDepositEngine.upvotePost(p.id, user?.id, user?.username);
                                                            if (result.success) {
                                                                // Update local state
                                                                setFeed(prev => prev.map(item => 
                                                                    item.id === p.id ? { ...item, likes: result.newLikes } : item
                                                                ));
                                                                setUpvotedPosts(prev => new Set([...prev, p.id]));
                                                                haptic('success');
                                                                toast?.addToast('UPVOTED! +10 XP', 'success');
                                                                if (onAction) onAction(10, 'UPVOTED PROMPT');
                                                            } else if (result.alreadyVoted) {
                                                                setUpvotedPosts(prev => new Set([...prev, p.id]));
                                                                toast?.addToast('ALREADY UPVOTED', 'info');
                                                            } else if (result.error) {
                                                                toast?.addToast(result.error.toUpperCase(), 'error');
                                                            }
                                                        } catch (err) {
                                                            toast?.addToast('UPVOTE FAILED', 'error');
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '6px 12px',
                                                        background: hasVoted ? 'var(--electric)' : 'transparent',
                                                        border: '1px solid var(--black)',
                                                        cursor: hasVoted ? 'default' : 'pointer',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <span style={{ fontSize: 14 }}>{hasVoted ? '💎' : '◇'}</span>
                                                    <span>{p.likes || 0}</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
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
                <div className="animate-slide-in" style={{ position: 'relative', minHeight: '80vh' }}>
                    <SafeComponent />
                    
                    <div style={{ padding: 16, background: 'rgba(31, 41, 55, 0.9)', color: 'white', fontSize: 10, textAlign: 'center', letterSpacing: '0.1em', position: 'relative', zIndex: 1, backdropFilter: 'blur(4px)' }}>
                        PUBLIC DOMAIN BARS • FREE TO USE
                    </div>
                    
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--white)', fontSize: 10, position: 'relative', zIndex: 1 }}>LOADING FEED...</div>
                    ) : feed.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--white)', fontSize: 10, position: 'relative', zIndex: 1 }}>NO FREE GAME YET</div>
                    ) : (
                        <div style={{ padding: 20, position: 'relative', zIndex: 1 }}>
                            {feed.map((post) => (
                                <div key={post.id} style={{ 
                                    padding: 20, 
                                    marginBottom: 12,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.9)',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
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
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: 'var(--white)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Icon name="Copy" size={10} /> STEAL THIS
                                </button>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            )}

            {/* COURSES CONTENT */}
            {tab === 'courses' && (
                <div className="animate-slide-in" style={{ position: 'relative', minHeight: '80vh' }}>
                    <SafeComponent />

                    <div style={{
                        padding: 16,
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderBottom: '2px solid var(--black)',
                        textAlign: 'center',
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        fontWeight: 900,
                        position: 'sticky', top: 0, zIndex: 2
                    }}>
                        COURSES ARE CURATED & PAYWALLED • DAILY BARS HOSTS THE HTML SO THEY WORK IN-APP & ON WEB
                    </div>

                    <div style={{ padding: 20, position: 'relative', zIndex: 1 }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            border: '2px solid var(--black)',
                            boxShadow: '8px 8px 0 rgba(0,0,0,0.15)',
                            padding: 20,
                            marginBottom: 16
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 className="font-display" style={{ fontSize: 14 }}>COURSES COMING SOON</h3>
                                <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.08em' }}>
                                    Uploaded by Daily Bars only
                                </span>
                            </div>

                            <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                                We are building full web-page courses powered by pure HTML so they feel the same in the app or in a browser. Uploading is creator-only, and access will be handled through RevenueCat when the paywall launches.
                            </p>
                            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--gray)' }}>
                                When courses drop, you&apos;ll unlock them here after purchasing. No user uploads are allowed in this section.
                            </p>
                            <button
                                onClick={onOpenStore}
                                style={{
                                    width: '100%',
                                    marginTop: 12,
                                    padding: 14,
                                    background: 'var(--electric)',
                                    color: 'var(--black)',
                                    fontSize: 11,
                                    fontWeight: 900,
                                    letterSpacing: '0.1em',
                                    border: '2px solid var(--black)'
                                }}
                            >
                                VIEW ACCESS OPTIONS
                            </button>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.95)',
                            border: '2px solid var(--black)',
                            boxShadow: '8px 8px 0 rgba(0,0,0,0.15)',
                            padding: 20
                        }}>
                            <h4 className="font-display" style={{ fontSize: 13, marginBottom: 10 }}>YOUR COURSES</h4>
                            <p style={{ fontSize: 11, lineHeight: 1.6 }}>
                                Courses will appear here automatically once they are published and unlocked through the RevenueCat paywall. For now, sit tight — we&apos;re preparing the first drop.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// CASSETTE BUTTON COMPONENT
// ============================================================================

const CassetteButton = ({ user, onClick, isOpen }) => {
    // Rely on isOpen prop if available for unspooling state, otherwise use internal state
    const [internalUnspooling, setInternalUnspooling] = useState(false);
    
    // Determine if unspooling based on prop (controlled) or internal state (uncontrolled)
    const isUnspooling = isOpen !== undefined ? isOpen : internalUnspooling;
    
    const toggleUnspool = (e) => {
        e.stopPropagation();
        if (isOpen === undefined) {
            setInternalUnspooling(!internalUnspooling);
        }
        if (onClick) onClick();
    };

    return (
        <>
            <style>
                {`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                }
                .unspooling .reel-spinner {
                    animation: spin 1s linear infinite;
                    transform-origin: 0 0;
                }
                .unspooling #tape-mess {
                    stroke-dashoffset: 0 !important;
                }
                .unspooling-shake {
                    animation: shake 0.5s infinite;
                }
                `}
            </style>
            <div 
                className={`canvas-container ${isUnspooling ? 'unspooling-shake' : ''}`}
                style={{
                    position: 'fixed',
                    bottom: 80, // Moved up to avoid mobile bottom bar issues
                    left: 16,
                    zIndex: 150, // Increased z-index to be above bottom bar
                    pointerEvents: 'none'
                }}
            >
                <svg 
                    id="cassette-svg" 
                    className={isUnspooling ? 'unspooling' : ''}
                    width="450" 
                    height="300" 
                    viewBox="0 0 450 300" 
                    xmlns="http://www.w3.org/2000/svg" 
                    onClick={toggleUnspool}
                    style={{
                        cursor: 'pointer',
                        overflow: 'visible',
                        width: '75px',
                        height: 'auto',
                        pointerEvents: 'auto'
                    }}
                >
                    <defs>
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor:'#3a3a3a', stopOpacity:1}} />
                            <stop offset="100%" style={{stopColor:'#1a1a1a', stopOpacity:1}} />
                        </linearGradient>
                        
                        <filter id="innerShadow">
                            <feOffset dx="0" dy="2"/>
                            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
                            <feComposite operator="out" in="SourceAlpha" in2="offset-blur" result="inverse"/>
                            <feFlood floodColor="black" floodOpacity="0.8" result="color"/>
                            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
                        </filter>
                    </defs>

                    {/* Unspooling Tape Mess */}
                    <path id="tape-mess" d="M190 25 C 150 -50, 300 -80, 225 -150 C 150 -220, 100 -100, 50 -180 C 200 -300, 400 -200, 380 -350" 
                          fill="none" stroke="#3d2b1f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
                          style={{
                              strokeDasharray: 1000,
                              strokeDashoffset: 1000,
                              transition: 'stroke-dashoffset 2s ease-in-out',
                              pointerEvents: 'none'
                          }}
                    />

                    {/* Main Shell */}
                    <rect x="25" y="25" width="400" height="250" rx="15" fill="url(#bodyGrad)" stroke="#111" strokeWidth="2" />
                    
                    {/* Bottom Indent Section */}
                    <path d="M70 240 L380 240 L360 275 L90 275 Z" fill="#222" stroke="#111" />
                    <circle cx="120" cy="257" r="8" fill="#111" />
                    <circle cx="330" cy="257" r="8" fill="#111" />
                    <rect x="190" y="250" width="70" height="15" rx="3" fill="#111" />

                    {/* The Label Area */}
                    <rect x="50" y="50" width="350" height="170" rx="8" fill="#fdf6e3" />
                    
                    {/* Retro Stripes on Label */}
                    <rect x="50" y="50" width="350" height="15" rx="8" fill="#ff4d4d" opacity="0.8" />
                    <rect x="50" y="65" width="350" height="10" fill="#EAB308" opacity="0.8" />
                    
                    {/* Centered Label Text */}
                    <text x="225" y="115" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="64" fontWeight="bold" fill="#222">
                        {user?.username ? user.username.toUpperCase() : 'USER'}
                    </text>
                    <text x="70" y="95" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#666">SIDE A</text>
                    
                    {/* The Clear Window */}
                    <rect x="110" y="125" width="230" height="70" rx="5" fill="#1a1a1a" filter="url(#innerShadow)" />
                    
                    {/* Tape Visible Inside */}
                    <rect x="130" y="145" width="190" height="30" fill="#3d2b1f" opacity="0.6" />

                    {/* Left Reel */}
                    <g transform="translate(155, 160)">
                        <g className="reel-spinner">
                            <circle cx="0" cy="0" r="30" fill="white" stroke="#ccc" strokeWidth="1" />
                            <circle cx="0" cy="0" r="10" fill="#1a1a1a" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(60)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(120)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(180)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(240)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(300)" />
                        </g>
                    </g>

                    {/* Right Reel */}
                    <g transform="translate(295, 160)">
                        <g className="reel-spinner">
                            <circle cx="0" cy="0" r="30" fill="white" stroke="#ccc" strokeWidth="1" />
                            <circle cx="0" cy="0" r="10" fill="#1a1a1a" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(30)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(90)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(150)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(210)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(270)" />
                            <path d="M-3 -12 L3 -12 L2 -8 L-2 -8 Z" fill="#333" transform="rotate(330)" />
                        </g>
                    </g>

                    {/* Screws */}
                    <circle cx="45" cy="45" r="5" fill="#555" stroke="#333" />
                    <circle cx="405" cy="45" r="5" fill="#555" stroke="#333" />
                    <circle cx="45" cy="255" r="5" fill="#555" stroke="#333" />
                    <circle cx="405" cy="255" r="5" fill="#555" stroke="#333" />

                    {/* Tape Progress Markers */}
                    <line x1="180" y1="185" x2="270" y2="185" stroke="#444" strokeWidth="1" strokeDasharray="2,5" />
                </svg>
            </div>
        </>
    );
};

// ============================================================================
// MAIN APP
// ============================================================================

const App = () => {
    const ScratchLabViewComponent = window.ScratchLabView;
    const [user, setUser] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    // Initialize view from storage or default to feed
    const [view, setView] = useState(() => localStorage.getItem('dailybars_view') || 'feed');
    const [bars, setBars] = useState([]);
    const [archiveQuery, setArchiveQuery] = useState('');
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
    const [levelUpModal, setLevelUpModal] = useState(null); // Level number to show
    const [isScratchLabScrubbing, setIsScratchLabScrubbing] = useState(false); // Disable swipe during scrubbing
    const [hasPremium, setHasPremium] = useState(false);
    const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
    const [premiumMessage, setPremiumMessage] = useState('');
    const [customerInfo, setCustomerInfo] = useState(null);
    const [revenueCatError, setRevenueCatError] = useState('');
    const [aiUsageCount, setAiUsageCount] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileModalUser, setProfileModalUser] = useState(null);
    const PAYWALL_OFFERING_ID = useMemo(() => window.RevenueCat?.DEFAULT_OFFERING || 'dailybars_pro', []);
    const typingTimeoutRef = useRef(null);

    const premiumKey = useMemo(() => user?.username ? `dailybars_premium_${user.username}` : 'dailybars_premium_guest', [user?.username]);
    const aiUsageKey = useMemo(() => user?.username ? `ai_usage_${user.username}` : 'ai_usage_guest', [user?.username]);
    const userKey = useMemo(() => user?.id || user?.username || 'guest', [user?.id, user?.username]);

    useEffect(() => {
        let cancelled = false;
        const initRevenueCat = async () => {
            if (!window.RevenueCat) {
                setRevenueCatError('RevenueCat SDK not loaded');
                return;
            }
            try {
                setRevenueCatError('');
                const info = await window.RevenueCat.ensureConfigured(user?.id || user?.username);
                if (cancelled) return;
                setCustomerInfo(info || null);
            } catch (err) {
                if (cancelled) return;
                console.error('RevenueCat init failed', err);
                setRevenueCatError(err.message || 'RevenueCat unavailable');
            }
        };
        initRevenueCat();
        return () => { cancelled = true; };
    }, [user]);

    const syncRevenueCatToSupabase = useCallback(async (info) => {
        if (!info || typeof supabase === 'undefined') return;
        try {
            const payload = {
                user_key: userKey,
                user_id: user?.id || null,
                username: user?.username || null,
                app_user_id: info?.appUserID || info?.originalAppUserId || userKey,
                entitlement_pro_active: window.RevenueCat?.hasPro(info) || false,
                entitlements: info?.entitlements || null,
                customer_info: info,
                environment: info?.managementURL ? 'production' : null,
                last_synced: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase
                .from('revenuecat_customers')
                .upsert(payload, { onConflict: 'user_key' });
            if (error) {
                console.warn('RevenueCat sync to Supabase failed', error.message);
            }
        } catch (err) {
            console.warn('RevenueCat sync to Supabase error', err);
        }
    }, [user?.id, user?.username, userKey]);

    useEffect(() => {
        if (!customerInfo) return;
        syncRevenueCatToSupabase(customerInfo);
    }, [customerInfo, syncRevenueCatToSupabase]);

    useEffect(() => {
        if (!window.RevenueCat) return undefined;
        const unsubscribe = window.RevenueCat.addCustomerInfoListener((info) => setCustomerInfo(info || null));
        return () => unsubscribe?.();
    }, []);

    // XP SYSTEM LOGIC
    const addExperience = async (amount, reason) => {
        if (!user) {
            console.warn('⚠️ addExperience called but no user');
            return;
        }
        if (!user.id) {
            console.warn('⚠️ addExperience called but user has no ID:', user);
            // Try to fetch user ID from database
            try {
                const res = await api.get('users', { limit: 1000 });
                const dbUser = res.data?.find(u => u.username?.toLowerCase() === user.username?.toLowerCase());
                if (dbUser?.id) {
                    console.log('🔧 Found user ID in DB, updating local user');
                    user.id = dbUser.id;
                    user.xp = dbUser.xp || 0;
                    user.level = dbUser.level || 1;
                } else {
                    console.error('❌ Could not find user in database');
                    return;
                }
            } catch (e) {
                console.error('❌ Failed to fetch user ID:', e);
                return;
            }
        }
        
        try {
            const currentXp = user.xp || 0;
            const currentLevel = user.level || 1;
            const newXp = currentXp + amount;
            const newLevel = Math.floor(newXp / 100) + 1;
            
            console.log(`⭐ +${amount} XP: ${reason} (${currentXp} -> ${newXp})`);
            
            // Optimistic update
            const updatedUser = { ...user, xp: newXp, level: newLevel };
            setUser(updatedUser);
            localStorage.setItem('dailybars_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('dailybars_session') || '{}'), user: updatedUser }));
            
            // API Update
            await api.update('users', user.id, { xp: newXp, level: newLevel });
            
            // Check and award XP trophies
            try {
                await supabase.rpc('check_xp_trophies', { p_user_id: user.id, p_xp: newXp });
            } catch (trophyErr) {
                console.warn('⚠️ Failed to check XP trophies:', trophyErr);
            }
            
            // Visual feedback - show XP gain briefly
            haptic('light');
            
            if (newLevel > currentLevel) {
                // Level Up! Show in-app modal
                haptic('success');
                setTimeout(() => setLevelUpModal(newLevel), 500);
            }
        } catch (err) {
            console.error('❌ XP Update failed:', err);
        }
    };

    useEffect(() => {
        const stored = premiumKey ? localStorage.getItem(premiumKey) : null;
        const rcPro = window.RevenueCat?.hasPro(customerInfo);
        const isPremiumUser = user?.username?.toLowerCase() === 'guap' || user?.isPremium || stored === 'true' || rcPro;
        setHasPremium(!!isPremiumUser);
        if (rcPro && premiumKey) {
            localStorage.setItem(premiumKey, 'true');
        }
    }, [premiumKey, user, customerInfo]);

    useEffect(() => {
        const storedUses = parseInt(localStorage.getItem(aiUsageKey) || '0');
        setAiUsageCount(Number.isFinite(storedUses) ? storedUses : 0);
    }, [aiUsageKey]);

    const requestPremium = (message = 'Unlock premium to keep grinding.') => {
        setPremiumMessage(message);
        setShowPremiumPrompt(true);
    };

    const refreshRevenueCat = useCallback(async () => {
        if (!window.RevenueCat) return null;
        try {
            const info = await window.RevenueCat.getCustomerInfo();
            setCustomerInfo(info || null);
            const rcPro = window.RevenueCat.hasPro(info);
            if (rcPro && premiumKey) {
                localStorage.setItem(premiumKey, 'true');
                setHasPremium(true);
            }
            return info;
        } catch (err) {
            console.error('Failed to refresh RevenueCat info', err);
            setRevenueCatError(err.message || 'RevenueCat unavailable');
            return null;
        }
    }, [premiumKey]);

    const openRevenueCatPaywall = useCallback(async () => {
        if (!window.RevenueCat) {
            setRevenueCatError('RevenueCat SDK not loaded');
            return;
        }
        try {
            setRevenueCatError('');
            await window.RevenueCat.showPaywall({ appUserID: user?.id || user?.username });
            const latest = await refreshRevenueCat();
            if (latest && window.RevenueCat.hasPro(latest)) {
                setShowPremiumPrompt(false);
            }
        } catch (err) {
            console.error('RevenueCat paywall failed', err);
            setRevenueCatError(err.message || 'Purchase failed');
        }
    }, [refreshRevenueCat, user]);

    const restoreRevenueCatPurchases = useCallback(async () => {
        if (!window.RevenueCat) {
            setRevenueCatError('RevenueCat SDK not loaded');
            return;
        }
        try {
            setRevenueCatError('');
            await window.RevenueCat.restorePurchases();
            const latest = await refreshRevenueCat();
            if (latest && window.RevenueCat.hasPro(latest)) {
                setShowPremiumPrompt(false);
            }
        } catch (err) {
            console.error('RevenueCat restore failed', err);
            setRevenueCatError(err.message || 'Restore failed');
        }
    }, [refreshRevenueCat]);

    const openRevenueCatCustomerCenter = useCallback(async () => {
        if (!window.RevenueCat?.presentCustomerCenter) {
            setRevenueCatError('Customer Center not available in this SDK version');
            return;
        }
        try {
            setRevenueCatError('');
            await window.RevenueCat.presentCustomerCenter('manage-subscriptions');
        } catch (err) {
            console.error('Customer Center failed', err);
            setRevenueCatError(err.message || 'Customer Center unavailable');
        }
    }, []);

    const canUseAI = useCallback(() => hasPremium || aiUsageCount < 3, [hasPremium, aiUsageCount]);

    const noteAIUse = useCallback(() => {
        const next = aiUsageCount + 1;
        setAiUsageCount(next);
        localStorage.setItem(aiUsageKey, next.toString());
    }, [aiUsageCount, aiUsageKey]);

    const syncPremiumUsageToSupabase = useCallback(async (usageCount) => {
        if (typeof supabase === 'undefined') return;
        try {
            const payload = {
                user_key: userKey,
                user_id: user?.id || null,
                username: user?.username || null,
                ai_uses: usageCount,
                last_ai_use: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const { error } = await supabase
                .from('premium_usage')
                .upsert(payload, { onConflict: 'user_key' });
            if (error) {
                console.warn('Premium usage sync failed', error.message);
            }
        } catch (err) {
            console.warn('Premium usage sync error', err);
        }
    }, [user?.id, user?.username, userKey]);

    useEffect(() => {
        syncPremiumUsageToSupabase(aiUsageCount);
    }, [aiUsageCount, syncPremiumUsageToSupabase]);

    const premiumOverlay = showPremiumPrompt ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--white)', border: '3px solid var(--black)', boxShadow: '8px 8px 0 var(--black)', maxWidth: 340, width: '100%', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, letterSpacing: '0.1em' }}>PREMIUM REQUIRED</h3>
                    <button onClick={() => setShowPremiumPrompt(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <Icon name="X" size={18} />
                    </button>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--black)', marginBottom: 12 }}>
                    {premiumMessage || 'Unlock premium to remove limits.'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 12 }}>
                    Unlimited AI runs, more than 3 crates, and persistent beat uploads come with premium access.
                </div>
                {revenueCatError ? (
                    <div style={{ fontSize: 11, padding: 10, marginBottom: 8, background: 'rgba(255,0,0,0.08)', border: '1px solid #b91c1c', color: '#7f1d1d' }}>
                        {revenueCatError}
                    </div>
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <button onClick={openRevenueCatPaywall} style={{ width: '100%', padding: 12, background: 'var(--black)', color: 'var(--white)', fontWeight: 800, letterSpacing: '0.1em', border: '2px solid var(--black)' }}>
                        UPGRADE WITH REVENUECAT
                    </button>
                    <button onClick={restoreRevenueCatPurchases} style={{ width: '100%', padding: 10, background: 'var(--white)', color: 'var(--black)', fontWeight: 700, letterSpacing: '0.08em', border: '2px dashed var(--black)' }}>
                        RESTORE PURCHASES
                    </button>
                    {window.RevenueCat?.presentCustomerCenter ? (
                        <button onClick={openRevenueCatCustomerCenter} style={{ width: '100%', padding: 10, background: 'var(--white)', color: 'var(--black)', fontWeight: 700, letterSpacing: '0.08em', border: '2px solid var(--black)' }}>
                            OPEN CUSTOMER CENTER
                        </button>
                    ) : null}
                </div>
                <button onClick={() => setShowPremiumPrompt(false)} style={{ width: '100%', padding: 10, background: 'transparent', color: 'var(--black)', fontWeight: 700, letterSpacing: '0.08em', border: '1px solid var(--black)' }}>
                    CLOSE
                </button>
            </div>
        </div>
    ) : null;

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

    const archiveBars = useMemo(() => {
        const query = archiveQuery.trim().toLowerCase();
        if (!query) return bars;

        return bars.filter((bar) => {
            const text = (bar.text || '').toLowerCase();
            const date = formatDate(bar.created_at || '').toLowerCase();
            const tags = Array.isArray(bar.tags) ? bar.tags.join(' ').toLowerCase() : '';
            return text.includes(query) || date.includes(query) || tags.includes(query);
        });
    }, [archiveQuery, bars]);
    
    const views = [
        { id: 'feed', label: 'FEED', subtitle: 'YOUR IDEAS' },
        { id: 'archive', label: 'ARCHIVE', subtitle: 'FLYER GRID' },
        { id: 'favorites', label: 'FAVORITES', subtitle: 'STARRED' },
        { id: 'crates', label: 'CRATES', subtitle: 'TRACKS' },
        { id: 'scratchlab', label: 'SCRATCH LAB', subtitle: 'VOCAL STUDIO' },
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
            console.log(`👤 User session active: @${user.username} (${user.email || 'no email'}), XP: ${user.xp || 0}`);
            
            // Refresh user XP from database to ensure it's current
            const refreshUserXP = async () => {
                try {
                    const res = await api.get('users', { limit: 1000 });
                    const dbUser = res.data?.find(u => u.username?.toLowerCase() === user.username?.toLowerCase());
                    if (dbUser && (dbUser.xp !== user.xp || dbUser.id !== user.id)) {
                        console.log(`🔄 Syncing user data from DB: XP=${dbUser.xp}, ID=${dbUser.id}`);
                        const updatedUser = { ...user, id: dbUser.id, xp: dbUser.xp || 0, level: dbUser.level || 1 };
                        setUser(updatedUser);
                        // Update localStorage too
                        const session = JSON.parse(localStorage.getItem('dailybars_session') || '{}');
                        session.user = updatedUser;
                        localStorage.setItem('dailybars_session', JSON.stringify(session));
                    }
                } catch (err) {
                    console.warn('Could not refresh user XP:', err);
                }
            };
            
            // Small delay to ensure state is settled
            const loadTimeout = setTimeout(() => {
                refreshUserXP();
                loadUserData(user);
            }, 100);
            return () => clearTimeout(loadTimeout);
        }
    }, [user?.username]); // Only re-run when username changes, not on every user object change
    
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
            
            // Update user stats in database (streak, total_bars)
            if (user?.username) {
                try {
                    await supabase.rpc('update_user_stats', { p_username: user.username });
                    
                    // Refresh user data to get updated stats
                    const { data: userData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('username', user.username)
                        .single();
                    
                    if (userData) {
                        setUser(prev => ({ ...prev, ...userData }));
                    }
                } catch (statsErr) {
                    console.warn('⚠️ Failed to update user stats:', statsErr);
                }
            }
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
            if (!hasPremium && songs.length >= 3) {
                requestPremium('Premium unlocks unlimited crates and beat uploads.');
                return null;
            }
            const newSong = await api.create('songs', {
                title: initialTitle,
                blocks: [],
                status: 'draft',
                isFavorite: false,
                coverImage: null,
                username: user.username,
                studio: '',
                producer: '',
                otherArtists: '',
                key: '',
                bpm: null
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
                beatUrl: songData.beatUrl,
                videoUrl: songData.videoUrl,
                username: user.username,
                studio: songData.studio || '',
                producer: songData.producer || '',
                otherArtists: songData.otherArtists || '',
                key: songData.key || '',
                bpm: songData.bpm ?? null
            });
            setSongs(prev => prev.map(s => s.id === songData.id ? updated : s));
            updateStreak();
        } catch (err) { throw err; }
    };
    
    const handleAddToCrate = async (songId, bar) => {
        try {
            const song = songs.find(s => s.id === songId);
            if (!song) return;

            const blocksToInsert = [];

            if (bar.audioUrl) {
                blocksToInsert.push({
                    id: generateId(),
                    type: 'audio',
                    content: bar.audioUrl
                });
            }

            if (bar.text?.trim()) {
                blocksToInsert.push({
                    id: generateId(),
                    type: 'text',
                    content: bar.text
                });
            }

            if (blocksToInsert.length === 0) return;

            const updatedBlocks = [...(song.blocks || []), ...blocksToInsert];

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
                <TrackEditor
                    song={editingSong}
                    onClose={() => setEditingSong(null)}
                    onSave={saveSong}
                    isPremium={hasPremium}
                    canUseAI={canUseAI}
                    onAIUse={noteAIUse}
                    onPremiumRequired={() => requestPremium('Unlock premium to edit with AI and upload beats that persist.')}
                    user={user}
                />
                {premiumOverlay}
            </ToastProvider>
        );
    }
    
    return (
        <ToastProvider>
            <div style={{ minHeight: '100vh', paddingBottom: 40, display: 'flex', flexDirection: 'column' }}
                {...(!isInputExpanded && !isScratchLabScrubbing ? swipeHandlers : {})}
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
                    archiveQuery={archiveQuery}
                    onArchiveSearch={setArchiveQuery}
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
                        canUseAI={canUseAI}
                        onAIUse={noteAIUse}
                        onPremiumRequired={() => requestPremium('AI tools are capped at 3 runs without premium.')}
                    />
                )}
                    {view === 'syndicate' && (
                        <SyndicateView 
                            user={user} 
                            onTyping={handleTyping} 
                            onOpenStore={() => setShowXPStore(true)}
                            onAction={addExperience}
                            onShowProfile={async (username) => {
                                // Fetch user by username and show profile
                                try {
                                    const { data } = await api.get('users');
                                    const targetUser = data.find(u => u.username?.toLowerCase() === username?.toLowerCase());
                                    if (targetUser) {
                                        setProfileModalUser(targetUser);
                                        setShowProfileModal(true);
                                    }
                                } catch (error) {
                                    console.error('Error fetching user:', error);
                                }
                            }}
                        />
                    )}
                    {view === 'archive' && <ArchiveView bars={archiveBars} onSelect={setSelectedBar} />}
                    {view === 'favorites' && <FavoritesView bars={bars} onSelect={setSelectedBar} />}
                    {view === 'crates' && <CratesView songs={songs} onCreateSong={() => createSong()} onEditSong={setEditingSong} />}
                    {view === 'scratchlab' && ScratchLabViewComponent && (
                        hasPremium || user?.username?.toLowerCase() === 'guap' ? (
                            <ScratchLabViewComponent 
                                user={user} 
                                isPremium={hasPremium} 
                                onScrubStateChange={setIsScratchLabScrubbing}
                            />
                        ) : (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                minHeight: '60vh',
                                padding: 40,
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 24,
                                    boxShadow: '0 20px 40px rgba(124, 58, 237, 0.3)'
                                }}>
                                    <Icon name="Lock" size={36} color="white" />
                                </div>
                                <h2 style={{
                                    fontSize: 20,
                                    fontFamily: 'Playfair Display, serif',
                                    fontWeight: 900,
                                    fontStyle: 'italic',
                                    marginBottom: 12,
                                    letterSpacing: '-0.01em'
                                }}>SCRATCH LAB</h2>
                                <p style={{
                                    fontSize: 11,
                                    color: 'var(--gray)',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    marginBottom: 32,
                                    lineHeight: 1.6,
                                    maxWidth: 400
                                }}>
                                    Premium vocal studio for layering tracks and recording over beats. VIP/Pro access only.
                                </p>
                                <button
                                    onClick={() => requestPremium('Unlock Scratch Lab with Premium to record unlimited vocal layers.')}
                                    style={{
                                        background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '16px 32px',
                                        fontSize: 10,
                                        fontWeight: 900,
                                        letterSpacing: '0.15em',
                                        textTransform: 'uppercase',
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(124, 58, 237, 0.3)',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 15px 30px rgba(124, 58, 237, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 10px 20px rgba(124, 58, 237, 0.3)';
                                    }}
                                >
                                    Unlock Premium
                                </button>
                            </div>
                        )
                    )}
                </main>

            {showXPStore && (
                <TrophyCaseView 
                    user={user} 
                    onClose={() => setShowXPStore(false)}
                    onSpendXP={async (amount) => {
                        // Subtract XP when spending on trophies
                        const newXp = Math.max(0, (user.xp || 0) - amount);
                        const updatedUser = { ...user, xp: newXp };
                        setUser(updatedUser);
                        localStorage.setItem('dailybars_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('dailybars_session') || '{}'), user: updatedUser }));
                        await api.update('users', user.id, { xp: newXp });
                        return true;
                    }}
                    onSelectForShowcase={async (trophyId) => {
                        // Toggle trophy selection for showcase
                        const currentSelected = user.selected_trophies || user.selectedTrophies || [];
                        let newSelected = [...currentSelected];
                        
                        if (newSelected.includes(trophyId)) {
                            // Deselect
                            newSelected = newSelected.filter(id => id !== trophyId);
                        } else {
                            // Select (max 3)
                            if (newSelected.length < 3) {
                                newSelected.push(trophyId);
                            } else {
                                // Replace oldest
                                newSelected.shift();
                                newSelected.push(trophyId);
                            }
                        }
                        
                        // Update database
                        await supabase
                            .from('users')
                            .update({ selected_trophies: newSelected })
                            .eq('id', user.id);
                        
                        // Update local state
                        const updatedUser = { ...user, selected_trophies: newSelected, selectedTrophies: newSelected };
                        setUser(updatedUser);
                        localStorage.setItem('dailybars_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('dailybars_session') || '{}'), user: updatedUser }));
                    }}
                />
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

                {premiumOverlay}

                <CassetteButton 
                    user={user} 
                    isOpen={showProfileModal}
                    onClick={() => {
                        setProfileModalUser(user);
                        setShowProfileModal(true);
                    }} 
                />
                
                {/* User Profile Modal */}
                {showProfileModal && profileModalUser && (
                    <UserProfileModal
                        user={profileModalUser}
                        onClose={() => {
                            setShowProfileModal(false);
                            setProfileModalUser(null);
                        }}
                        onLogout={() => {
                            setShowProfileModal(false);
                            setProfileModalUser(null);
                            handleLogout();
                        }}
                    />
                )}

                <BottomBar currentView={view} streak={streak} user={user} />
                
                {/* Level Up Modal */}
                {levelUpModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}>
                        <div 
                            onClick={() => setLevelUpModal(null)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.85)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 320,
                            backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: 4,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            border: '2px solid var(--black)',
                            textAlign: 'center'
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px 12px',
                                borderBottom: '2px solid var(--black)'
                            }}>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 900,
                                    letterSpacing: '0.15em',
                                    color: 'var(--black)'
                                }}>
                                    LEVEL UP!
                                </h2>
                            </div>
                            {/* Body */}
                            <div style={{ padding: '30px 20px' }}>
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
                                    <SvgIcon name="star" size={40} color="var(--white)" />
                                </div>
                                <div style={{ 
                                    fontSize: 56, 
                                    fontWeight: 900, 
                                    fontFamily: 'var(--font-display)',
                                    color: 'var(--black)',
                                    lineHeight: 1
                                }}>
                                    {levelUpModal}
                                </div>
                                <div style={{ 
                                    fontSize: 12, 
                                    letterSpacing: '0.2em',
                                    marginTop: 8,
                                    color: 'var(--gray)'
                                }}>
                                    NEW LEVEL ACHIEVED
                                </div>
                            </div>
                            {/* Action */}
                            <div style={{ padding: '0 20px 20px' }}>
                                <button
                                    onClick={() => setLevelUpModal(null)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        letterSpacing: '0.1em',
                                        border: 'none',
                                        background: 'var(--black)',
                                        color: 'var(--white)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    KEEP GRINDING
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ToastProvider>
    );
};

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
