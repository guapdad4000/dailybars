// ============================================================================
// DAILY BARS - GUAPDAD 4000 EDITION
// Oakland Energy meets Brutalist Design
// JavaScript Application Core
// NOW POWERED BY SUPABASE 🔥
// ============================================================================

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, memo } = React;

// ============================================================================
// SUPABASE CONFIG
// ============================================================================

const SUPABASE_URL = 'https://tilpgwoyyervbgdlucap.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHBnd295eWVydmJnZGx1Y2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTAwNDksImV4cCI6MjA4MjQ4NjA0OX0.Zw1DPMS91CxaNArACem74_-mR6IPmYpDqJksK8gwEk0';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// ASSETS
// ============================================================================

const LOGO_SOLID = "https://www.genspark.ai/api/files/s/5t2t8CLW";
const LOGO_HOLLOW = "https://i.postimg.cc/zBFYHrDy/Hollow.png";

// ============================================================================
// API WRAPPER (Supabase-powered)
// ============================================================================

// Debug flag - set to true in console to see API calls
window.DEBUG_API = false;

// Field mapping: frontend uses camelCase, Supabase uses snake_case
const toSnakeCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const mapped = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        // Special mappings
        if (key === 'imageUrl') mapped['image_url'] = value;
        else if (key === 'audioUrl') mapped['audio_url'] = value;
        else if (key === 'isFavorite') mapped['is_favorite'] = value;
        else if (key === 'aiGenerated') mapped['ai_generated'] = value;
        else if (key === 'coverImage') mapped['cover_image'] = value;
        else if (key === 'beatUrl') mapped['beat_url'] = value;
        else if (key === 'isVerified') mapped['is_verified'] = value;
        else if (key === 'lastLogin' || key === 'last_login') mapped['last_login'] = value;
        else if (key === 'promptText') mapped['prompt_text'] = value;
        else if (key === 'isVerified' || key === 'is_verified') mapped['is_verified'] = value;
        else mapped[snakeKey] = value;
    }
    return mapped;
};

const toCamelCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);
    const mapped = {};
    for (const [key, value] of Object.entries(obj)) {
        // Special mappings
        if (key === 'image_url') mapped['imageUrl'] = value;
        else if (key === 'audio_url') mapped['audioUrl'] = value;
        else if (key === 'is_favorite') mapped['isFavorite'] = value;
        else if (key === 'ai_generated') mapped['aiGenerated'] = value;
        else if (key === 'cover_image') mapped['coverImage'] = value;
        else if (key === 'beat_url') mapped['beatUrl'] = value;
        else if (key === 'is_verified') mapped['isVerified'] = value;
        else if (key === 'last_login') mapped['lastLogin'] = value;
        else if (key === 'prompt_text') mapped['promptText'] = value;
        else if (key === 'created_at') mapped['created_at'] = value;
        else if (key === 'updated_at') mapped['updated_at'] = value;
        else {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            mapped[camelKey] = value;
        }
    }
    return mapped;
};

const api = {
    async get(table, params = {}) {
        if (window.DEBUG_API) console.log(`🔵 SUPABASE GET: ${table}`, params);
        
        try {
            let query = supabase.from(table).select('*');
            
            // Handle sorting
            if (params.sort) {
                const sortField = params.sort.startsWith('-') ? params.sort.slice(1) : params.sort;
                const ascending = !params.sort.startsWith('-');
                // Convert camelCase to snake_case for sort field
                const snakeSortField = sortField.replace(/([A-Z])/g, '_$1').toLowerCase();
                query = query.order(snakeSortField, { ascending });
            } else {
                query = query.order('created_at', { ascending: false });
            }
            
            // Handle limit
            if (params.limit) {
                query = query.limit(parseInt(params.limit));
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error(`❌ SUPABASE GET /${table} failed:`, error.message);
                return { data: [], error: true, message: error.message };
            }
            
            const camelData = data.map(toCamelCase);
            if (window.DEBUG_API) console.log(`✅ SUPABASE GET /${table}:`, camelData);
            return { data: camelData };
        } catch (err) {
            console.error(`❌ SUPABASE GET /${table} error:`, err);
            return { data: [], error: true, message: err.message };
        }
    },
    
    async create(table, data) {
        if (window.DEBUG_API) console.log(`🟢 SUPABASE INSERT: ${table}`, data);
        
        try {
            // Remove fields Supabase handles automatically
            const { id, created_at, updated_at, ...cleanData } = data;
            const snakeData = toSnakeCase(cleanData);
            
            const { data: result, error } = await supabase
                .from(table)
                .insert(snakeData)
                .select()
                .single();
            
            if (error) {
                console.error(`❌ SUPABASE INSERT /${table} failed:`, error.message);
                throw new Error(`Create failed: ${error.message}`);
            }
            
            const camelResult = toCamelCase(result);
            if (window.DEBUG_API) console.log(`✅ SUPABASE INSERT /${table} success:`, camelResult);
            return camelResult;
        } catch (err) {
            console.error(`❌ SUPABASE INSERT /${table} error:`, err);
            throw err;
        }
    },
    
    async update(table, id, data) {
        if (window.DEBUG_API) console.log(`🟡 SUPABASE UPDATE: ${table}/${id}`, data);
        
        try {
            const { created_at, updated_at, ...cleanData } = data;
            const snakeData = toSnakeCase(cleanData);
            
            const { data: result, error } = await supabase
                .from(table)
                .update(snakeData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                console.error(`❌ SUPABASE UPDATE /${table}/${id} failed:`, error.message);
                throw new Error(`Update failed: ${error.message}`);
            }
            
            return toCamelCase(result);
        } catch (err) {
            console.error(`❌ SUPABASE UPDATE /${table}/${id} error:`, err);
            throw err;
        }
    },
    
    async patch(table, id, data) {
        // Patch is same as update in Supabase (partial update)
        return this.update(table, id, data);
    },
    
    async delete(table, id) {
        if (window.DEBUG_API) console.log(`🔴 SUPABASE DELETE: ${table}/${id}`);
        
        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);
            
            if (error) {
                console.error(`❌ SUPABASE DELETE /${table}/${id} failed:`, error.message);
                throw new Error(`Delete failed: ${error.message}`);
            }
            
            if (window.DEBUG_API) console.log(`✅ SUPABASE DELETE /${table}/${id} success`);
        } catch (err) {
            console.error(`❌ SUPABASE DELETE /${table}/${id} error:`, err);
            throw err;
        }
    }
};

// Expose supabase client globally for debugging
window.supabaseClient = supabase;

const GEMINI_API_KEY = 'AIzaSyApsL1hMBPZkd7dAmbKNRkmV3ox5E_IQC4';

const callAI = async (prompt, systemPrompt) => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt || 'You are GUAPDAD 4000\'s AI assistant. Write bars with Oakland energy - witty, slick, confident. Just output the bars, no explanations.'}\n\n${prompt}` }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 1024
                }
            })
        });
        if (!response.ok) throw new Error('AI request failed');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Couldn't generate. Try again.";
    } catch (error) {
        console.error('AI Error:', error);
        return "AI unavailable. Try again.";
    }
};

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 9);
const countWords = (text) => text?.trim().split(/\s+/).filter(Boolean).length || 0;
const countBars = (text) => text?.trim().split(/\n/).filter(Boolean).length || 0;

const formatDate = (dateStr) => {
    if (!dateStr) return 'NOW';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '.');
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
};

const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

const haptic = (type = 'light') => {
    if (navigator.vibrate) {
        const patterns = { light: 10, medium: 20, heavy: [30, 10, 30], success: [10, 50, 10] };
        navigator.vibrate(patterns[type] || 10);
    }
};

// ============================================================================
// RHYME CONNECT - Datamuse API
// ============================================================================

const fetchRhymes = async (word) => {
    try {
        const response = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=10`);
        const data = await response.json();
        return data.map(item => item.word);
    } catch (error) {
        console.error('Rhyme fetch error:', error);
        return [];
    }
};

const fetchNearRhymes = async (word) => {
    try {
        const response = await fetch(`https://api.datamuse.com/words?rel_nry=${encodeURIComponent(word)}&max=8`);
        const data = await response.json();
        return data.map(item => item.word);
    } catch (error) {
        console.error('Near rhyme fetch error:', error);
        return [];
    }
};

// ============================================================================
// DAILY DROP - INSPIRATION PROMPTS DATA
// ============================================================================

const DAILY_DROP_PROMPTS = [
    // Topic-based prompts
    { type: 'TOPIC', prompt: 'Spit 8 bars about LOYALTY', challenge: 'Use at least one metaphor' },
    { type: 'TOPIC', prompt: 'Write about a COME UP story', challenge: 'Reference a specific city block' },
    { type: 'TOPIC', prompt: 'Describe your DREAM CAR', challenge: 'Make it sound like poetry' },
    { type: 'TOPIC', prompt: 'Talk about LATE NIGHTS', challenge: 'Paint a picture with words' },
    { type: 'TOPIC', prompt: 'Write about FAKE FRIENDS', challenge: 'Keep it real, no cap' },
    { type: 'TOPIC', prompt: 'Bars about MAKING MOVES', challenge: 'Include a chess reference' },
    { type: 'TOPIC', prompt: 'Spit about YOUR CITY', challenge: 'Name drop 3 local spots' },
    { type: 'TOPIC', prompt: 'Write about GENERATIONAL WEALTH', challenge: 'Reference your ancestors' },
    { type: 'TOPIC', prompt: 'Talk about THE GRIND', challenge: 'Use 24/7 imagery' },
    { type: 'TOPIC', prompt: 'Bars about SELF-LOVE', challenge: 'No flexing on others' },
    
    // Word challenges
    { type: 'WORD DROP', prompt: 'Use the word "ALGORITHM"', challenge: 'Make it fit naturally in 4 bars' },
    { type: 'WORD DROP', prompt: 'Use the word "METAMORPHOSIS"', challenge: 'Describe a personal change' },
    { type: 'WORD DROP', prompt: 'Use the word "FREQUENCY"', challenge: 'Connect it to vibrations' },
    { type: 'WORD DROP', prompt: 'Use the word "CURRENCY"', challenge: 'Not about money, flip it' },
    { type: 'WORD DROP', prompt: 'Use the word "EMPIRE"', challenge: 'Building something bigger' },
    { type: 'WORD DROP', prompt: 'Use the word "LEVERAGE"', challenge: 'Game recognize game' },
    { type: 'WORD DROP', prompt: 'Use the word "BLUEPRINT"', challenge: 'Reference Jay-Z subtly' },
    { type: 'WORD DROP', prompt: 'Use the word "RENAISSANCE"', challenge: 'Rebirth energy' },
    
    // Structure challenges
    { type: 'FLOW CHECK', prompt: 'Write a HOOK that sticks', challenge: 'Make it memorable in 4 bars max' },
    { type: 'FLOW CHECK', prompt: 'Write DOUBLE TIME bars', challenge: 'Pack syllables per line' },
    { type: 'FLOW CHECK', prompt: 'Write a BRIDGE section', challenge: 'Transition between moods' },
    { type: 'FLOW CHECK', prompt: 'Write TRIPLET FLOW bars', challenge: 'Migos style, 8 bars' },
    { type: 'FLOW CHECK', prompt: 'Write INTERNAL RHYMES', challenge: 'Rhyme within each line' },
    
    // Mood prompts
    { type: 'MOOD', prompt: 'Write something INTROSPECTIVE', challenge: 'Late night vibes only' },
    { type: 'MOOD', prompt: 'Write something TRIUMPHANT', challenge: 'Victory lap energy' },
    { type: 'MOOD', prompt: 'Write something NOSTALGIC', challenge: 'Reference childhood memories' },
    { type: 'MOOD', prompt: 'Write something ROMANTIC', challenge: 'Keep it smooth, not corny' },
    { type: 'MOOD', prompt: 'Write something AGGRESSIVE', challenge: 'Channel that hunger' },
    
    // Collaboration prompts
    { type: 'COLLAB READY', prompt: 'Write a VERSE for Kendrick', challenge: 'Match his conscious energy' },
    { type: 'COLLAB READY', prompt: 'Write a VERSE for Drake', challenge: 'Melodic and catchy' },
    { type: 'COLLAB READY', prompt: 'Write a VERSE for J. Cole', challenge: 'Storytelling mode' },
    { type: 'COLLAB READY', prompt: 'Write a VERSE for Tyler', challenge: 'Get weird with it' },
    
    // Bay Area specific
    { type: 'BAY AREA', prompt: 'Write about THE TOWN', challenge: 'Oakland specific references' },
    { type: 'BAY AREA', prompt: 'Write about THE FOG', challenge: 'San Francisco metaphor' },
    { type: 'BAY AREA', prompt: 'Write about HYPHY', challenge: 'Ghost ride the whip energy' },
    { type: 'BAY AREA', prompt: 'Write about TECH MONEY', challenge: 'Silicon Valley observation' },
];

// ============================================================================
// DAILY DROP - Get daily prompt based on date
// ============================================================================

const getDailyPrompt = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % DAILY_DROP_PROMPTS.length;
    return DAILY_DROP_PROMPTS[index];
};

const getRandomPrompt = () => {
    const index = Math.floor(Math.random() * DAILY_DROP_PROMPTS.length);
    return DAILY_DROP_PROMPTS[index];
};

// ============================================================================
// VOICE MEMO RECORDING
// ============================================================================

const useVoiceRecorder = (maxDuration = 30000) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    
    const startRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunks.current = [];
            
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };
            
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.current.start();
            setIsRecording(true);
            startTimeRef.current = Date.now();
            
            timerRef.current = setInterval(() => {
                const elapsed = Date.now() - startTimeRef.current;
                setDuration(Math.floor(elapsed / 1000));
                
                if (elapsed >= maxDuration) {
                    stopRecording();
                }
            }, 100);
            
        } catch (err) {
            console.error('Recording error:', err);
            setError('MIC ACCESS DENIED');
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };
    
    const clearRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
    };
    
    const getBase64 = () => {
        return new Promise((resolve, reject) => {
            if (!audioBlob) {
                reject('No audio recorded');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
    };
    
    return { isRecording, audioBlob, audioUrl, duration, error, startRecording, stopRecording, clearRecording, getBase64 };
};

const processImage = (file, maxSize = 600) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ============================================================================
// HOOKS
// ============================================================================

const useSwipe = (onSwipeLeft, onSwipeRight, threshold = 80) => {
    const touchStart = useRef({ x: 0, y: 0 });
    const touchEnd = useRef({ x: 0, y: 0 });
    const swiping = useRef(false);
    
    const onTouchStart = (e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        swiping.current = false;
    };
    
    const onTouchMove = (e) => {
        touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const dx = Math.abs(touchEnd.current.x - touchStart.current.x);
        const dy = Math.abs(touchEnd.current.y - touchStart.current.y);
        if (dx > dy && dx > 20) swiping.current = true;
    };
    
    const onTouchEnd = () => {
        if (!swiping.current) return;
        const dx = touchStart.current.x - touchEnd.current.x;
        if (Math.abs(dx) > threshold) {
            haptic('light');
            if (dx > 0) onSwipeLeft?.();
            else onSwipeRight?.();
        }
    };
    
    return { onTouchStart, onTouchMove, onTouchEnd };
};

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext(null);

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    
    const addToast = useCallback((message, type = 'info') => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type }]);
        haptic(type === 'success' ? 'success' : 'light');
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
    }, []);
    
    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div style={{ position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 1000, pointerEvents: 'none' }}>
                {toasts.map(toast => (
                    <div key={toast.id} className="animate-slide-up" style={{
                        background: toast.type === 'error' ? '#FF0000' : 'var(--black)',
                        color: 'var(--white)',
                        padding: '12px 16px',
                        marginBottom: 8,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '2px solid var(--black)',
                        boxShadow: '4px 4px 0 0 var(--electric)',
                        pointerEvents: 'auto'
                    }}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => useContext(ToastContext);

// ============================================================================
// ICON
// ============================================================================

const Icon = ({ name, size = 20, color, style }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current && lucide[name]) {
            ref.current.innerHTML = '';
            const icon = lucide.createElement(lucide[name]);
            icon.setAttribute('width', size);
            icon.setAttribute('height', size);
            icon.setAttribute('stroke-width', '2');
            if (color) icon.setAttribute('stroke', color);
            ref.current.appendChild(icon);
        }
    }, [name, size, color]);
    return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }} />;
};

// ============================================================================
// DAILY DROP WIDGET COMPONENT
// ============================================================================

const DailyDropWidget = ({ onUsePrompt, isHeaderMode = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasUsedToday, setHasUsedToday] = useState(false);
    const toast = useToast();
    
    // Initial Load
    useEffect(() => {
        const loadInitial = async () => {
            if (!currentPrompt) {
                setLoading(true);
                const prompt = await window.DailyDepositEngine.generatePrompt();
                setCurrentPrompt(prompt);
                setLoading(false);
            }
        };
        loadInitial();
        
        const today = new Date().toDateString();
        const lastUsed = localStorage.getItem('dailydrop_last_used');
        if (lastUsed === today) {
            setHasUsedToday(true);
        }
    }, []);
    
    const handleOpen = () => {
        setIsOpen(true);
        haptic('medium');
    };
    
    const handleClose = () => {
        setIsOpen(false);
    };
    
    const handleShuffle = async () => {
        setLoading(true);
        haptic('light');
        const newPrompt = await window.DailyDepositEngine.generatePrompt();
        setCurrentPrompt(newPrompt);
        setLoading(false);
    };
    
    const handleUsePrompt = () => {
        const today = new Date().toDateString();
        localStorage.setItem('dailydrop_last_used', today);
        setHasUsedToday(true);
        
        onUsePrompt?.(currentPrompt);
        setIsOpen(false);
        haptic('success');
        toast?.addToast('PROMPT LOADED - GO OFF! 🔥', 'success');
    };
    
    const streakCount = parseInt(localStorage.getItem('dailydrop_streak') || '0');
    
    // Two Dice SVG Component - Black and White
    const DiceIcon = () => (
        <svg width="32" height="20" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* White Die (back, slightly offset) */}
            <rect x="10" y="2" width="14" height="14" rx="2" fill="var(--white)" stroke="var(--black)" strokeWidth="1.5"/>
            {/* White die dots */}
            <circle cx="14" cy="6" r="1.2" fill="var(--black)"/>
            <circle cx="20" cy="6" r="1.2" fill="var(--black)"/>
            <circle cx="17" cy="9" r="1.2" fill="var(--black)"/>
            <circle cx="14" cy="12" r="1.2" fill="var(--black)"/>
            <circle cx="20" cy="12" r="1.2" fill="var(--black)"/>
            
            {/* Black Die (front, overlapping) */}
            <rect x="4" y="4" width="14" height="14" rx="2" fill="var(--black)" stroke="var(--black)" strokeWidth="1.5"/>
            {/* Black die dots (white) */}
            <circle cx="8" cy="8" r="1.2" fill="var(--white)"/>
            <circle cx="14" cy="8" r="1.2" fill="var(--white)"/>
            <circle cx="8" cy="14" r="1.2" fill="var(--white)"/>
            <circle cx="14" cy="14" r="1.2" fill="var(--white)"/>
        </svg>
    );
    
    return (
        <>
            {/* Header Trigger Button - Two Dice Black & White */}
            <button 
                onClick={handleOpen}
                className={!hasUsedToday ? 'animate-bounce' : ''}
                style={{ 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    animationDuration: '2s', 
                    animationIterationCount: hasUsedToday ? '0' : 'infinite'
                }}
                title="Daily Drop - Get Inspired"
            >
                <DiceIcon />
                {!hasUsedToday && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        background: 'var(--recording-red)',
                        borderRadius: '50%',
                        border: '1px solid var(--white)',
                        animation: 'pulse 1s ease-in-out infinite'
                    }} />
                )}
            </button>
            
            {/* Modal */}
            {isOpen && (
                <div className="daily-drop-modal animate-fade-in" onClick={handleClose}>
                    <div 
                        className="daily-drop-card animate-scale-in" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="daily-drop-header">
                            <div className="daily-drop-header-title">
                                <DiceIcon />
                                <span>THE DAILY DROP</span>
                            </div>
                            <button onClick={handleClose} style={{ color: 'var(--white)', padding: 4 }}>
                                <Icon name="X" size={20} color="white" />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="daily-drop-content">
                            {loading || !currentPrompt ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <span className="animate-spin" style={{ display: 'inline-block', fontSize: 24 }}>⟳</span>
                                    <div style={{ fontSize: 10, marginTop: 10, letterSpacing: '0.1em' }}>MIXING INGREDIENTS...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="daily-drop-prompt-type">
                                        {currentPrompt.type}
                                    </div>
                                    <div className="daily-drop-prompt-text font-serif">
                                        {currentPrompt.prompt}
                                    </div>
                                    <div className="daily-drop-challenge">
                                        {currentPrompt.challenge}
                                    </div>
                                    
                                    {/* Vocab Section */}
                                    {currentPrompt.vocab && currentPrompt.vocab.length > 0 && (
                                        <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12 }}>
                                            <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: '0.1em', marginBottom: 6 }}>REQUIRED VOCAB</div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {currentPrompt.vocab.map((word, i) => (
                                                    <span key={i} style={{ 
                                                        background: 'var(--white)', 
                                                        color: 'var(--black)', 
                                                        padding: '4px 8px', 
                                                        fontSize: 11, 
                                                        fontWeight: 'bold',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="daily-drop-footer">
                            <button 
                                onClick={handleShuffle}
                                className="daily-drop-btn daily-drop-btn-secondary"
                            >
                                <Icon name="Shuffle" size={14} style={{ marginRight: 6 }} />
                                SHUFFLE
                            </button>
                            <button 
                                onClick={handleUsePrompt}
                                className="daily-drop-btn daily-drop-btn-primary"
                            >
                                <Icon name="Zap" size={14} style={{ marginRight: 6, color: 'var(--white)' }} />
                                USE THIS
                            </button>
                        </div>
                        
                        {/* Streak indicator */}
                        {streakCount > 0 && (
                            <div className="daily-drop-streak">
                                <span>🔥</span>
                                <span>{streakCount} DAY PROMPT STREAK</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================================================
// IMAGE PREVIEW MODAL
// ============================================================================

const ImagePreview = ({ src, onClose }) => {
    if (!src) return null;
    
    return (
        <div 
            onClick={onClose}
            className="animate-fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.95)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                cursor: 'pointer'
            }}
        >
            <img 
                src={src} 
                alt="" 
                className="animate-scale-in"
                style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                    border: '4px solid var(--white)'
                }}
            />
            <div style={{
                position: 'absolute',
                bottom: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'var(--white)',
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.6
            }}>
                TAP ANYWHERE TO CLOSE
            </div>
        </div>
    );
};

// ============================================================================
// BOTTOM STATUS BAR
// ============================================================================

const BottomBar = ({ currentView, streak }) => {
    const getBorderColor = () => {
        switch(currentView) {
            case 'feed': return 'var(--brand-green)';
            case 'archive': return '#4A2C2A';
            case 'favorites': return 'var(--electric)';
            case 'crates': return '#1E3A8A';
            default: return 'var(--black)';
        }
    };

    // Nuclear option - expose global function to force clear everything
    window.RESTORE_DATA = async (backupJson) => {
        try {
            console.log('📦 Starting data restoration...', backupJson);
            const data = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson;
            const { bars, songs, users } = data;
            
            // Helper to restore any table
            const restoreTable = async (tableName, rows) => {
                if (!rows || !rows.length) return;
                console.log(`📥 Restoring ${rows.length} rows to ${tableName}...`);
                for (const row of rows) {
                    const { created_at, updated_at, ...cleanRow } = row;
                    try { await api.create(tableName, cleanRow); } 
                    catch(e) { console.log(`Skip ${tableName} row:`, row.id || '?'); }
                }
            };

            // Restore Core Data
            if (users?.data) await restoreTable('users', users.data);
            if (bars?.data) await restoreTable('bars', bars.data);
            if (songs?.data) await restoreTable('songs', songs.data);

            // Restore Syndicate Data (Prompts)
            const promptTables = ['prompts_feelings', 'prompts_settings', 'prompts_objects', 'prompts_smells', 'prompts_vocab'];
            for (const table of promptTables) {
                if (data[table]?.data) {
                    await restoreTable(table, data[table].data);
                }
            }
            
            console.log('✅ Restoration complete! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
            return "Restoration Started - Check Console";
        } catch (err) {
            console.error('❌ Restoration failed:', err);
            return "Error: " + err.message;
        }
    };

    // EXPORT ALL DATA FUNCTION
    window.EXPORT_ALL_DATA = async () => {
        console.log("⏳ Fetching your data...");
        try {
            const bars = await api.get('bars', { limit: 1000 });
            const songs = await api.get('songs', { limit: 1000 });
            const users = await api.get('users', { limit: 1000 });
            
            const backup = { bars, songs, users, date: new Date().toISOString() };
            
            console.clear();
            console.log("✅ DATA SECURED. COPY EVERYTHING BETWEEN THE LINES BELOW:");
            console.log("---------------------------------------------------");
            console.log(JSON.stringify(backup));
            console.log("---------------------------------------------------");
            console.log("⬆️ TRIPLE CLICK THE TEXT ABOVE TO SELECT ALL -> COPY");
            return "CHECK CONSOLE FOR DATA";
        } catch (e) {
            console.error("❌ Could not fetch data.", e);
            return "Error fetching data";
        }
    };

    const [showBackup, setShowBackup] = useState(false);
    const [backupData, setBackupData] = useState('');
    const [textExportData, setTextExportData] = useState('');

    const handleBackup = async () => {
        try {
            setBackupData('GENERATING BACKUP...');
            setShowBackup(true);
            
            const bars = await api.get('bars', { limit: 1000 });
            const songs = await api.get('songs', { limit: 1000 });
            
            // Generate basic text export
            const textContent = `DAILY BARS ARCHIVE - ${new Date().toLocaleDateString()}\n\n` + 
                bars.data.map(b => `[${formatDate(b.created_at)}]\n${b.text}\n${b.tags ? b.tags.map(t => '#' + t).join(' ') : ''}`).join('\n\n---\n\n');
            
            // Full JSON backup
            const fullBackup = {
                bars, songs, 
                date: new Date().toISOString()
            };
            
            setBackupData(JSON.stringify(fullBackup, null, 2));
            setTextExportData(textContent);
        } catch (err) {
            setBackupData('ERROR GENERATING BACKUP: ' + err.message);
        }
    };

    const downloadTxt = () => {
        const blob = new Blob([textExportData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dailybars-archive-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--white)',
                color: 'var(--black)',
                padding: '8px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 9,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                zIndex: 100,
                borderTop: `4px solid ${getBorderColor()}`,
                transition: 'border-color 0.3s ease',
                paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
            }}>
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} <span style={{ opacity: 0.3, fontSize: 8, marginLeft: 4 }}>v11</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleBackup} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        💾
                    </button>
                    <span style={{ color: 'var(--black)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="animate-pulse">🔥</span> {streak} DAY STREAK
                    </span>
                </div>
            </div>

            {showBackup && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.95)',
                    zIndex: 2000,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h2 style={{ fontSize: 14 }}>YOUR DATA ARCHIVE</h2>
                        <button onClick={() => setShowBackup(false)} style={{ color: 'white' }}>CLOSE</button>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <button 
                            onClick={downloadTxt}
                            style={{
                                flex: 1, padding: 12, background: 'var(--white)', color: 'var(--black)',
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em'
                            }}
                        >
                            DOWNLOAD .TXT
                        </button>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(backupData); alert('JSON COPIED!'); }}
                            style={{
                                flex: 1, padding: 12, border: '1px solid var(--white)', color: 'var(--white)',
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.1em'
                            }}
                        >
                            COPY JSON BACKUP
                        </button>
                    </div>
                    <div style={{ fontSize: 10, marginBottom: 10, color: '#aaa' }}>
                        RAW BACKUP DATA (FOR RESTORE):
                    </div>
                    <textarea 
                        readOnly
                        value={backupData}
                        style={{
                            flex: 1,
                            background: '#111',
                            color: '#0f0',
                            fontFamily: 'monospace',
                            fontSize: 10,
                            border: '1px solid #333',
                            padding: 10
                        }}
                    />
                </div>
            )}
        </>
    );
};

// ============================================================================
// UNIFIED HEADER
// ============================================================================

const Header = ({ title, subtitle, currentView, views, onViewChange, isTyping, onDailyDropUse }) => {
    // Determine active index safely
    const activeIndex = Math.max(0, views.findIndex(v => v.id === currentView));

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'url(images/smooth-paper-texture.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottom: '2px solid var(--black)'
        }}>
            {/* Main header - Big Boss Logo */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: 10,
                paddingBottom: 0
            }}>
                <img src={LOGO_SOLID} alt="Daily Bars" style={{ width: '80%', maxWidth: 300, height: 'auto', objectFit: 'contain' }} /> 
            </div>
            
            {/* Unified Control Bar - with Daily Drop in corner */}
            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px 10px',
                gap: 2
            }}>
                {/* Daily Drop Dice - Bottom Right Corner */}
                <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 12,
                    zIndex: 10
                }}>
                    <DailyDropWidget onUsePrompt={onDailyDropUse} isHeaderMode={true} />
                </div>
                
                {/* Title & Subtitle */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                }}>
                    <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase'
                    }}>
                        {title}
                    </span>
                    {subtitle && (
                        <span style={{
                            fontSize: 9,
                            color: 'var(--gray)',
                            letterSpacing: '0.1em'
                        }}>
                            — {subtitle}
                        </span>
                    )}
                </div>
                
                {/* Navigation Dots (Subway Train Style) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 2,
                    height: 32
                }}>
                    <svg width="220" height="32" viewBox="0 0 220 32" style={{ overflow: 'visible' }}>
                        {/* The Track */}
                        <line x1="10" y1="26" x2="210" y2="26" stroke="var(--black)" strokeWidth="2" strokeLinecap="square" opacity="0.3" />
                        <line x1="10" y1="29" x2="210" y2="29" stroke="var(--black)" strokeWidth="2" strokeLinecap="square" opacity="0.3" />
                        
                        {/* Static Stations */}
                        {views.map((v, i) => {
                            const cx = 30 + (i * 40); 
                            const isActive = currentView === v.id;
                            const letter = v.id === 'favorites' ? '★' : v.label[0];
                            
                            return (
                                <g 
                                    key={v.id} 
                                    onClick={() => { onViewChange(v.id); haptic('light'); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <circle 
                                        cx={cx} cy="26" 
                                        r="7" 
                                        fill={isActive ? "var(--brand-red)" : "var(--white)"} 
                                        stroke="var(--black)" 
                                        strokeWidth="1.5"
                                        style={{ transition: 'fill 0.3s ease' }}
                                    />
                                    <text 
                                        x={cx} y="26" dy="3" 
                                        textAnchor="middle" 
                                        fill={isActive ? "var(--white)" : "var(--black)"} 
                                        fontSize={v.id === 'favorites' ? "10" : "8"} 
                                        fontFamily="'Archivo Black', sans-serif" 
                                        fontWeight="bold"
                                    >
                                        {letter}
                                    </text>
                                </g>
                            );
                        })}
                        
                        {/* The Animated Train Car */}
                        <g 
                            className={isTyping ? 'animate-rock' : ''}
                            style={{ 
                                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: `translateX(${30 + (activeIndex * 40) - 30}px)`,
                                transformOrigin: 'center bottom'
                            }}
                        >
                            <rect x="6" y="13" width="48" height="16" rx="1" fill="#D4D4D8" stroke="var(--black)" strokeWidth="2"/>
                            <rect x="6" y="13" width="48" height="3" fill="#FCD34D" stroke="var(--black)" strokeWidth="1"/>
                            <line x1="15" y1="16" x2="15" y2="29" stroke="#A1A1AA" strokeWidth="0.5" opacity="0.6"/>
                            <line x1="24" y1="16" x2="24" y2="29" stroke="#A1A1AA" strokeWidth="0.5" opacity="0.6"/>
                            <line x1="33" y1="16" x2="33" y2="29" stroke="#A1A1AA" strokeWidth="0.5" opacity="0.6"/>
                            <line x1="42" y1="16" x2="42" y2="29" stroke="#A1A1AA" strokeWidth="0.5" opacity="0.6"/>
                            <rect x="8" y="16" width="8" height="13" fill="#A1A1AA" stroke="var(--black)" strokeWidth="1"/>
                            <rect x="23" y="16" width="8" height="13" fill="#A1A1AA" stroke="var(--black)" strokeWidth="1"/>
                            <rect x="38" y="16" width="8" height="13" fill="#A1A1AA" stroke="var(--black)" strokeWidth="1"/>
                            <rect x="9.5" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <rect x="17" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <rect x="24.5" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <rect x="32" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <rect x="39.5" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <rect x="47" y="17.5" width="5" height="5" fill="#FFFFFF" stroke="var(--black)" strokeWidth="0.8" className={isTyping ? 'animate-flash' : ''} />
                            <circle cx="30" cy="25" r="3.5" fill="#DC2626" stroke="var(--black)" strokeWidth="1.2"/>
                            <text x="30" y="25" dy="1.2" textAnchor="middle" fill="var(--white)" fontSize="6" fontFamily="'Helvetica', 'Arial', sans-serif" fontWeight="bold">R</text>
                            <circle cx="15" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                            <circle cx="15" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                            <circle cx="30" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                            <circle cx="30" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                            <circle cx="45" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                            <circle cx="45" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                            <rect x="10" y="28" width="40" height="1" fill="var(--black)" opacity="0.3"/>
                        </g>
                    </svg>
                </div>
            </div>
        </header>
    );
};

// ============================================================================
// SOCIAL EXPORT MODAL
// ============================================================================

const SocialExportModal = ({ bar, onClose }) => {
    const [exporting, setExporting] = useState(false);
    const [imageData, setImageData] = useState(null);
    const exportRef = useRef(null);
    const toast = useToast();
    
    const generateImage = async () => {
        if (!exportRef.current) return;
        
        setExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false
            });
            
            const dataUrl = canvas.toDataURL('image/png');
            setImageData(dataUrl);
            haptic('success');
        } catch (err) {
            console.error('Export error:', err);
            toast?.addToast('EXPORT FAILED', 'error');
        }
        setExporting(false);
    };
    
    const downloadImage = () => {
        if (!imageData) return;
        
        const link = document.createElement('a');
        link.download = `daily-bars-${Date.now()}.png`;
        link.href = imageData;
        link.click();
        haptic('success');
        toast?.addToast('DOWNLOADED!', 'success');
    };
    
    useEffect(() => {
        generateImage();
    }, []);
    
    if (!bar) return null;
    
    return (
        <div 
            className="animate-fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.9)',
                zIndex: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20
            }}
        >
            <button 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    color: 'var(--white)',
                    padding: 10
                }}
            >
                <Icon name="X" size={28} />
            </button>
            
            <div 
                ref={exportRef}
                style={{
                    width: 360,
                    minHeight: 400,
                    backgroundImage: 'url(images/smooth-paper-texture.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '4px solid var(--black)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24
                }}>
                    <img 
                        src={LOGO_SOLID} 
                        crossOrigin="anonymous"
                        alt="Daily Bars" 
                        style={{ width: 140, height: 'auto' }} 
                    />
                    <div style={{
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        textAlign: 'right',
                        color: 'var(--gray)'
                    }}>
                        {formatDate(bar.created_at)}
                    </div>
                </div>
                
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px 0',
                    gap: 16
                }}>
                    {bar.imageUrl && (
                        <img 
                            src={bar.imageUrl} 
                            crossOrigin="anonymous"
                            alt="" 
                            style={{
                                width: '100%',
                                maxHeight: 200,
                                objectFit: 'cover',
                                border: '2px solid var(--black)',
                                filter: 'grayscale(100%)'
                            }}
                        />
                    )}
                    
                    <div 
                        className="font-serif"
                        style={{
                            fontSize: bar.imageUrl ? 18 : 22,
                            lineHeight: 1.6,
                            textAlign: 'center',
                            fontWeight: 700,
                            fontStyle: 'italic',
                            color: 'var(--black)',
                            maxWidth: 300
                        }}
                    >
                        "{bar.text}"
                    </div>
                </div>
                
                <div style={{
                    borderTop: '2px solid var(--black)',
                    paddingTop: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        color: 'var(--black)'
                    }}>
                        @GUAPDAD4000
                    </div>
                    <div style={{
                        background: 'var(--electric)',
                        padding: '4px 10px',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.1em'
                    }}>
                        DAILY BARS
                    </div>
                </div>
            </div>
            
            <div style={{
                marginTop: 24,
                display: 'flex',
                gap: 12
            }}>
                {exporting ? (
                    <div style={{
                        color: 'var(--white)',
                        fontSize: 12,
                        letterSpacing: '0.1em'
                    }}>
                        <span className="animate-pulse">GENERATING...</span>
                    </div>
                ) : imageData ? (
                    <>
                        <button 
                            onClick={downloadImage}
                            style={{
                                padding: '14px 28px',
                                background: 'var(--electric)',
                                color: 'var(--black)',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                border: '2px solid var(--black)'
                            }}
                        >
                            <Icon name="Download" size={18} /> DOWNLOAD PNG
                        </button>
                        <button 
                            onClick={generateImage}
                            style={{
                                padding: '14px 20px',
                                background: 'var(--white)',
                                color: 'var(--black)',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                border: '2px solid var(--black)'
                            }}
                        >
                            <Icon name="RefreshCw" size={18} />
                        </button>
                    </>
                ) : null}
            </div>
            
            <div style={{
                marginTop: 20,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textAlign: 'center'
            }}>
                SAVE & SHARE TO IG STORIES, X, OR THREADS
            </div>
        </div>
    );
};

// ============================================================================
// IDEA CARD
// ============================================================================

const IdeaCard = ({ bar, index, onImageClick, onTextEdit, onFavorite, onDelete, onAddToCrate, onSendToFreeGame }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(bar.text);
    const [showExport, setShowExport] = useState(false);
    const [showFreeGameConfirm, setShowFreeGameConfirm] = useState(false);
    const textRef = useRef(null);
    const toast = useToast();
    const imageOnRight = index % 2 === 0;
    
    const handleTextClick = () => {
        setIsEditing(true);
        // Delay focus to allow render
        setTimeout(() => {
            if (textRef.current) {
                textRef.current.style.height = 'auto';
                textRef.current.style.height = textRef.current.scrollHeight + 'px';
                textRef.current.focus();
            }
        }, 50);
    };
    
    // Auto-resize effect when entering edit mode
    useEffect(() => {
        if (isEditing && textRef.current) {
            textRef.current.style.height = 'auto';
            textRef.current.style.height = textRef.current.scrollHeight + 'px';
        }
    }, [isEditing]);
    
    const handleTextBlur = () => {
        setIsEditing(false);
        if (editText !== bar.text) {
            onTextEdit(bar.id, editText);
            toast?.addToast('SAVED', 'success');
        }
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setEditText(bar.text);
            setIsEditing(false);
        }
    };
    
    if (bar.imageUrl) {
        return (
            <article 
                className="animate-slide-up" 
                style={{
                    display: 'flex',
                    flexDirection: imageOnRight ? 'row' : 'row-reverse',
                    background: 'var(--white)',
                    borderBottom: '2px solid var(--black)',
                    minHeight: 140
                }}
            >
                <div 
                    onClick={() => onImageClick(bar.imageUrl)}
                    style={{
                        width: '35%',
                        minHeight: 140,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderLeft: imageOnRight ? 'none' : '2px solid var(--black)',
                        borderRight: imageOnRight ? '2px solid var(--black)' : 'none',
                        position: 'relative'
                    }}
                >
                    <img 
                        src={bar.imageUrl} 
                        alt="" 
                        className="card-image"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        background: 'var(--black)',
                        color: 'var(--white)',
                        padding: '2px 6px',
                        fontSize: 7,
                        letterSpacing: '0.1em'
                    }}>
                        TAP TO EXPAND
                    </div>
                </div>
                
                <div style={{ 
                    flex: 1, 
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 6 // Reduced margin
                    }}>
                        <div style={{
                            fontSize: 9,
                            color: 'var(--gray)',
                            letterSpacing: '0.05em'
                        }}>
                            {formatDate(bar.created_at)}
                            {bar.aiGenerated && (
                                <span style={{
                                    marginLeft: 6,
                                    background: 'var(--electric)',
                                    color: 'var(--black)',
                                    padding: '1px 4px',
                                    fontWeight: 700
                                }}>AI</span>
                            )}
                        </div>
                        <button 
                            onClick={() => onFavorite(bar.id, !bar.isFavorite)}
                            style={{ color: bar.isFavorite ? 'var(--black)' : 'var(--light-gray)' }}
                        >
                            <Icon name="Star" size={14} />
                        </button>
                    </div>
                    
                    {isEditing ? (
                        <textarea
                            ref={textRef}
                            value={editText}
                            onChange={(e) => {
                                setEditText(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onBlur={handleTextBlur}
                            onKeyDown={handleKeyDown}
                            style={{
                                flex: 1,
                                fontSize: 13,
                                lineHeight: 1.5,
                                resize: 'none',
                                background: 'var(--electric)',
                                padding: 8,
                                margin: -8,
                                overflow: 'hidden'
                            }}
                        />
                    ) : (
                        <div 
                            onClick={handleTextClick}
                            className="inline-edit font-mono"
                            style={{
                                flex: 1,
                                fontSize: 13,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                cursor: 'text',
                                padding: 4,
                                margin: -4,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical'
                            }}
                        >
                            {bar.text}
                        </div>
                    )}
                    
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4, // Reduced margin
                        paddingTop: 6, // Reduced padding
                        borderTop: '1px solid var(--light-gray)'
                    }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {bar.tags?.slice(0, 2).map((tag, i) => (
                                <span key={i} style={{
                                    fontSize: 8,
                                    padding: '2px 6px',
                                    border: '1px solid var(--black)',
                                    textTransform: 'uppercase'
                                }}>#{tag}</span>
                            ))}
                        </div>
                        <button onClick={() => onDelete(bar.id)} style={{ color: 'var(--gray)' }}>
                            <Icon name="Trash2" size={12} />
                        </button>
                    </div>
                </div>
            </article>
        );
    }
    
    return (
        <article className="animate-slide-up" style={{
            background: 'var(--white)',
            borderBottom: '2px solid var(--black)',
            padding: 16
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
            }}>
                <div style={{
                    fontSize: 9,
                    color: 'var(--gray)',
                    letterSpacing: '0.05em'
                }}>
                    {formatDate(bar.created_at)} — {formatTime(bar.created_at)}
                    {bar.aiGenerated && (
                        <span style={{
                            marginLeft: 6,
                            background: 'var(--electric)',
                            color: 'var(--black)',
                            padding: '1px 4px',
                            fontWeight: 700
                        }}>AI</span>
                    )}
                </div>
                <button 
                    onClick={() => onFavorite(bar.id, !bar.isFavorite)}
                    style={{ color: bar.isFavorite ? 'var(--black)' : 'var(--light-gray)' }}
                >
                    <Icon name="Star" size={16} />
                </button>
            </div>
            
            {isEditing ? (
                <textarea
                    ref={textRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleTextBlur}
                    onKeyDown={handleKeyDown}
                    className="font-serif"
                    style={{
                        width: '100%',
                        minHeight: 80,
                        fontSize: 18,
                        lineHeight: 1.5,
                        resize: 'none',
                        background: 'var(--electric)',
                        padding: 8,
                        margin: -8
                    }}
                />
            ) : (
                <div 
                    onClick={handleTextClick}
                    className="inline-edit font-serif"
                    style={{
                        fontSize: 18,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        cursor: 'text',
                        padding: 4,
                        margin: -4
                    }}
                >
                    {bar.text}
                </div>
            )}
            
            {bar.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {bar.tags.map((tag, i) => (
                        <span key={i} style={{
                            fontSize: 9,
                            padding: '3px 8px',
                            border: '1px solid var(--black)',
                            textTransform: 'uppercase'
                        }}>#{tag}</span>
                    ))}
                </div>
            )}
            
            {bar.audioUrl && (
                <div style={{
                    marginTop: 12,
                    padding: 10,
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <Icon name="Mic" size={14} color="#EF4444" />
                    <audio src={bar.audioUrl} controls style={{ flex: 1, height: 32 }} />
                </div>
            )}
            
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
                paddingTop: 6,
                borderTop: '1px solid var(--light-gray)'
            }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={() => { copyToClipboard(bar.text); toast?.addToast('COPIED', 'success'); }}
                        style={{ color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: '0.1em' }}
                    >
                        <Icon name="Copy" size={12} /> COPY
                    </button>
                    <button 
                        onClick={() => setShowExport(true)}
                        style={{ color: '#E91E63', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: '0.1em' }}
                    >
                        <Icon name="Share2" size={12} /> POST THAT
                    </button>
                    <button 
                        onClick={() => onAddToCrate && onAddToCrate(bar)}
                        style={{ color: 'var(--crates-blue)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: '0.1em' }}
                    >
                        <Icon name="Disc" size={12} /> CRATE
                    </button>
                    {onSendToFreeGame && (
                        <button 
                            onClick={() => setShowFreeGameConfirm(true)}
                            style={{ color: 'var(--brand-green)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: '0.1em' }}
                        >
                            <Icon name="Globe" size={12} /> FREE GAME
                        </button>
                    )}
                </div>
                <button onClick={() => onDelete(bar.id)} style={{ color: 'var(--gray)' }}>
                    <Icon name="Trash2" size={14} />
                </button>
            </div>
            
            {showExport && <SocialExportModal bar={bar} onClose={() => setShowExport(false)} />}
            
            {showFreeGameConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                    <div style={{ background: 'var(--white)', padding: 20, border: '4px solid var(--black)', maxWidth: 300, textAlign: 'center' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>CONFIRM FREE GAME?</h3>
                        <p style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 20 }}>
                            This will post your bar to the public Free Game feed for anyone to use.
                            You will still keep this copy in your personal feed.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowFreeGameConfirm(false)} style={{
                                flex: 1, padding: 12, border: '2px solid var(--black)', fontSize: 10, fontWeight: 700
                            }}>CANCEL</button>
                            <button onClick={() => { onSendToFreeGame(bar); setShowFreeGameConfirm(false); }} style={{
                                flex: 1, padding: 12, background: 'var(--brand-green)', color: 'white', fontSize: 10, fontWeight: 700
                            }}>SEND IT</button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

// ============================================================================
// RHYME POPUP
// ============================================================================

const RhymePopup = ({ word, position, onSelect, onClose }) => {
    const [rhymes, setRhymes] = useState([]);
    const [nearRhymes, setNearRhymes] = useState([]);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef(null);
    
    useEffect(() => {
        const loadRhymes = async () => {
            setLoading(true);
            const [exactRhymes, nearRhymeResults] = await Promise.all([
                fetchRhymes(word),
                fetchNearRhymes(word)
            ]);
            setRhymes(exactRhymes);
            setNearRhymes(nearRhymeResults);
            setLoading(false);
        };
        loadRhymes();
    }, [word]);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [onClose]);
    
    if (!word) return null;
    
    return (
        <div 
            ref={popupRef}
            className="animate-scale-in"
            style={{
                position: 'fixed',
                left: Math.min(position.x, window.innerWidth - 260),
                top: Math.min(position.y + 10, window.innerHeight - 300),
                width: 240,
                maxHeight: 280,
                background: 'var(--white)',
                border: '2px solid var(--black)',
                boxShadow: '6px 6px 0 var(--black)',
                zIndex: 500,
                overflow: 'hidden'
            }}
        >
            <div style={{
                background: 'var(--electric)',
                padding: '8px 12px',
                borderBottom: '2px solid var(--black)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                    🧠 RHYMES FOR "{word.toUpperCase()}"
                </span>
                <button onClick={onClose} style={{ padding: 2 }}>
                    <Icon name="X" size={14} />
                </button>
            </div>
            
            <div className="scrollable" style={{ maxHeight: 220, padding: 8 }}>
                {loading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>
                        <span className="animate-pulse">FINDING RHYMES...</span>
                    </div>
                ) : (
                    <>
                        {rhymes.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 8, color: 'var(--gray)', letterSpacing: '0.1em', marginBottom: 6 }}>PERFECT RHYMES</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {rhymes.map((rhyme, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => { onSelect(rhyme); haptic('light'); }}
                                            style={{
                                                padding: '6px 10px',
                                                background: 'var(--black)',
                                                color: 'var(--white)',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                textTransform: 'lowercase'
                                            }}
                                        >
                                            {rhyme}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {nearRhymes.length > 0 && (
                            <div>
                                <div style={{ fontSize: 8, color: 'var(--gray)', letterSpacing: '0.1em', marginBottom: 6 }}>NEAR RHYMES</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {nearRhymes.map((rhyme, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => { onSelect(rhyme); haptic('light'); }}
                                            style={{
                                                padding: '5px 8px',
                                                border: '1px solid var(--black)',
                                                background: 'transparent',
                                                fontSize: 10,
                                                textTransform: 'lowercase'
                                            }}
                                        >
                                            {rhyme}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {rhymes.length === 0 && nearRhymes.length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)', fontSize: 11 }}>
                                NO RHYMES FOUND<br/>
                                <span style={{ fontSize: 9 }}>TRY A DIFFERENT WORD</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// QUICK INPUT
// ============================================================================

const QuickInput = ({ onSave, onTyping, onExpandChange, initialPrompt }) => {
    const [expanded, setExpanded] = useState(false);
    const [text, setText] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [imageUrl, setImageUrl] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    
    const { isRecording, audioUrl, duration, error: recordError, startRecording, stopRecording, clearRecording, getBase64 } = useVoiceRecorder(30000);
    const [savedAudioUrl, setSavedAudioUrl] = useState(null);
    
    const [rhymePopup, setRhymePopup] = useState({ show: false, word: '', position: { x: 0, y: 0 } });
    const textareaRef = useRef(null);
    
    const toast = useToast();
    
    // Handle initialPrompt from Daily Drop
    useEffect(() => {
        if (initialPrompt) {
            setExpanded(true);
            setText(`// ${initialPrompt.type}: ${initialPrompt.prompt}\n// Challenge: ${initialPrompt.challenge}\n\n`);
            if (initialPrompt.type === 'WORD DROP') {
                const word = initialPrompt.prompt.match(/"([^"]+)"/)?.[1]?.toLowerCase();
                if (word) setTags([word]);
            }
        }
    }, [initialPrompt]);
    
    useEffect(() => {
        onExpandChange?.(expanded);
    }, [expanded, onExpandChange]);
    
    const handleTextChange = (e) => {
        setText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
        onTyping?.();
    };
    
    const handleSave = () => {
        if (!text.trim() && !savedAudioUrl) return;
        onSave({ text, tags, imageUrl, audioUrl: savedAudioUrl });
        setText('');
        setTags([]);
        setImageUrl(null);
        setSavedAudioUrl(null);
        clearRecording();
        setExpanded(false);
        haptic('success');
    };
    
    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.toLowerCase())) {
                setTags([...tags, tagInput.toLowerCase()]);
            }
            setTagInput('');
        }
    };
    
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                setImageUrl(base64);
            } catch { toast?.addToast('IMAGE FAILED', 'error'); }
        }
    };
    
    const handleAI = async (mode) => {
        setAiLoading(true);
        const prompts = {
            freestyle: `Freestyle 4-6 bars about: ${text || 'success and the Bay Area lifestyle'}`,
            expand: `Expand these bars into 4-6 lines:\n\n${text}`,
            rhyme: `Write 4 bars that rhyme with:\n\n${text}`,
            hook: `Write a catchy hook about: ${text || 'making it out'}`
        };
        const result = await callAI(prompts[mode]);
        setText(prev => prev + (prev ? '\n\n' : '') + result);
        setAiLoading(false);
        toast?.addToast('GENERATED', 'success');
    };
    
    const handleRecordToggle = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
            haptic('medium');
        }
    };
    
    const handleSaveAudio = async () => {
        if (audioUrl) {
            try {
                const base64 = await getBase64();
                setSavedAudioUrl(base64);
                clearRecording();
                haptic('success');
                toast?.addToast('VOICE MEMO SAVED', 'success');
            } catch (err) {
                toast?.addToast('SAVE FAILED', 'error');
            }
        }
    };
    
    const lastTapRef = useRef(0);
    const handleTextDoubleTap = (e) => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            const textarea = textareaRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const fullText = textarea.value;
                
                let wordStart = start;
                let wordEnd = end;
                
                while (wordStart > 0 && /\w/.test(fullText[wordStart - 1])) wordStart--;
                while (wordEnd < fullText.length && /\w/.test(fullText[wordEnd])) wordEnd++;
                
                const selectedWord = fullText.substring(wordStart, wordEnd).trim();
                
                if (selectedWord.length >= 2) {
                    const rect = textarea.getBoundingClientRect();
                    setRhymePopup({
                        show: true,
                        word: selectedWord,
                        position: { x: e.clientX || rect.left + 20, y: e.clientY || rect.top + 40 }
                    });
                    haptic('light');
                }
            }
        }
        lastTapRef.current = now;
    };
    
    const handleRhymeSelect = (rhyme) => {
        setText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + rhyme);
        setRhymePopup({ show: false, word: '', position: { x: 0, y: 0 } });
        toast?.addToast(`ADDED: ${rhyme.toUpperCase()}`, 'success');
    };
    
    if (!expanded) {
        return (
            <div style={{
                display: 'flex',
                background: 'var(--white)',
                borderBottom: '2px solid var(--black)'
            }}>
                <button 
                    onClick={() => { setExpanded(true); haptic('light'); }}
                    style={{
                        flex: 1,
                        padding: 20,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRight: '1px solid var(--light-gray)'
                    }}
                >
                    <span style={{ fontSize: 13, color: 'var(--gray)' }}>DROP A BAR...</span>
                    <div style={{
                        width: 36,
                        height: 36,
                        background: 'var(--electric)',
                        color: 'var(--black)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon name="Plus" size={20} />
                    </div>
                </button>
                
                <button 
                    onClick={async () => { setExpanded(true); haptic('light'); setTimeout(startRecording, 100); }}
                    style={{
                        padding: '20px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4
                    }}
                >
                    <div style={{
                        width: 36,
                        height: 36,
                        background: '#EF4444',
                        borderRadius: '50%',
                        color: 'var(--white)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon name="Mic" size={18} />
                    </div>
                    <span style={{ fontSize: 8, letterSpacing: '0.1em', color: 'var(--gray)' }}>RECORD</span>
                </button>
            </div>
        );
    }
    
    return (
        <div className="animate-slide-up" style={{ background: 'var(--white)', borderBottom: '2px solid var(--black)' }}>
            {(isRecording || audioUrl || savedAudioUrl) && (
                <div style={{
                    background: isRecording ? '#FEE2E2' : '#F0FDF4',
                    padding: 16,
                    borderBottom: '2px solid var(--black)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    {isRecording ? (
                        <>
                            <div className="animate-pulse" style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: '#EF4444', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon name="Mic" size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>RECORDING...</div>
                                <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'monospace' }}>
                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                                </div>
                                <div style={{ fontSize: 9, color: 'var(--gray)' }}>MAX 30 SECONDS</div>
                            </div>
                            <button onClick={stopRecording} style={{
                                width: 48, height: 48, background: 'var(--black)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon name="Square" size={20} color="white" />
                            </button>
                        </>
                    ) : savedAudioUrl ? (
                        <>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'var(--brand-green)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon name="Check" size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700 }}>🎙️ VOICE MEMO ATTACHED</div>
                                <audio src={savedAudioUrl} controls style={{ width: '100%', height: 32, marginTop: 4 }} />
                            </div>
                            <button onClick={() => setSavedAudioUrl(null)} style={{
                                padding: 8, color: 'var(--gray)'
                            }}>
                                <Icon name="Trash2" size={18} />
                            </button>
                        </>
                    ) : audioUrl && (
                        <>
                            <audio src={audioUrl} controls style={{ flex: 1, height: 40 }} />
                            <button onClick={handleSaveAudio} style={{
                                padding: '8px 12px', background: 'var(--brand-green)',
                                color: 'var(--white)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em'
                            }}>KEEP</button>
                            <button onClick={clearRecording} style={{
                                padding: '8px 12px', border: '1px solid var(--black)',
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em'
                            }}>REDO</button>
                        </>
                    )}
                </div>
            )}
            
            {recordError && (
                <div style={{ background: '#FEE2E2', padding: 12, fontSize: 11, color: '#EF4444', textAlign: 'center' }}>
                    {recordError} - ENABLE MICROPHONE ACCESS
                </div>
            )}
            
            {!isRecording && !audioUrl && !savedAudioUrl && (
                <button 
                    onClick={handleRecordToggle}
                    style={{
                        width: '100%', padding: 12, borderBottom: '1px dashed var(--light-gray)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', fontSize: 10, letterSpacing: '0.1em'
                    }}
                >
                    <Icon name="Mic" size={16} /> TAP TO RECORD VOICE MEMO
                </button>
            )}
            
            {imageUrl ? (
                <div style={{ position: 'relative' }}>
                    <img src={imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', filter: 'grayscale(80%)' }} />
                    <button onClick={() => setImageUrl(null)} style={{
                        position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                        background: 'var(--black)', color: 'var(--white)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><Icon name="X" size={14} /></button>
                </div>
            ) : (
                <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 50, borderBottom: '1px dashed var(--light-gray)',
                    cursor: 'pointer', color: 'var(--gray)', fontSize: 10, letterSpacing: '0.1em', gap: 8
                }}>
                    <Icon name="Image" size={16} /> ADD IMAGE
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
            )}
            
            <div style={{ padding: 16 }}>
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    onClick={handleTextDoubleTap}
                    onTouchEnd={handleTextDoubleTap}
                    placeholder="WRITE YOUR BARS... (DOUBLE-TAP A WORD FOR RHYMES)"
                    autoFocus
                    className="font-serif"
                    style={{ width: '100%', minHeight: 80, fontSize: 18, lineHeight: 1.5, resize: 'none' }}
                />
                <div style={{ fontSize: 9, color: 'var(--gray)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="Info" size={10} /> DOUBLE-TAP ANY WORD FOR RHYME SUGGESTIONS
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10, color: 'var(--gray)' }}>
                    <span>{countBars(text)} BARS</span>
                    <span>{countWords(text)} WORDS</span>
                    {savedAudioUrl && <span>🎙️ MEMO</span>}
                </div>
            </div>
            
            {rhymePopup.show && (
                <RhymePopup 
                    word={rhymePopup.word}
                    position={rhymePopup.position}
                    onSelect={handleRhymeSelect}
                    onClose={() => setRhymePopup({ show: false, word: '', position: { x: 0, y: 0 } })}
                />
            )}
            
            <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--light-gray)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {tags.map((tag, i) => (
                        <span key={i} onClick={() => setTags(tags.filter((_, idx) => idx !== i))} style={{
                            background: 'var(--black)', color: 'var(--white)',
                            padding: '4px 8px', fontSize: 10, cursor: 'pointer', textTransform: 'uppercase'
                        }}>#{tag} ×</span>
                    ))}
                </div>
                <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="ADD TAGS (ENTER)"
                    style={{ width: '100%', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                />
            </div>
            
            <div style={{ padding: '10px 16px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--light-gray)' }}>
                {[
                    { id: 'freestyle', label: '✦ FREESTYLE', highlight: true },
                    { id: 'expand', label: 'EXPAND' },
                    { id: 'rhyme', label: 'RHYME' },
                    { id: 'hook', label: 'HOOK' }
                ].map(item => (
                    <button key={item.id} onClick={() => handleAI(item.id)} disabled={aiLoading} style={{
                        padding: '8px 12px', border: '2px solid var(--black)',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap',
                        background: item.highlight ? 'var(--electric)' : 'transparent',
                        opacity: aiLoading ? 0.5 : 1
                    }}>{aiLoading ? '...' : item.label}</button>
                ))}
            </div>
            
            <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => { setExpanded(false); setText(''); setTags([]); setImageUrl(null); setSavedAudioUrl(null); clearRecording(); }} style={{
                    fontSize: 11, color: 'var(--gray)', letterSpacing: '0.1em'
                }}>CANCEL</button>
                <button onClick={handleSave} disabled={!text.trim() && !savedAudioUrl} style={{
                    padding: '12px 24px', background: (text.trim() || savedAudioUrl) ? 'var(--black)' : 'var(--light-gray)',
                    color: 'var(--white)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em'
                }}>SAVE BAR</button>
            </div>
        </div>
    );
};

// ============================================================================
// ADD TO CRATE MODAL
// ============================================================================

const AddToCrateModal = ({ bar, songs, onSave, onClose, onCreateNew }) => {
    const [selectedSongId, setSelectedSongId] = useState(null);

    const handleConfirm = () => {
        if (!selectedSongId) return;
        if (selectedSongId === 'new') {
            onCreateNew();
        } else {
            onSave(selectedSongId, bar);
        }
        onClose();
    };

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
        }}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)',
                width: '100%', maxWidth: 320,
                border: '4px solid var(--black)',
                boxShadow: '10px 10px 0 var(--black)'
            }}>
                <div style={{
                    padding: 16,
                    background: 'var(--black)',
                    color: 'var(--white)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.1em' }}>ADD TO CRATE</span>
                    <button onClick={onClose} style={{ color: 'var(--white)' }}>
                        <Icon name="X" size={18} />
                    </button>
                </div>
                
                <div style={{ padding: 16, maxHeight: '50vh', overflowY: 'auto' }}>
                    <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 12, letterSpacing: '0.1em' }}>
                        SELECT A TRACK TO INSERT THIS BAR:
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button 
                            onClick={() => setSelectedSongId('new')}
                            style={{
                                padding: 12,
                                border: `2px solid ${selectedSongId === 'new' ? 'var(--electric)' : 'var(--black)'}`,
                                background: selectedSongId === 'new' ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                                display: 'flex', alignItems: 'center', gap: 10,
                                textAlign: 'left'
                            }}
                        >
                            <div style={{
                                width: 24, height: 24, background: 'var(--black)', color: 'var(--white)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon name="Plus" size={14} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>START NEW TRACK</span>
                        </button>
                    
                        {songs.map(song => (
                            <button 
                                key={song.id}
                                onClick={() => setSelectedSongId(song.id)}
                                style={{
                                    padding: 12,
                                    border: `2px solid ${selectedSongId === song.id ? 'var(--electric)' : 'var(--light-gray)'}`,
                                    background: selectedSongId === song.id ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    width: 24, height: 24, background: 'var(--light-gray)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon name="Music" size={12} color="var(--gray)" />
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {song.title}
                                    </div>
                                    <div style={{ fontSize: 9, color: 'var(--gray)' }}>
                                        {formatDate(song.updated_at)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div style={{ padding: 16, borderTop: '1px solid var(--light-gray)' }}>
                    <button 
                        onClick={handleConfirm}
                        disabled={!selectedSongId}
                        style={{
                            width: '100%',
                            padding: 14,
                            background: selectedSongId ? 'var(--black)' : 'var(--light-gray)',
                            color: 'var(--white)',
                            fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                            opacity: selectedSongId ? 1 : 0.5
                        }}
                    >
                        CONFIRM INSERT
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// VIEWS - Will continue in app-views.js for size management
// ============================================================================

// Export for global access (since we're using babel standalone)
window.DailyBarsApp = {
    api,
    callAI,
    generateId,
    countWords,
    countBars,
    formatDate,
    formatTime,
    copyToClipboard,
    haptic,
    fetchRhymes,
    fetchNearRhymes,
    getDailyPrompt,
    getRandomPrompt,
    DAILY_DROP_PROMPTS,
    useVoiceRecorder,
    processImage,
    useSwipe,
    ToastProvider,
    useToast,
    Icon,
    DailyDropWidget,
    ImagePreview,
    BottomBar,
    Header,
    SocialExportModal,
    AddToCrateModal,
    IdeaCard,
    RhymePopup,
    QuickInput,
    LOGO_SOLID,
    LOGO_HOLLOW
};
