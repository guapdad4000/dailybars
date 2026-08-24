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

const APP_CONFIG = window.DAILYBARS_CONFIG || {};
const APP_ENVIRONMENT = APP_CONFIG.environment || 'development';
const SUPABASE_URL = APP_CONFIG.supabaseUrl || 'https://tilpgwoyyervbgdlucap.supabase.co';
const SUPABASE_ANON_KEY = APP_CONFIG.supabaseAnonKey || '';

// Initialize Supabase client
const supabaseSdk = window.supabaseSdk || window.supabase;
const supabase = supabaseSdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
window.supabaseClient = supabase;
window.supabase = supabase;

// ============================================================================
// ASSETS
// ============================================================================

const LOGO_SOLID = "https://www.genspark.ai/api/files/s/5t2t8CLW";
const LOGO_HOLLOW = "https://i.postimg.cc/zBFYHrDy/Hollow.png";

// ============================================================================
// API WRAPPER (Supabase-powered)
// ============================================================================

// Debug flag - set to true in console to see API calls
window.DEBUG_API = APP_ENVIRONMENT !== 'production' && Boolean(window.DEBUG_API);

// Field mapping: frontend uses camelCase, Supabase uses snake_case
const toSnakeCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const mapped = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key === 'otherArtists') continue;
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

            if (params.eq) {
                Object.entries(params.eq).forEach(([field, value]) => {
                    const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                    query = query.eq(snakeField, value);
                });
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
            
            // HOTFIX: Ensure we never send user_id to songs table (it uses username)
            if (table === 'songs' && snakeData.user_id) {
                console.warn('⚠️ Stripping user_id from songs insert');
                delete snakeData.user_id;
            }
            
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
            
            // HOTFIX: Ensure we never send user_id to songs table
            if (table === 'songs' && snakeData.user_id) {
                delete snakeData.user_id;
            }
            
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

const callAI = async (prompt, systemPrompt) => {
    try {
        const { data, error } = await supabase.functions.invoke(APP_CONFIG.aiFunctionName || 'dailybars-ai', {
            body: {
                prompt,
                systemPrompt: systemPrompt || 'You are GUAPDAD 4000\'s AI assistant. Write bars with Oakland energy - witty, slick, confident. Just output the bars, no explanations.'
            }
        });
        if (error) throw error;
        return data?.text || data?.content || null;
    } catch (error) {
        console.error('AI Error:', error);
        return null;
    }
};

const deriveUsernameFromEmail = (email = '') => {
    const base = email.split('@')[0] || 'artist';
    return base.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 24) || 'artist';
};

const loadAuthProfile = async (authUser, fallback = {}) => {
    if (!authUser) return null;
    const metadata = authUser.user_metadata || {};
    const preferredUsername = fallback.username || metadata.username || deriveUsernameFromEmail(authUser.email);

    let profile = null;
    try {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();
        profile = data;
    } catch (error) {
        console.warn('Auth profile lookup skipped:', error.message);
    }

    if (!profile) {
        try {
            const { data } = await supabase
                .from('users')
                .upsert({
                    auth_user_id: authUser.id,
                    username: preferredUsername,
                    email: authUser.email,
                    last_login: new Date().toISOString()
                }, { onConflict: 'auth_user_id' })
                .select()
                .single();
            profile = data;
        } catch (error) {
            console.warn('Auth profile upsert skipped:', error.message);
        }
    }

    return toCamelCase(profile || {
        id: authUser.id,
        auth_user_id: authUser.id,
        username: preferredUsername,
        email: authUser.email,
        xp: 0,
        level: 1
    });
};

const authApi = {
    async signUp({ email, password, username }) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username?.toLowerCase() } }
        });
        if (error) throw error;
        return loadAuthProfile(data.user, { username });
    },

    async signIn({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return loadAuthProfile(data.user);
    },

    async getSessionUser() {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) return null;
        return loadAuthProfile(data.user);
    },

    async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        return true;
    },

    async signOut() {
        await supabase.auth.signOut();
    },

    async deleteAccount() {
        const { data, error } = await supabase.functions.invoke(APP_CONFIG.deleteAccountFunctionName || 'delete-account');
        if (error) throw error;
        return data;
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

const fetchSynonyms = async (word) => {
    try {
        const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=8`);
        const data = await response.json();
        return data.map(item => item.word);
    } catch (error) {
        console.error('Synonym fetch error:', error);
        return [];
    }
};

// ============================================================================
// RHYME HIGHLIGHTING SYSTEM - Color-coded end-of-line rhymes
// Simple background colors, no effects
// ============================================================================

// Rhyme color palette - simple distinct background colors
const RHYME_COLORS = [
    '#FF6B6B',  // Coral Red
    '#4ECDC4',  // Teal
    '#FFE66D',  // Yellow
    '#95E1D3',  // Mint
    '#F38181',  // Salmon
    '#AA96DA',  // Lavender
    '#FCBAD3',  // Pink
    '#A8D8EA',  // Sky Blue
    '#FF9F43',  // Orange
    '#6C5CE7',  // Purple
    '#00CEC9',  // Cyan
    '#FD79A8',  // Hot Pink
];

// Simple phonetic ending extraction for rhyme detection
const getPhoneticEnding = (word) => {
    if (!word) return '';
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    // if (word.length < 2) return word;
    
    const isVowel = (char) => 'aeiouy'.includes(char);
    
    let index = word.length - 1;
    
    // Skip trailing silent 'e' if appropriate
    if (word.length > 2 && word.endsWith('e') && !isVowel(word[word.length - 2])) {
        // Tentatively skip
        const tempIndex = word.length - 2;
        // Check if there are vowels before this?
        let hasVowelBefore = false;
        for(let k=0; k<=tempIndex; k++) {
            if(isVowel(word[k])) { hasVowelBefore = true; break; }
        }
        if(hasVowelBefore) {
            index = tempIndex;
        }
    }
    
    // Scan backwards for the first vowel encountered
    let i = index;
    // 1. Skip consonants at end (if we started at a consonant)
    while (i >= 0 && !isVowel(word[i])) {
        i--;
    }
    
    if (i < 0) return word; // No vowels found
    
    // 2. Consume vowel cluster
    while (i >= 0 && isVowel(word[i])) {
        i--;
    }
    
    let start = i + 1;
    let rawEnding = word.substring(start);
    let ending = rawEnding;
    
    const mappings = [
        { regex: /uice$/, val: 'oose' }, // Juice / Loose
        { regex: /uce$/, val: 'oose' },  // Spruce / Loose
        { regex: /use$/, val: 'oose' },  // Use / Loose
        { regex: /ight$/, val: 'ite' },  // Night / Kite
        { regex: /yht$/, val: 'ite' },   // Kyte
        { regex: /ite$/, val: 'ite' },   // Kite
        { regex: /yme$/, val: 'ime' },   // Rhyme / Time
        { regex: /ime$/, val: 'ime' },   // Time
        { regex: /tion$/, val: 'shun' }, // Action
        { regex: /sion$/, val: 'shun' }, // Tension
        { regex: /cion$/, val: 'shun' }, // Coercion
        { regex: /xion$/, val: 'shun' }, // Complexion
        { regex: /eak$/, val: 'eek' },   // Speak / Cheek
        { regex: /eek$/, val: 'eek' },
        { regex: /ee$/, val: 'ee' },     // Tree
        { regex: /ea$/, val: 'ee' },     // Sea
        { regex: /y$/, val: 'ee' },      // Family (ends in y, handled specially)
        // Expanded Mappings
        { regex: /our$/, val: 'or' },    // Your / Door
        { regex: /oor$/, val: 'or' },    // Door
        { regex: /ore$/, val: 'or' },    // More
        { regex: /ear$/, val: 'eer' },   // Near / Year
        { regex: /ere$/, val: 'eer' },   // Here / Severe
        { regex: /ier$/, val: 'eer' },   // Tier
        { regex: /air$/, val: 'air' },   // Hair
        { regex: /are$/, val: 'air' },   // Share
        { regex: /aith$/, val: 'ait' },  // Faith / Wait
        { regex: /eight$/, val: 'ait' }, // Weight / Wait
        { regex: /ate$/, val: 'ait' },   // Late / Wait
        { regex: /ait$/, val: 'ait' },   // Wait
        { regex: /andle$/, val: 'andle' }, // Handle / Candle
        { regex: /angle$/, val: 'andle' }, // Jangle / Handle (Slant)
        { regex: /eigh$/, val: 'ay' },   // Weigh / Hay
        { regex: /ay$/, val: 'ay' },     // Say
        { regex: /ey$/, val: 'ee' },     // Money
        // Plural / Verb ending Normalizations
        { regex: /eers?$/, val: 'eer' }, // Queers / Here
        { regex: /eres?$/, val: 'eer' }, // Heres / Here
        { regex: /ears?$/, val: 'eer' }, // Nears / Near
        { regex: /iers?$/, val: 'eer' }, // Tiers / Tier
        { regex: /eeks?$/, val: 'eek' }, // Cheeks / Cheek
        { regex: /eaks?$/, val: 'eek' }, // Speaks / Speak
        { regex: /ooms?$/, val: 'oom' }, // Rooms / Room
        { regex: /oms?$/, val: 'oom' },  // Moms / Mom
        { regex: /ams?$/, val: 'am' },   // Hams / Ham
        { regex: /ems?$/, val: 'em' },   // Gems / Gem
        { regex: /ims?$/, val: 'im' },   // Hims / Him
        { regex: /ings?$/, val: 'ing' }, // Rings / Ring
        { regex: /ongs?$/, val: 'ong' }, // Songs / Song
        { regex: /ungs?$/, val: 'ung' }, // Lungs / Lung
        { regex: /angs?$/, val: 'ang' }, // Bangs / Bang
        { regex: /engs?$/, val: 'eng' }, // Lengths / Length
        { regex: /owns?$/, val: 'own' }, // Towns / Town
        { regex: /ounds?$/, val: 'ound' }, // Sounds / Sound
    ];
    
    for (const map of mappings) {
        if (map.regex.test(ending)) {
            // Special check for 'y' -> 'ee' (only if multi-syllable)
            if (map.regex.source.includes('y$')) {
                // If word has other vowels...
                const otherVowels = word.slice(0, -1).match(/[aeiou]/);
                if (otherVowels) {
                    return map.val;
                } else {
                    return 'eye'; // Fly / Sky
                }
            }
            return map.val;
        }
    }
    
    // Fallback normalizations
    if (ending === 'e') return 'ee'; // Me -> ee
    
    return ending;
};

// Analyze text and find all rhyme groups across the entire text
const analyzeRhymes = (text) => {
    if (!text) return { endingToColor: {} };
    
    // Match all words (including those with apostrophes)
    const words = text.match(/[a-zA-Z']+/g) || [];
    const endingCounts = {};
    
    words.forEach(word => {
        // Skip single characters unless they are 'I' or 'A' (though 'a' rarely rhymes in multisyllabic contexts, 'I' is common)
        // Actually, let's just allow all. The map logic handles normalization.
        if (word.length < 1) return;
        
        const ending = getPhoneticEnding(word);
        if (ending && ending.length > 0) {
            endingCounts[ending] = (endingCounts[ending] || 0) + 1;
        }
    });
    
    // Assign colors to endings with > 1 count
    const endingToColor = {};
    let colorIndex = 0;
    
    // Sort endings by frequency to assign colors deterministically
    const sortedEndings = Object.keys(endingCounts).sort((a,b) => endingCounts[b] - endingCounts[a]);
    
    sortedEndings.forEach(ending => {
        if (endingCounts[ending] >= 2) {
            endingToColor[ending] = getRhymeColor(colorIndex);
            colorIndex++;
        }
    });
    
    return { endingToColor };
};

// Get color for a specific rhyme group index
const getRhymeColor = (groupIndex) => {
    return RHYME_COLORS[groupIndex % RHYME_COLORS.length];
};

// Textarea with rhyme highlighting - VISIBLE TEXT approach
// Shows actual textarea text (not transparent) with highlight markers shown separately
// This ensures cursor position is ALWAYS correct since we're not hiding the real text
const RhymeTextarea = ({ value, onChange, onBlur, onKeyDown, placeholder, className, style, autoFocus, textareaRef, onWordDoubleTap }) => {
    const internalRef = useRef(null);
    const containerRef = useRef(null);
    const ref = textareaRef || internalRef;
    const isComposing = useRef(false);
    
    // Double-tap detection for mobile
    const lastTapTime = useRef(0);
    const lastTapPosition = useRef({ x: 0, y: 0 });
    const doubleTapThreshold = 350;
    const tapDistanceThreshold = 30;
    
    const handleChange = (e) => {
        if (isComposing.current) return;
        onChange?.(e);
        // Auto-resize textarea
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    };
    
    const handleCompositionStart = () => {
        isComposing.current = true;
    };
    
    const handleCompositionEnd = (e) => {
        isComposing.current = false;
        handleChange(e);
    };
    
    const handleInput = (e) => {
        if (isComposing.current) return;
        if (ref.current && e.target.value !== value) {
            onChange?.(e);
        }
    };
    
    // Initial focus and resize
    useEffect(() => {
        if (autoFocus && ref.current) {
            setTimeout(() => {
                ref.current.focus();
                const len = ref.current.value.length;
                ref.current.setSelectionRange(len, len);
            }, 50);
        }
    }, [autoFocus, ref]);
    
    // Resize on value change
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value, ref]);
    
    // Get the word at cursor position
    const getWordAtCursor = useCallback(() => {
        const textarea = ref.current;
        if (!textarea) return null;
        
        const start = textarea.selectionStart;
        const fullText = textarea.value;
        
        if (!fullText || start === undefined) return null;
        
        let wordStart = start;
        let wordEnd = start;
        
        while (wordStart > 0 && /[\w']/.test(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && /[\w']/.test(fullText[wordEnd])) wordEnd++;
        
        const word = fullText.substring(wordStart, wordEnd).trim();
        return word.length >= 2 ? word : null;
    }, [ref]);
    
    // Handle double-tap for mobile
    const handleTouchEnd = useCallback((e) => {
        if (!onWordDoubleTap) return;
        
        const now = Date.now();
        const touch = e.changedTouches?.[0];
        if (!touch) return;
        
        const currentPos = { x: touch.clientX, y: touch.clientY };
        const timeDiff = now - lastTapTime.current;
        const distance = Math.sqrt(
            Math.pow(currentPos.x - lastTapPosition.current.x, 2) + 
            Math.pow(currentPos.y - lastTapPosition.current.y, 2)
        );
        
        if (timeDiff < doubleTapThreshold && distance < tapDistanceThreshold) {
            setTimeout(() => {
                const word = getWordAtCursor();
                if (word) {
                    onWordDoubleTap({
                        word,
                        position: { x: currentPos.x, y: currentPos.y }
                    });
                    haptic('light');
                }
            }, 10);
            lastTapTime.current = 0;
        } else {
            lastTapTime.current = now;
            lastTapPosition.current = currentPos;
        }
    }, [onWordDoubleTap, getWordAtCursor]);
    
    // Handle double-click for desktop
    const handleDoubleClick = useCallback((e) => {
        if (!onWordDoubleTap) return;
        const word = getWordAtCursor();
        if (word) {
            onWordDoubleTap({ word, position: { x: e.clientX, y: e.clientY } });
            haptic('light');
        }
    }, [onWordDoubleTap, getWordAtCursor]);
    
    // Analyze rhymes for the legend/indicator
    const { endingToColor } = useMemo(() => analyzeRhymes(value || ''), [value]);
    
    // Build rhyme legend - small colored dots showing which sounds rhyme
    const rhymeLegend = useMemo(() => {
        if (!value || Object.keys(endingToColor).length === 0) return null;
        
        // Get unique rhyming words grouped by color
        const colorGroups = {};
        const words = value.match(/[a-zA-Z']+/g) || [];
        
        words.forEach(word => {
            const ending = getPhoneticEnding(word);
            const color = endingToColor[ending];
            if (color) {
                if (!colorGroups[color]) colorGroups[color] = new Set();
                colorGroups[color].add(word.toLowerCase());
            }
        });
        
        const groups = Object.entries(colorGroups).slice(0, 6); // Max 6 groups shown
        if (groups.length === 0) return null;
        
        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px dashed var(--light-gray)'
            }}>
                {groups.map(([color, wordsSet], i) => {
                    const wordList = Array.from(wordsSet).slice(0, 3);
                    return (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 6px',
                            background: color,
                            borderRadius: 3,
                            fontSize: 9,
                            fontWeight: 600,
                        }}>
                            {wordList.join(' · ')}
                            {wordsSet.size > 3 && <span>+{wordsSet.size - 3}</span>}
                        </div>
                    );
                })}
            </div>
        );
    }, [value, endingToColor]);
    
    // Compute text styles
    const textStyles = useMemo(() => ({
        fontFamily: className?.includes('font-serif') 
            ? "'Playfair Display', Georgia, serif" 
            : className?.includes('font-mono')
                ? "'IBM Plex Mono', monospace"
                : "'IBM Plex Mono', monospace",
        fontSize: style?.fontSize || 18,
        lineHeight: style?.lineHeight || 1.5,
    }), [style?.fontSize, style?.lineHeight, className]);
    
    return (
        <div 
            ref={containerRef}
            className={`rhyme-textarea-container ${className || ''}`}
            style={{
                position: 'relative',
                width: '100%',
            }}
        >
            {/* Single visible textarea - no overlay tricks */}
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onInput={handleInput}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleClick}
                placeholder={placeholder}
                autoFocus={autoFocus}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck="false"
                data-gramm="false"
                className="rhyme-textarea-input"
                style={{
                    ...textStyles,
                    width: '100%',
                    minHeight: style?.minHeight || 80,
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    background: 'transparent',
                    color: 'var(--black)', // VISIBLE TEXT - cursor will be correct
                    caretColor: 'var(--black)',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    overflow: 'hidden',
                    WebkitAppearance: 'none',
                    WebkitTapHighlightColor: 'transparent',
                }}
            />
            
            {/* Rhyme legend shown below textarea */}
            {rhymeLegend}
        </div>
    );
};

// Also export a simple display-only component for showing rhymes in read mode
const RhymeHighlightedText = ({ text, style, className }) => {
    const { endingToColor } = useMemo(() => analyzeRhymes(text || ''), [text]);
    
    if (!text) return null;
    
    const lines = text.split('\n');
    
    return (
        <div style={style} className={className}>
            {lines.map((line, lineIndex) => {
                if (line === '') {
                    return <div key={lineIndex}>&nbsp;</div>;
                }
                
                const segments = line.split(/([^a-zA-Z']+)/);
                
                return (
                    <div key={lineIndex}>
                        {segments.map((segment, segIndex) => {
                            if (!segment) return null;
                            
                            if (/^[a-zA-Z']+$/.test(segment)) {
                                const ending = getPhoneticEnding(segment);
                                const color = endingToColor[ending];
                                
                                if (color) {
                                    return (
                                        <span key={segIndex} style={{ 
                                            backgroundColor: color, 
                                            boxShadow: `0 0 0 2px ${color}`,
                                            borderRadius: '3px',
                                            padding: '0 1px',
                                        }}>
                                            {segment}
                                        </span>
                                    );
                                }
                            }
                            return <span key={segIndex}>{segment}</span>;
                        })}
                    </div>
                );
            })}
        </div>
    );
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
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    
    const startRecording = async () => {
        try {
            setError(null);
            if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
                setError('RECORDING NOT SUPPORTED IN THIS BROWSER');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(stream);
            const mimeType = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : '';
            mediaRecorder.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            chunks.current = [];
            
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };
            
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: mediaRecorder.current?.mimeType || mimeType || 'audio/webm' });
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
            // Don't clear stream immediately if we want to do something with it?
            // Actually stream tracks are stopped in onstop callback in original code?
            // Wait, original code: stream.getTracks().forEach(track => track.stop()); inside onstop
            // So stream becomes inactive. Visualizer handles this by checking isRecording.
            setStream(null);
        }
    };
    
    const clearRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setDuration(0);
    };

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        mediaRecorder.current?.stream?.getTracks?.().forEach(track => track.stop());
    }, []);
    
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
    
    return { isRecording, audioBlob, audioUrl, duration, error, stream, startRecording, stopRecording, clearRecording, getBase64 };
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
    const touchId = useRef(null);

    const resetTouch = () => {
        touchStart.current = { x: 0, y: 0 };
        touchEnd.current = { x: 0, y: 0 };
        touchId.current = null;
        swiping.current = false;
    };
    
    const onTouchStart = (e) => {
        const target = e.target;
        if (e.touches.length !== 1 || target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], audio, video')) {
            resetTouch();
            return;
        }
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchId.current = e.touches[0].identifier;
        swiping.current = false;
    };
    
    const onTouchMove = (e) => {
        if (touchId.current === null || e.touches.length !== 1) {
            resetTouch();
            return;
        }
        const touch = [...e.touches].find(item => item.identifier === touchId.current);
        if (!touch) return;
        touchEnd.current = { x: touch.clientX, y: touch.clientY };
        const dx = Math.abs(touchEnd.current.x - touchStart.current.x);
        const dy = Math.abs(touchEnd.current.y - touchStart.current.y);
        if (dx > dy && dx > 20) swiping.current = true;
        else if (dy > dx && dy > 20) swiping.current = false;
    };
    
    const onTouchEnd = () => {
        if (!swiping.current) {
            resetTouch();
            return;
        }
        const dx = touchStart.current.x - touchEnd.current.x;
        if (Math.abs(dx) > threshold) {
            haptic('light');
            if (dx > 0) onSwipeLeft?.();
            else onSwipeRight?.();
        }
        resetTouch();
    };
    
    return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd };
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
    const [promptError, setPromptError] = useState('');
    const [hasUsedToday, setHasUsedToday] = useState(false);
    const toast = useToast();

    const loadPrompt = async () => {
        setLoading(true);
        setPromptError('');
        try {
            const prompt = await window.DailyDepositEngine.generatePrompt();
            if (!prompt?.prompt) throw new Error('No prompt returned');
            setCurrentPrompt(prompt);
        } catch (error) {
            console.error('Daily Drop generation failed:', error);
            setCurrentPrompt(null);
            setPromptError('COULDN’T MIX A PROMPT. TRY AGAIN.');
        } finally {
            setLoading(false);
        }
    };
    
    // Initial Load
    useEffect(() => {
        loadPrompt();
        
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
        haptic('light');
        await loadPrompt();
    };
    
    const handleUsePrompt = () => {
        if (loading || !currentPrompt?.prompt) {
            toast?.addToast('WAIT FOR A PROMPT FIRST', 'error');
            return;
        }
        const today = new Date().toDateString();
        localStorage.setItem('dailydrop_last_used', today);
        setHasUsedToday(true);
        
        onUsePrompt?.(currentPrompt);
        setIsOpen(false);
        haptic('success');
        toast?.addToast('PROMPT LOADED - GO OFF!', 'success');
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
            {isOpen && ReactDOM.createPortal(
                <div 
                    className="daily-drop-modal animate-fade-in" 
                    onClick={handleClose}
                    style={{ zIndex: 9999 }} // Ensure it's above everything including the Safe background
                >
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
                            {loading ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <span className="animate-spin" style={{ display: 'inline-block', fontSize: 24 }}>⟳</span>
                                    <div style={{ fontSize: 10, marginTop: 10, letterSpacing: '0.1em' }}>MIXING INGREDIENTS...</div>
                                </div>
                            ) : promptError ? (
                                <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
                                    <div style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 16 }}>{promptError}</div>
                                    <button onClick={loadPrompt} className="daily-drop-btn daily-drop-btn-secondary">TRY AGAIN</button>
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
                                disabled={loading}
                                className="daily-drop-btn daily-drop-btn-secondary"
                            >
                                <Icon name="Shuffle" size={14} style={{ marginRight: 6 }} />
                                SHUFFLE
                            </button>
                            <button 
                                onClick={handleUsePrompt}
                                disabled={loading || !currentPrompt?.prompt}
                                className="daily-drop-btn daily-drop-btn-primary"
                            >
                                <Icon name="Zap" size={14} style={{ marginRight: 6, color: 'var(--white)' }} />
                                USE THIS
                            </button>
                        </div>
                        
                        {/* Streak indicator */}
                        {streakCount > 0 && (
                            <div className="daily-drop-streak">
                                <SvgIcon name="fire" size={14} color="var(--black)" />
                                <span>{streakCount} DAY PROMPT STREAK</span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
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

const BottomBar = ({ currentView, streak, user }) => {
    const getBorderColor = () => {
        switch(currentView) {
            case 'feed': return 'var(--brand-green)';
            case 'archive': return '#4A2C2A';
            case 'favorites': return 'var(--electric)';
            case 'crates': return '#1E3A8A';
            case 'scratchlab': return '#7C3AED';
            default: return 'var(--black)';
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
            <div className="status-bar" style={{
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
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} <span style={{ opacity: 0.3, fontSize: 8, marginLeft: 4 }}>v23</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleBackup} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                        <SvgIcon name="save" size={16} color="var(--black)" />
                    </button>
                    {/* XP Display */}
                    <span style={{ 
                        color: '#FFD700', 
                        fontWeight: 'bold', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid #FFD700'
                    }}>
                        <SvgIcon name="star" size={12} color="#FFD700" /> {user?.xp || 0} XP
                    </span>
                    <span style={{ color: 'var(--black)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="animate-pulse"><SvgIcon name="fire" size={14} color="var(--black)" /></span> {streak} DAY STREAK
                    </span>
                </div>
            </div>

            {showBackup && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    {/* Backdrop */}
                    <div 
                        onClick={() => setShowBackup(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />
                    {/* Modal */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 500,
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
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
                            padding: '16px 20px',
                            borderBottom: '2px solid var(--black)'
                        }}>
                            <h2 style={{ 
                                fontSize: 14, 
                                fontWeight: 900, 
                                letterSpacing: '0.15em',
                                margin: 0,
                                color: 'var(--black)'
                            }}>YOUR DATA ARCHIVE</h2>
                            <button 
                                onClick={() => setShowBackup(false)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            >
                                <SvgIcon name="x" size={20} color="var(--black)" />
                            </button>
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10, padding: '16px 20px' }}>
                            <button 
                                onClick={downloadTxt}
                                style={{
                                    flex: 1, padding: 12, background: 'var(--black)', color: 'var(--white)',
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer'
                                }}
                            >
                                <SvgIcon name="save" size={14} color="var(--white)" style={{ marginRight: 6 }} />
                                DOWNLOAD .TXT
                            </button>
                            <button 
                                onClick={() => { 
                                    navigator.clipboard.writeText(backupData);
                                    // Visual feedback instead of alert
                                    const btn = event.target;
                                    const original = btn.innerHTML;
                                    btn.innerHTML = 'COPIED!';
                                    setTimeout(() => btn.innerHTML = original, 1500);
                                }}
                                style={{
                                    flex: 1, padding: 12, border: '2px solid var(--black)', color: 'var(--black)',
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', cursor: 'pointer'
                                }}
                            >
                                COPY JSON
                            </button>
                        </div>
                        {/* Data Preview */}
                        <div style={{ padding: '0 20px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: '0.1em' }}>
                                RAW BACKUP DATA:
                            </div>
                        </div>
                        <textarea 
                            readOnly
                            value={backupData}
                            style={{
                                flex: 1,
                                margin: '0 20px 20px',
                                minHeight: 200,
                                background: 'rgba(0,0,0,0.9)',
                                color: '#0f0',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 9,
                                border: '2px solid var(--black)',
                                padding: 12,
                                resize: 'none'
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================================================
// UNIFIED HEADER
// ============================================================================

const Header = ({ title, subtitle, currentView, views, onViewChange, isTyping, onDailyDropUse, archiveQuery, onArchiveSearch, stationMetrics = {}, isRecording = false }) => {
    const activeIndex = Math.max(0, views.findIndex(v => v.id === currentView));
    const [isArriving, setIsArriving] = useState(false);

    const isArchive = currentView === 'archive';
    const isCrates = currentView === 'crates';
    const isScratchLab = currentView === 'scratchlab';
    const isMinimized = isCrates || isScratchLab;
    const currentStation = views[activeIndex] || views[0];
    const currentMetrics = stationMetrics[currentView] || {};
    const stationNumber = String(activeIndex + 1).padStart(2, '0');
    const routeStatus = isScratchLab && isRecording ? 'LIVE TAKE IN PROGRESS' : isArriving ? 'ARRIVING NOW' : 'ON PLATFORM';

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentView]);

    useEffect(() => {
        setIsArriving(true);
        const arrivalTimer = window.setTimeout(() => setIsArriving(false), 900);
        return () => window.clearTimeout(arrivalTimer);
    }, [currentView]);

    return (
        <header className="app-header" style={{
            position: 'relative',
            zIndex: 10,
            background: 'url(images/smooth-paper-texture.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottom: '2px solid var(--black)',
            transition: 'box-shadow 0.3s ease, opacity 0.3s ease, max-height 0.4s ease',
            boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
            opacity: isMinimized ? 0.96 : 1,
            maxHeight: isMinimized ? 120 : 400,
            overflow: 'hidden'
        }}>
            {!isMinimized && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 10,
                    paddingBottom: isArchive ? 6 : 0
                }}>
                    <img src={LOGO_SOLID} alt="Daily Bars" style={{ width: '80%', maxWidth: 300, height: 'auto', objectFit: 'contain' }} />
                </div>
            )}

            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMinimized ? '6px 12px 10px' : '0 16px 12px',
                gap: 6,
                background: isMinimized ? 'rgba(255,255,255,0.9)' : 'transparent'
            }}>
                {!isMinimized && (
                    <div style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 12,
                        zIndex: 10
                    }}>
                        <DailyDropWidget onUsePrompt={onDailyDropUse} isHeaderMode={true} />
                    </div>
                )}

                {!isArchive && !isMinimized && (
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
                )}

                {isArchive && (
                    <div style={{ width: '100%', maxWidth: 420 }}>
                        <label style={{
                            display: 'block',
                            fontSize: 10,
                            letterSpacing: '0.12em',
                            fontWeight: 700,
                            marginBottom: 6,
                            textAlign: 'center'
                        }}>ARCHIVE SEARCH</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'var(--white)',
                            border: '2px solid var(--black)',
                            padding: '8px 12px'
                        }}>
                            <Icon name="Search" size={18} />
                            <input
                                value={archiveQuery}
                                onChange={(e) => onArchiveSearch?.(e.target.value)}
                                placeholder="Find bars by words, date, or tag"
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 12,
                                    letterSpacing: '0.04em',
                                    background: 'transparent'
                                }}
                            />
                            {archiveQuery && (
                                <button
                                    onClick={() => onArchiveSearch?.('')}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                                >
                                    <Icon name="X" size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation route (subway train style) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: isMinimized ? 0 : 2,
                    paddingTop: isMinimized ? 4 : 0,
                    paddingBottom: isMinimized ? 2 : 0,
                    height: 32
                }}>
                    <svg
                        className="route-map"
                        width="260"
                        height="32"
                        viewBox="0 0 260 32"
                        role="navigation"
                        aria-label="Daily Bars route"
                        style={{ overflow: 'visible' }}
                    >
                        <line x1="10" y1="26" x2="250" y2="26" stroke="var(--black)" strokeWidth="2" strokeLinecap="square" opacity="0.3" />
                        <line x1="10" y1="29" x2="250" y2="29" stroke="var(--black)" strokeWidth="2" strokeLinecap="square" opacity="0.3" />

                        {views.map((v, i) => {
                            const cx = 30 + (i * 40);
                            const isActive = currentView === v.id;
                            const letter = v.id === 'favorites' ? '★' : v.id === 'scratchlab' ? 'S' : v.label[0];
                            const metric = stationMetrics[v.id] || {};
                            const hasActivity = Number(metric.count) > 0;
                            const isLiveStation = v.id === 'scratchlab' && isRecording;
                            const activateView = () => {
                                onViewChange(v.id);
                                haptic('light');
                            };

                            return (
                                <g
                                    key={v.id}
                                    className={`route-station ${isActive ? 'route-station-active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Go to ${v.label}`}
                                    aria-describedby={`route-station-${v.id}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={activateView}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            activateView();
                                        }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <title id={`route-station-${v.id}`}>{`${v.label}: ${metric.label || v.subtitle}`}</title>
                                    {(hasActivity || isLiveStation) && (
                                        <circle
                                            className={isLiveStation ? 'station-activity station-activity-live' : 'station-activity'}
                                            cx={cx}
                                            cy="16"
                                            r="2"
                                            fill={isLiveStation ? 'var(--recording-red)' : 'var(--electric)'}
                                        />
                                    )}
                                    {isActive && (
                                        <circle
                                            className="station-ring"
                                            cx={cx}
                                            cy="26"
                                            r={isMinimized ? 10.5 : 11}
                                            fill="none"
                                            stroke={isLiveStation ? 'var(--recording-red)' : 'var(--brand-green)'}
                                            strokeWidth="1"
                                            strokeDasharray="2 2"
                                        />
                                    )}
                                    <circle
                                        cx={cx} cy="26"
                                        r={isMinimized ? 6.5 : 7}
                                        fill={isActive ? "var(--black)" : "var(--white)"}
                                        stroke={isLiveStation ? "var(--recording-red)" : isActive ? "var(--brand-green)" : "var(--black)"}
                                        strokeWidth={isActive ? "2" : "1.5"}
                                        style={{ transition: 'fill 0.3s ease, r 0.2s ease' }}
                                    />
                                    <text
                                        x={cx} y="26" dy="3"
                                        textAnchor="middle"
                                        fill={isActive ? "var(--electric)" : "var(--black)"}
                                        fontSize={v.id === 'favorites' ? "10" : "8"}
                                        fontFamily="'Archivo Black', sans-serif"
                                        fontWeight="bold"
                                    >
                                        {letter}
                                    </text>
                                </g>
                            );
                        })}

                        <g
                            className={isArriving ? 'train-arriving' : ''}
                            style={{
                                transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: `translateX(${30 + (activeIndex * 40) - 30}px)`,
                                pointerEvents: 'none',
                            }}
                        >
                            <g className={isTyping ? 'animate-rock' : ''}>
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
                                <circle
                                    className={isRecording && isScratchLab ? 'train-live-light' : ''}
                                    cx="30"
                                    cy="25"
                                    r="3.5"
                                    fill={isRecording && isScratchLab ? 'var(--recording-red)' : '#DC2626'}
                                    stroke="var(--black)"
                                    strokeWidth="1.2"
                                />
                                <text x="30" y="25" dy="1.2" textAnchor="middle" fill="var(--white)" fontSize="6" fontFamily="'Helvetica', 'Arial', sans-serif" fontWeight="bold">R</text>
                                <circle cx="15" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                                <circle cx="15" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                                <circle cx="30" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                                <circle cx="30" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                                <circle cx="45" cy="29" r="2.5" fill="var(--black)" stroke="var(--black)" strokeWidth="1"/>
                                <circle cx="45" cy="29" r="1" fill="#52525B" stroke="var(--black)" strokeWidth="0.5"/>
                                <rect x="10" y="28" width="40" height="1" fill="var(--black)" opacity="0.3"/>
                            </g>
                        </g>
                    </svg>
                </div>
                <div
                    className={`route-readout ${isRecording && isScratchLab ? 'route-readout-live' : ''}`}
                    aria-live="polite"
                    aria-atomic="true"
                >
                    <div className="route-readout-primary">
                        <span className="route-readout-kicker">
                            <span className="route-signal" aria-hidden="true" />
                            ROUTE {stationNumber} / {String(views.length).padStart(2, '0')}
                        </span>
                        <span className="route-readout-title">{currentStation?.label || title}</span>
                        <span className="route-readout-count">{currentMetrics.label || subtitle}</span>
                    </div>
                    <div className="route-readout-secondary">
                        <span>{routeStatus}</span>
                        {currentMetrics.countLabel && <span>{currentMetrics.countLabel}</span>}
                    </div>
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
                className="idea-card animate-slide-up"
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
                            aria-label={bar.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            style={{ color: bar.isFavorite ? 'var(--black)' : 'var(--light-gray)' }}
                        >
                            <Icon name="Star" size={14} />
                        </button>
                    </div>
                    
                    {isEditing ? (
                        <div style={{ flex: 1, margin: -8, padding: 8, background: 'var(--electric)' }}>
                            <RhymeTextarea
                                textareaRef={textRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleTextBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="font-mono rhyme-editor-active"
                                style={{
                                    width: '100%',
                                    minHeight: 60,
                                    fontSize: 13,
                                    lineHeight: 1.5
                                }}
                            />
                        </div>
                    ) : (
                        <div 
                            onClick={handleTextClick}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleTextClick();
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Edit bar text"
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
                        <button onClick={() => onDelete(bar.id)} aria-label="Delete bar" style={{ color: 'var(--gray)' }}>
                            <Icon name="Trash2" size={12} />
                        </button>
                    </div>
                </div>
            </article>
        );
    }
    
    const showAddCaptionCta = !bar.text && bar.audioUrl && !isEditing;

    return (
        <article className="animate-slide-up" style={{
            background: 'var(--white)',
            borderBottom: '2px solid var(--black)',
            padding: 16
        }}>
            <div className="quick-input-collapsed" style={{
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
                    aria-label={bar.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    style={{ color: bar.isFavorite ? 'var(--black)' : 'var(--light-gray)' }}
                >
                    <Icon name="Star" size={16} />
                </button>
            </div>
            
            {isEditing ? (
                <div style={{ margin: -8, padding: 8, background: 'var(--electric)' }}>
                    <RhymeTextarea
                        textareaRef={textRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleTextBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="font-serif rhyme-editor-active"
                        style={{
                            width: '100%',
                            minHeight: 80,
                            fontSize: 18,
                            lineHeight: 1.5
                        }}
                    />
                </div>
            ) : (
                <div
                    onClick={handleTextClick}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleTextClick();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={showAddCaptionCta ? 'Add a caption to this voice note' : 'Edit bar text'}
                    className="inline-edit font-serif"
                    style={{
                        fontSize: 18,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        cursor: 'text',
                        padding: 4,
                        margin: -4,
                        border: showAddCaptionCta ? '1px dashed var(--gray)' : 'none',
                        borderRadius: 6,
                        background: showAddCaptionCta ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                >
                    {showAddCaptionCta ? (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                            letterSpacing: '0.05em',
                            color: 'var(--gray)'
                        }}>
                            <Icon name="Edit3" size={14} /> ADD CAPTION TO THIS VOICE NOTE
                        </span>
                    ) : bar.text}
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
                <div style={{ marginTop: 12 }}>
                    {window.VinylAudioPlayer ? (
                        <window.VinylAudioPlayer src={bar.audioUrl} compact={true} />
                    ) : (
                        <audio src={bar.audioUrl} controls style={{ width: '100%', height: 32 }} />
                    )}
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
                        <button onClick={() => onDelete(bar.id)} aria-label="Delete bar" style={{ color: 'var(--gray)' }}>
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
    const [synonyms, setSynonyms] = useState([]);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef(null);
    
    useEffect(() => {
        const loadRhymes = async () => {
            setLoading(true);
            const [exactRhymes, nearRhymeResults, synonymResults] = await Promise.all([
                fetchRhymes(word),
                fetchNearRhymes(word),
                fetchSynonyms(word)
            ]);
            setRhymes(exactRhymes);
            setNearRhymes(nearRhymeResults);
            setSynonyms(synonymResults);
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
                        
                        {synonyms.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 8, color: 'var(--gray)', letterSpacing: '0.1em', marginBottom: 6 }}>SYNONYMS</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {synonyms.map((syn, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => { onSelect(syn); haptic('light'); }}
                                            style={{
                                                padding: '5px 8px',
                                                border: '1px dashed var(--black)',
                                                background: 'rgba(0,0,0,0.02)',
                                                fontSize: 10,
                                                textTransform: 'lowercase',
                                                color: 'var(--black)'
                                            }}
                                        >
                                            {syn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {rhymes.length === 0 && nearRhymes.length === 0 && synonyms.length === 0 && (
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

const QuickInput = ({
    onSave,
    onTyping,
    onExpandChange,
    initialPrompt,
    style,
    canUseAI,
    onAIUse,
    onPremiumRequired
}) => {
    const [expanded, setExpanded] = useState(false);
    const [text, setText] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [imageUrl, setImageUrl] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    
    // Auto-save draft
    useEffect(() => {
        const savedDraft = localStorage.getItem('quick_input_draft');
        if (savedDraft) {
            setText(savedDraft);
            setExpanded(true); // Auto-expand if there's a draft
        }
    }, []);

    useEffect(() => {
        if (text) {
            localStorage.setItem('quick_input_draft', text);
        } else {
            localStorage.removeItem('quick_input_draft');
        }
    }, [text]);
    
    const { isRecording, audioUrl, duration, error: recordError, stream, startRecording, stopRecording, clearRecording, getBase64 } = useVoiceRecorder(30000);
    const [savedAudioUrl, setSavedAudioUrl] = useState(null);
    
    const [rhymePopup, setRhymePopup] = useState({ show: false, word: '', position: { x: 0, y: 0 } });
    const textareaRef = useRef(null);
    const saveInFlightRef = useRef(false);
    
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

    useEffect(() => {
        return () => {
            onExpandChange?.(false);
        };
    }, [onExpandChange]);
    
    const handleTextChange = (e) => {
        setText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
        onTyping?.();
    };
    
    const handleSave = async () => {
        if (!text.trim() && !savedAudioUrl) return;
        if (saveInFlightRef.current) return;
        saveInFlightRef.current = true;
        try {
            await Promise.resolve(onSave?.({ text, tags, imageUrl, audioUrl: savedAudioUrl }));
        } finally {
            saveInFlightRef.current = false;
        }
        setText('');
        setTags([]);
        setImageUrl(null);
        setSavedAudioUrl(null);
        localStorage.removeItem('quick_input_draft');
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
        if (canUseAI && !canUseAI()) {
            toast?.addToast('PREMIUM REQUIRED', 'error');
            onPremiumRequired?.();
            return;
        }
        onAIUse?.();
        setAiLoading(true);
        try {
            const prompts = {
                freestyle: `Freestyle 4-6 bars about: ${text || 'success and the Bay Area lifestyle'}`,
                expand: `Expand these bars into 4-6 lines:\n\n${text}`,
                rhyme: `Write 4 bars that rhyme with:\n\n${text}`,
                hook: `Write a catchy hook about: ${text || 'making it out'}`
            };
            const result = await callAI(prompts[mode]);
            if (!result) throw new Error('No AI response');
            setText(prev => prev + (prev ? '\n\n' : '') + result);
            toast?.addToast('GENERATED', 'success');
        } catch (error) {
            console.error('Quick input AI failed:', error);
            toast?.addToast('AI GENERATION FAILED', 'error');
        } finally {
            setAiLoading(false);
        }
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

    // Auto-clear draft if user explicitly cancels (optional, but good UX)
    const handleCancel = () => {
        setExpanded(false);
        // We DON'T clear the text/draft on cancel, so they can come back to it.
        // Just hide the expanded view.
        // If they want to clear, they can delete the text manually.
        // But for "Cancel" button in UI:
    };
    
    // Handle double-tap from RhymeTextarea - now works on mobile!
    const handleWordDoubleTap = useCallback(({ word, position }) => {
        if (word && word.length >= 2) {
            setRhymePopup({
                show: true,
                word: word,
                position: position
            });
        }
    }, []);
    
    const handleRhymeSelect = (rhyme) => {
        setText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + rhyme);
        setRhymePopup({ show: false, word: '', position: { x: 0, y: 0 } });
        toast?.addToast(`ADDED: ${rhyme.toUpperCase()}`, 'success');
    };
    
    if (!expanded) {
        return (
            <div style={{
                display: 'flex',
                background: style?.background || 'var(--white)',
                borderBottom: '2px solid var(--black)',
                ...style
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
        <div className="animate-slide-up" style={{ background: style?.background || 'var(--white)', borderBottom: '2px solid var(--black)', ...style }}>
            {(isRecording || audioUrl || savedAudioUrl) && (
                <div style={{
                    background: isRecording ? 'transparent' : (savedAudioUrl ? '#F0FDF4' : 'var(--white)'),
                    padding: isRecording ? 0 : 16,
                    borderBottom: '2px solid var(--black)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    minHeight: isRecording ? 340 : 'auto',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {isRecording ? (
                        <div style={{ 
                            width: '100%', 
                            height: 340, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'flex-start', 
                            position: 'relative',
                            paddingTop: 16
                        }}>
                            {/* Timer - Above the mic */}
                            <div style={{ 
                                color: 'var(--black)', 
                                fontFamily: "'IBM Plex Mono', monospace", 
                                fontSize: 32, 
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                marginBottom: 8,
                                zIndex: 50
                            }}>
                                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                            </div>
                            
                            {/* Recording Indicator - Small dot next to timer */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                marginBottom: 12,
                                zIndex: 50
                            }}>
                                <div className="animate-pulse" style={{ width: 8, height: 8, background: '#EF4444', borderRadius: '50%' }} />
                                <span style={{ color: '#EF4444', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em' }}>REC</span>
                            </div>
                            
                            {/* THE BOOTH VISUALIZER */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {window.MicVisualizer && (
                                    <window.MicVisualizer 
                                        stream={stream} 
                                        isRecording={isRecording}
                                        width={window.innerWidth} 
                                        height={200} 
                                    />
                                )}
                            </div>
                            
                            {/* Stop Button - Simple red circle with red square */}
                            <div style={{ paddingBottom: 20, zIndex: 50 }}>
                                <button onClick={stopRecording} style={{
                                    width: 56, 
                                    height: 56, 
                                    background: 'transparent',
                                    borderRadius: '50%', 
                                    border: '3px solid #EF4444',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s ease'
                                }}>
                                    <div style={{ 
                                        width: 20, 
                                        height: 20, 
                                        background: '#EF4444', 
                                        borderRadius: 3 
                                    }} />
                                </button>
                            </div>
                        </div>
                    ) : savedAudioUrl ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: 'var(--brand-green)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Icon name="Check" size={14} color="white" />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>VOICE MEMO ATTACHED</span>
                                </div>
                                <button onClick={() => setSavedAudioUrl(null)} style={{
                                    padding: 6, color: 'var(--gray)', background: 'transparent', border: 'none', cursor: 'pointer'
                                }}>
                                    <Icon name="Trash2" size={16} />
                                </button>
                            </div>
                            {window.VinylAudioPlayer ? (
                                <window.VinylAudioPlayer src={savedAudioUrl} compact={true} />
                            ) : (
                                <audio src={savedAudioUrl} controls style={{ width: '100%', height: 32 }} />
                            )}
                        </div>
                    ) : audioUrl && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {window.VinylAudioPlayer ? (
                                <window.VinylAudioPlayer src={audioUrl} compact={true} />
                            ) : (
                                <audio src={audioUrl} controls style={{ width: '100%', height: 40 }} />
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleSaveAudio} style={{
                                    flex: 1, padding: '10px 12px', background: 'var(--brand-green)',
                                    color: 'var(--white)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                                    border: 'none', cursor: 'pointer'
                                }}>KEEP</button>
                                <button onClick={clearRecording} style={{
                                    flex: 1, padding: '10px 12px', border: '2px solid var(--black)',
                                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', background: 'transparent', cursor: 'pointer'
                                }}>REDO</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {recordError && (
                <div style={{ background: '#FEE2E2', padding: 12, fontSize: 11, color: '#EF4444', textAlign: 'center' }}>
                    {recordError} - ENABLE MICROPHONE ACCESS
                </div>
            )}
            
            {!isRecording && !audioUrl && !savedAudioUrl && (
                <div style={{
                    width: '100%', 
                    padding: '16px 12px', 
                    borderBottom: '1px dashed var(--light-gray)',
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8,
                    background: 'transparent'
                }}>
                    <button 
                        onClick={handleRecordToggle}
                        style={{
                            width: 48, 
                            height: 48, 
                            background: 'transparent',
                            borderRadius: '50%', 
                            border: '3px solid #EF4444',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                        }}
                    >
                        <div style={{ 
                            width: 20, 
                            height: 20, 
                            background: '#EF4444', 
                            borderRadius: '50%' 
                        }} />
                    </button>
                    <span style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--gray)' }}>TAP TO RECORD</span>
                </div>
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
                <RhymeTextarea
                    textareaRef={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    placeholder="WRITE YOUR BARS... (DOUBLE-TAP A WORD FOR RHYMES)"
                    autoFocus
                    className="font-serif rhyme-editor-active"
                    style={{ width: '100%', minHeight: 80, fontSize: 18, lineHeight: 1.5 }}
                    onWordDoubleTap={handleWordDoubleTap}
                />
                <div style={{ fontSize: 9, color: 'var(--gray)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="Info" size={10} /> RHYMES AUTO-HIGHLIGHTED • DOUBLE-TAP FOR SUGGESTIONS
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
                <button onClick={() => { setExpanded(false); }} style={{
                    fontSize: 11, color: 'var(--gray)', letterSpacing: '0.1em'
                }}>MINIMIZE</button>
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
// USER PROFILE MODAL - Stats & Trophies
// ============================================================================

const UserProfileModal = ({ user, onClose, onLogout, onDeleteAccount, isOwnProfile = false }) => {
    const [trophies, setTrophies] = useState([]);
    const [userTrophies, setUserTrophies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrophies, setSelectedTrophies] = useState(user?.selectedTrophies ?? user?.selected_trophies ?? []);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        previousFocusRef.current = document.activeElement;
        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose?.();
        };
        const frame = requestAnimationFrame(() => modalRef.current?.focus());
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus?.();
        };
    }, [onClose]);

    useEffect(() => {
        loadTrophies();
    }, [user]);

    useEffect(() => {
        setSelectedTrophies(user?.selectedTrophies ?? user?.selected_trophies ?? []);
    }, [user?.id, user?.selectedTrophies, user?.selected_trophies]);

    const loadTrophies = async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            
            // Fetch ALL trophies (both store and achievement types)
            const { data: allTrophies } = await api.get('trophies');
            setTrophies(allTrophies || []);
            
            // Fetch user's earned trophies
            const { data, error } = await supabase
                .from('user_trophies')
                .select('trophy_id, earned_at, earned_via')
                .eq('user_id', user.id);
            
            if (!error) {
                setUserTrophies(data || []);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading trophies:', error);
            setLoading(false);
        }
    };

    const handleSelectTrophy = async (trophyId) => {
        let newSelected = [...selectedTrophies];
        
        if (newSelected.includes(trophyId)) {
            // Deselect
            newSelected = newSelected.filter(id => id !== trophyId);
        } else {
            // Select (max 3)
            if (newSelected.length < 3) {
                newSelected.push(trophyId);
            } else {
                // Replace oldest selection
                newSelected.shift();
                newSelected.push(trophyId);
            }
        }
        
        setSelectedTrophies(newSelected);
        
        // Update in database
        try {
            await supabase
                .from('users')
                .update({ selected_trophies: newSelected })
                .eq('id', user.id);
        } catch (error) {
            console.error('Error updating selected trophies:', error);
        }
    };

    const earnedTrophyIds = userTrophies.map(ut => ut.trophy_id);
    const displayTrophies = trophies.filter(t => earnedTrophyIds.includes(t.id));

    return (
        <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Profile for ${user?.username || 'user'}`}
            tabIndex={-1}
            style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                background: 'url(/images/smooth-paper-texture.jpg)',
                backgroundSize: 'cover',
                maxWidth: 400,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                border: '2px solid var(--black)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 20,
                    borderBottom: '2px solid var(--black)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <div style={{
                            fontSize: 24,
                            fontFamily: 'Archivo Black',
                            letterSpacing: '-0.02em',
                            marginBottom: 4
                        }}>
                            @{user?.username?.toUpperCase()}
                        </div>
                        <div style={{
                            fontSize: 9,
                            fontFamily: 'IBM Plex Mono',
                            letterSpacing: '0.1em',
                            color: 'var(--gray)'
                        }}>
                            JOINED {formatDate(user?.created_at)}
                        </div>
                    </div>
                    <button type="button" aria-label="Close profile" onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 20,
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1
                    }}>×</button>
                </div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    background: 'var(--black)'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        padding: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: 28,
                            fontFamily: 'Archivo Black',
                            marginBottom: 4
                        }}>
                            {user?.xp || 0}
                        </div>
                        <div style={{
                            fontSize: 9,
                            fontFamily: 'IBM Plex Mono',
                            letterSpacing: '0.1em',
                            color: 'var(--gray)'
                        }}>
                            TOTAL XP
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        padding: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: 28,
                            fontFamily: 'Archivo Black',
                            marginBottom: 4
                        }}>
                            {user?.total_bars || 0}
                        </div>
                        <div style={{
                            fontSize: 9,
                            fontFamily: 'IBM Plex Mono',
                            letterSpacing: '0.1em',
                            color: 'var(--gray)'
                        }}>
                            BARS WRITTEN
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        padding: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: 28,
                            fontFamily: 'Archivo Black',
                            marginBottom: 4,
                            color: '#EF4444'
                        }}>
                            {user?.current_streak || 0}
                        </div>
                        <div style={{
                            fontSize: 9,
                            fontFamily: 'IBM Plex Mono',
                            letterSpacing: '0.1em',
                            color: 'var(--gray)'
                        }}>
                            CURRENT STREAK
                        </div>
                    </div>
                    
                    <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        padding: 16,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: 28,
                            fontFamily: 'Archivo Black',
                            marginBottom: 4,
                            color: '#F59E0B'
                        }}>
                            {user?.longest_streak || 0}
                        </div>
                        <div style={{
                            fontSize: 9,
                            fontFamily: 'IBM Plex Mono',
                            letterSpacing: '0.1em',
                            color: 'var(--gray)'
                        }}>
                            LONGEST STREAK
                        </div>
                    </div>
                </div>

                {/* Selected Trophies Display - Only show the 3 picked trophies */}
                <div style={{
                    padding: 20,
                    borderBottom: '2px solid var(--black)'
                }}>
                    <div style={{
                        fontSize: 11,
                        fontFamily: 'IBM Plex Mono',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        marginBottom: 12
                    }}>
                        SHOWCASE (PICK UP TO 3)
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8
                    }}>
                        {[0, 1, 2].map(index => {
                            const trophyId = selectedTrophies[index];
                            const trophy = trophies.find(t => t.id === trophyId);
                            const hasImage = trophy && (trophy.imageUrl || trophy.image_url);
                            
                            return (
                                <div key={index} style={{
                                    aspectRatio: '1',
                                    border: '2px solid var(--black)',
                                    background: trophy ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 4,
                                    overflow: 'hidden'
                                }}>
                                    {trophy ? (
                                        hasImage ? (
                                            <img 
                                                src={trophy.imageUrl || trophy.image_url} 
                                                alt={trophy.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 32, marginBottom: 4 }}>
                                                    {trophy.icon}
                                                </div>
                                                <div style={{
                                                    fontSize: 7,
                                                    fontFamily: 'IBM Plex Mono',
                                                    textAlign: 'center',
                                                    fontWeight: 700
                                                }}>
                                                    {trophy.name}
                                                </div>
                                            </>
                                        )
                                    ) : (
                                        <div style={{
                                            fontSize: 24,
                                            opacity: 0.2
                                        }}>?</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* All Trophies - Separated by Type */}
                <div style={{ padding: 20 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray)' }}>
                            Loading...
                        </div>
                    ) : (
                        <>
                            {/* Achievement Trophies (Free milestones) */}
                            {(() => {
                                const achievementTrophies = trophies.filter(t => t.trophyType === 'achievement' || t.trophy_type === 'achievement');
                                const earnedAchievements = achievementTrophies.filter(t => earnedTrophyIds.includes(t.id));
                                
                                if (achievementTrophies.length === 0) return null;
                                
                                return (
                                    <div>
                                        <div style={{
                                            fontSize: 11,
                                            fontFamily: 'IBM Plex Mono',
                                            fontWeight: 700,
                                            letterSpacing: '0.1em',
                                            marginBottom: 12,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>ACHIEVEMENTS</span>
                                            <span style={{ fontSize: 9, color: 'var(--gray)' }}>
                                                {earnedAchievements.length}/{achievementTrophies.length}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: 8
                                        }}>
                                            {achievementTrophies.map(trophy => {
                                                const earned = earnedTrophyIds.includes(trophy.id);
                                                const isSelected = selectedTrophies.includes(trophy.id);
                                                
                                                return (
                                                    <button
                                                        key={trophy.id}
                                                        onClick={() => earned && handleSelectTrophy(trophy.id)}
                                                        disabled={!earned}
                                                        style={{
                                                            aspectRatio: '1',
                                                            border: `2px solid ${isSelected ? '#EAB308' : 'var(--black)'}`,
                                                            background: earned ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
                                                            opacity: earned ? 1 : 0.3,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: 8,
                                                            cursor: earned ? 'pointer' : 'default',
                                                            position: 'relative'
                                                        }}
                                                        title={earned ? trophy.description : `${trophy.description} (Locked)`}
                                                    >
                                                        <div style={{ fontSize: 28, marginBottom: 4, filter: earned ? 'none' : 'grayscale(1)' }}>
                                                            {trophy.icon}
                                                        </div>
                                                        <div style={{
                                                            fontSize: 7,
                                                            fontFamily: 'IBM Plex Mono',
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            lineHeight: 1.2
                                                        }}>
                                                            {trophy.name}
                                                        </div>
                                                        {!earned && trophy.requirementType && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: 4,
                                                                fontSize: 6,
                                                                color: 'var(--gray)',
                                                                fontFamily: 'IBM Plex Mono'
                                                            }}>
                                                                {trophy.requirementValue} {trophy.requirementType}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>

                {/* Logout Button */}
                <div style={{
                    padding: 20,
                    borderTop: '2px solid var(--black)'
                }}>
                    {isOwnProfile && (
                        <button
                            onClick={async () => {
                                if (!onDeleteAccount || deleteLoading) return;
                                const confirmed = window.confirm('Delete your Daily Raps account and all account data? This cannot be undone.');
                                if (!confirmed) return;
                                setDeleteLoading(true);
                                try {
                                    await onDeleteAccount();
                                } finally {
                                    setDeleteLoading(false);
                                }
                            }}
                            disabled={deleteLoading}
                            style={{
                                width: '100%',
                                padding: 12,
                                background: '#7f1d1d',
                                color: 'var(--white)',
                                border: 'none',
                                fontSize: 11,
                                fontFamily: 'IBM Plex Mono',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                cursor: deleteLoading ? 'wait' : 'pointer',
                                marginBottom: 10,
                                opacity: deleteLoading ? 0.7 : 1
                            }}
                        >
                            {deleteLoading ? 'DELETING...' : 'DELETE ACCOUNT'}
                        </button>
                    )}
                    <button onClick={onLogout} style={{
                        width: '100%',
                        padding: 12,
                        background: 'var(--black)',
                        color: 'var(--white)',
                        border: 'none',
                        fontSize: 11,
                        fontFamily: 'IBM Plex Mono',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        cursor: 'pointer'
                    }}>
                        LOGOUT
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// VIEWS - Will continue in app-views.js for size management
// ============================================================================

// Export for the browser bundle.
window.DailyBarsApp = {
    api,
    authApi,
    callAI,
    APP_CONFIG,
    APP_ENVIRONMENT,
    generateId,
    countWords,
    countBars,
    formatDate,
    formatTime,
    copyToClipboard,
    haptic,
    fetchRhymes,
    fetchNearRhymes,
    fetchSynonyms,
    getDailyPrompt,
    getRandomPrompt,
    DAILY_DROP_PROMPTS,
    processImage,
    useSwipe,
    ToastProvider,
    useToast,
    Icon,
    useVoiceRecorder,
    MicVisualizer: window.MicVisualizer,
    DailyDropWidget,
    ImagePreview,
    BottomBar,
    Header,
    SocialExportModal,
    AddToCrateModal,
    IdeaCard,
    RhymePopup,
    QuickInput,
    RhymeTextarea,
    RhymeHighlightedText,
    RHYME_COLORS,
    analyzeRhymes,
    LOGO_SOLID,
    LOGO_HOLLOW,
    RadioWidget: window.RadioWidget,
    UserProfileModal
};
