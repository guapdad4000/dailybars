// ============================================================================
// THE DAILY DEPOSIT ENGINE
// Powered by Guapdad 4000's Handsome Logic
// ============================================================================

const DailyDepositEngine = {
    // API Helpers
    async fetchTable(tableName) {
        try {
            // Fetching a batch to pick randomly from client-side
            const response = await fetch(`tables/${tableName}?limit=100`);
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error(`❌ Error fetching ${tableName}:`, error);
            return [];
        }
    },

    pickRandom(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    },

    // The Main Generator
    async generatePrompt() {
        console.log("🎲 Rolling the dice on the Daily Deposit...");

        // 1. Fetch ingredients from the Vault
        const [feelings, settings, objects, smells, vocab] = await Promise.all([
            this.fetchTable('prompts_feelings'),
            this.fetchTable('prompts_settings'),
            this.fetchTable('prompts_objects'),
            this.fetchTable('prompts_smells'),
            this.fetchTable('prompts_vocab')
        ]);

        // 2. Select the specific flavor
        const feeling = this.pickRandom(feelings)?.feeling_text || "Confidence";
        const setting = this.pickRandom(settings)?.setting_text || "Oakland";
        const object = this.pickRandom(objects)?.object_text || "A gold chain";
        const smell = this.pickRandom(smells)?.smell_text || "Burnt rubber";
        
        // 3. Select 3 unique vocab words
        const shuffledVocab = vocab ? [...vocab].sort(() => 0.5 - Math.random()) : [];
        const selectedVocab = shuffledVocab.slice(0, 3).map(v => v.word);

        // 4. Construct the prompt object compatible with the existing UI
        return {
            type: 'DAILY DEPOSIT',
            prompt: `Write about ${feeling.toUpperCase()} set in ${setting.toUpperCase()}.`,
            challenge: `Include: ${object}. Smell: ${smell}.`,
            vocab: selectedVocab, 
            full_data: { feeling, setting, object, smell }
        };
    },

    // Community Syndicate Logic
    async submitToSyndicate(promptText, author) {
        try {
            const response = await fetch('tables/community_submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_text: promptText,
                    author: author || 'Anonymous',
                    likes: 0
                })
            });
            return await response.json();
        } catch (error) {
            console.error("❌ Failed to submit to Syndicate:", error);
            throw error;
        }
    },

    async getSyndicateFeed() {
        try {
            const response = await fetch('tables/community_submissions?sort=-created_at&limit=50');
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error("❌ Failed to fetch Syndicate feed:", error);
            return [];
        }
    }
};

// Expose to window
window.DailyDepositEngine = DailyDepositEngine;
