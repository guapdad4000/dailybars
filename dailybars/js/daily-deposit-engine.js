// ============================================================================
// THE DAILY DEPOSIT ENGINE
// Powered by Guapdad 4000's Handsome Logic
// NOW ON SUPABASE 🔥
// ============================================================================

const DailyDepositEngine = {
    
    // ========================================================================
    // FALLBACK DATA - When Supabase is down, we still got bars
    // ========================================================================
    
    FALLBACK_FEELINGS: [
        "Confidence", "Hunger", "Betrayal", "Loyalty", "Paranoia", 
        "Ambition", "Grief", "Revenge", "Love", "Regret",
        "Pride", "Jealousy", "Freedom", "Loneliness", "Triumph",
        "Desperation", "Hope", "Anger", "Peace", "Nostalgia",
        "Gratitude", "Fear", "Joy", "Guilt", "Determination"
    ],
    
    FALLBACK_SETTINGS: [
        "Oakland", "The trap house", "A private jet", "Your grandmother's kitchen",
        "A funeral", "The studio at 3AM", "A sold-out arena", "County jail",
        "The backseat of a Uber", "A penthouse suite", "The corner store",
        "A wedding reception", "The airport", "A hospital waiting room",
        "Your childhood bedroom", "A rooftop in downtown", "The barbershop",
        "A casino floor", "The DMV", "A church parking lot",
        "A strip club VIP", "The Greyhound bus", "A courtroom", "The gym"
    ],
    
    FALLBACK_OBJECTS: [
        "A gold chain", "Your mother's Bible", "A loaded pistol", "Car keys to a rental",
        "A cracked iPhone", "A stack of hundreds", "A eviction notice", 
        "Your father's watch", "A plane ticket", "A bottle of Hennessy",
        "A voicemail you never deleted", "A burner phone", "A diamond ring",
        "A lottery ticket", "A restraining order", "Your high school diploma",
        "A love letter", "A mugshot", "Designer luggage", "A baby photo",
        "A rolled blunt", "Car title", "A fake ID", "Your first platinum plaque"
    ],
    
    FALLBACK_SMELLS: [
        "Burnt rubber", "Your ex's perfume", "Fresh hundreds", "Gun smoke",
        "Mama's cooking", "Hospital antiseptic", "New car leather", "Weed smoke",
        "Ocean breeze", "Cheap cologne", "Rain on hot concrete", "Prison laundry",
        "Incense", "Gasoline", "Fresh Jordan's", "Airport coffee",
        "Champagne", "Sweat and success", "Fear", "Old photographs",
        "Studio session (that Pro Tools smell)", "Fast food at midnight"
    ],
    
    FALLBACK_VOCAB: [
        "Algorithm", "Currency", "Elevated", "Blueprint", "Frequency",
        "Residue", "Caliber", "Testament", "Velocity", "Perimeter",
        "Leverage", "Threshold", "Apparatus", "Parallel", "Syndicate",
        "Dividend", "Manuscript", "Catalyst", "Silhouette", "Reservoir",
        "Allegiance", "Doctrine", "Epitome", "Facade", "Jurisdiction",
        "Paradigm", "Sentiment", "Trajectory", "Vernacular", "Watershed"
    ],

    // ========================================================================
    // Supabase Config (uses same client from app.js)
    // ========================================================================
    
    getSupabase() {
        // Use the global supabase client initialized in app.js
        if (window.supabaseClient) return window.supabaseClient;
        
        // Fallback: create our own if app.js hasn't loaded yet
        const SUPABASE_URL = 'https://tilpgwoyyervbgdlucap.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHBnd295eWVydmJnZGx1Y2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTAwNDksImV4cCI6MjA4MjQ4NjA0OX0.Zw1DPMS91CxaNArACem74_-mR6IPmYpDqJksK8gwEk0';
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    },

    // ========================================================================
    // API Helpers (Supabase-powered)
    // ========================================================================
    
    async fetchTable(tableName) {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .limit(100);
            
            if (error) {
                console.warn(`⚠️ ${tableName} Supabase error:`, error.message);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error(`❌ Error fetching ${tableName}:`, error);
            return [];
        }
    },

    pickRandom(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },
    
    // Pick from DB data or fallback array
    pickWithFallback(dbData, fallbackArray) {
        // If we have DB data, use it
        if (dbData && dbData.length > 0) {
            const picked = this.pickRandom(dbData);
            return picked?.value || this.pickRandom(fallbackArray);
        }
        // Otherwise use fallback
        return this.pickRandom(fallbackArray);
    },

    // ========================================================================
    // The Main Generator
    // ========================================================================
    
    async generatePrompt() {
        console.log("🎲 Rolling the dice on the Daily Deposit (Supabase)...");

        // 1. Try to fetch from Supabase
        const [feelings, settings, objects, smells, vocab] = await Promise.all([
            this.fetchTable('prompts_feelings'),
            this.fetchTable('prompts_settings'),
            this.fetchTable('prompts_objects'),
            this.fetchTable('prompts_smells'),
            this.fetchTable('prompts_vocab')
        ]);

        // 2. Select with fallbacks - ALWAYS get variety
        const feeling = this.pickWithFallback(feelings, this.FALLBACK_FEELINGS);
        const setting = this.pickWithFallback(settings, this.FALLBACK_SETTINGS);
        const object = this.pickWithFallback(objects, this.FALLBACK_OBJECTS);
        const smell = this.pickWithFallback(smells, this.FALLBACK_SMELLS);
        
        // 3. Select 3 unique vocab words with fallback
        let vocabSource = vocab && vocab.length > 0 
            ? vocab.map(v => v.value).filter(Boolean)
            : this.FALLBACK_VOCAB;
        
        const shuffledVocab = [...vocabSource].sort(() => 0.5 - Math.random());
        const selectedVocab = shuffledVocab.slice(0, 3);

        console.log("🎯 Generated prompt:", { feeling, setting, object, smell, vocab: selectedVocab });

        // 4. Construct the prompt object
        return {
            type: 'DAILY DEPOSIT',
            prompt: `Write about ${feeling.toUpperCase()} set in ${setting.toUpperCase()}.`,
            challenge: `Include: ${object}. Smell: ${smell}.`,
            vocab: selectedVocab, 
            full_data: { feeling, setting, object, smell }
        };
    },

    // ========================================================================
    // Community Syndicate Logic (Supabase-powered)
    // ========================================================================
    
    async submitToSyndicate(promptText, author) {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('community_submissions')
                .insert({
                    prompt_text: promptText,
                    author: author || 'Anonymous',
                    likes: 0
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("❌ Failed to submit to Syndicate:", error);
            throw error;
        }
    },

    async getSyndicateFeed() {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('community_submissions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error("❌ Syndicate fetch error:", error.message);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error("❌ Failed to fetch Syndicate feed:", error);
            return [];
        }
    },
    
    async likeSyndicatePost(id, currentLikes) {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('community_submissions')
                .update({ likes: (currentLikes || 0) + 1 })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error("❌ Failed to like post:", error);
            throw error;
        }
    }
};

// Expose to window
window.DailyDepositEngine = DailyDepositEngine;
