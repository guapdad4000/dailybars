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
    // Native application-data API (Supabase remains only for Auth and audio storage)
    // ========================================================================
    
    request(path, options = {}) {
        if (!window.dailyBarsApi?.request) throw new Error('Native data API is not available.');
        return window.dailyBarsApi.request(path, options);
    },

    // ========================================================================
    // API Helpers (Supabase-powered)
    // ========================================================================
    
    async fetchTable(tableName) {
        try {
            const result = await this.request(`/${tableName}?limit=100`);
            return result.data || [];
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
    
    async submitToSyndicate(promptText, author, type = 'PROMPT', userId = null) {
        try {
            return window.dailyBarsApi.api.create('community_submissions', {
                promptText,
                submissionType: type
            });
        } catch (error) {
            console.error("❌ Failed to submit to Syndicate:", error);
            throw error;
        }
    },

    async getSyndicateFeed() {
        try {
            const result = await window.dailyBarsApi.api.get('community_submissions', { sort: '-created_at', limit: 50 });
            return result.data || [];
        } catch (error) {
            console.error("❌ Failed to fetch Syndicate feed:", error);
            return [];
        }
    },

    async reportPost(postId, userId, reason = 'inappropriate') {
        if (!postId || !userId) return { error: 'Missing report target' };
        try {
            return await this.request('/community/report', {
                method: 'POST',
                body: JSON.stringify({ submissionId: postId, reason })
            });
        } catch (error) {
            console.error('❌ Failed to report post:', error);
            return { error: error.message || 'Failed to report post' };
        }
    },

    async blockAuthor(userId, blockedAuthor) {
        if (!userId || !blockedAuthor) return { error: 'Missing block target' };
        const normalizedAuthor = String(blockedAuthor).trim().toLowerCase();
        if (!normalizedAuthor) return { error: 'Missing block target' };
        try {
            return await this.request('/community/block', {
                method: 'POST',
                body: JSON.stringify({ author: normalizedAuthor })
            });
        } catch (error) {
            console.error('❌ Failed to block author:', error);
            const storageKey = `dailybars_blocked_authors_${userId}`;
            let blocked = [];
            try {
                blocked = JSON.parse(localStorage.getItem(storageKey) || '[]');
            } catch {
                blocked = [];
            }
            if (!blocked.includes(normalizedAuthor)) {
                blocked.push(normalizedAuthor);
                localStorage.setItem(storageKey, JSON.stringify(blocked));
            }
            return { success: true, localOnly: true };
        }
    },

    async getBlockedAuthors(userId) {
        if (!userId) return [];
        const storageKey = `dailybars_blocked_authors_${userId}`;
        let localBlocked = [];
        try {
            localBlocked = JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch {
            localBlocked = [];
        }
        try {
            const data = await this.request('/community/blocks');
            return Array.from(new Set([
                ...(data || []).map(row => row.blocked_author),
                ...localBlocked
            ].map(author => String(author).trim().toLowerCase()).filter(Boolean)));
        } catch {
            return localBlocked.map(author => String(author).trim().toLowerCase()).filter(Boolean);
        }
    },
    
    async likeSyndicatePost(id, currentLikes) {
        try {
            return this.upvotePost(id, true);
        } catch (error) {
            console.error("❌ Failed to like post:", error);
            throw error;
        }
    },

    // Track user upvotes to prevent duplicates (uses database with localStorage backup)
    async upvotePost(postId, userId, username) {
        if (!userId) {
            console.warn('⚠️ Cannot upvote without user ID');
            return { alreadyVoted: false, error: 'Must be logged in to upvote' };
        }
        
        try {
            const result = await this.request('/community/upvote', {
                method: 'POST',
                body: JSON.stringify({ submissionId: postId })
            });
            const storageKey = `upvoted_posts_${userId}`;
            const upvotedPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!upvotedPosts.includes(postId)) {
                upvotedPosts.push(postId);
                localStorage.setItem(storageKey, JSON.stringify(upvotedPosts));
            }
            return result;
        } catch (error) {
            console.error("❌ Failed to upvote:", error);
            return { error: error.message || 'Failed to upvote' };
        }
    },

    // Check if user already upvoted a post (checks database)
    async hasUpvoted(postId, userId) {
        if (!userId) return false;
        
        try {
            const result = await this.request(`/community/upvotes/${postId}`);
            return Boolean(result.hasUpvoted);
        } catch (error) {
            console.error('Error checking upvote:', error);
            return false;
        }
    },

    // ========================================================================
    // Real-time Song Collaboration
    // ========================================================================

    // Subscribe to real-time changes on a song
    subscribeToSong(songId, callback) {
        // Collaborative edits are refreshed through the native API; do not expose
        // application table changes through the browser's Supabase connection.
        return null;
    },

    // Unsubscribe from song updates
    unsubscribeFromSong(channel) {
        return undefined;
    },

    // Get active collaborators on a song (presence)
    async joinSongSession(songId, userId, username) {
        return null;
    },

    // Broadcast cursor/selection position to collaborators
    broadcastCursor(channel, userId, position) {
        return undefined;
    },

    // Create a shareable collaboration link
    async createCollabLink(songId, ownerId) {
        // Generate a unique token
        const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        
        try {
            await this.request('/collaborators/invite', { method: 'POST', body: JSON.stringify({
                songId, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }) });
            
            // Return the shareable link
            const baseUrl = window.location.origin;
            return `${baseUrl}?collab=${token}`;
        } catch (error) {
            console.error("❌ Failed to create collab link:", error);
            throw error;
        }
    },

    // Join a song via collaboration link
    async joinViaCollabLink(token, userId, username) {
        try {
            return await this.request('/collaborators/join', { method: 'POST', body: JSON.stringify({ token }) });
        } catch (error) {
            console.error("❌ Failed to join via collab link:", error);
            throw error;
        }
    },

    // Get collaborators for a song
    async getSongCollaborators(songId) {
        try {
            return await this.request(`/collaborators/${songId}`);
        } catch (error) {
            console.error("❌ Failed to get collaborators:", error);
            return [];
        }
    },

    // ========================================================================
    // Trophy Logic
    // ========================================================================

    async getTrophies() {
        try {
            return (await window.dailyBarsApi.api.get('trophies', { sort: 'xp_cost' })).data || [];
        } catch (error) {
            console.error("❌ Failed to fetch trophies:", error);
            return [];
        }
    },

    async getUserTrophies(userId) {
        if (!userId) return [];
        try {
            return (await this.request('/me/trophies')).map(t => t.trophy_id);
        } catch (error) {
            console.error("❌ Failed to fetch user trophies:", error);
            return [];
        }
    },

    async unlockTrophy(userId, trophyId) {
        try {
            return await window.dailyBarsApi.api.purchaseTrophy(trophyId);
        } catch (error) {
            console.error("❌ Failed to unlock trophy:", error);
            throw error;
        }
    },

    // ========================================================================
    // Beat Storage System
    // ========================================================================

    // Check if user can upload beats (premium or admin)
    async canUploadBeats(userId) {
        if (!userId) return false;
        try {
            const data = (await window.dailyBarsApi.api.get('users', { limit: 1 })).data?.[0];
            if (!data) return false;
            return data.role === 'admin' || ['premium', 'lifetime'].includes(data.subscription_status);
        } catch (error) {
            console.error("❌ Failed to check upload permission:", error);
            return false;
        }
    },

    // Check if user is admin
    async isAdmin(userId) {
        if (!userId) return false;
        try {
            const data = (await window.dailyBarsApi.api.get('users', { limit: 1 })).data?.[0];
            if (!data) return false;
            return data.role === 'admin';
        } catch (error) {
            return false;
        }
    },

    // Get user's storage info
    async getStorageInfo(userId) {
        if (!userId) return { used: 0, limit: 0, remaining: 0, unlimited: false };
        try {
            const data = (await window.dailyBarsApi.api.get('users', { limit: 1 })).data?.[0];
            if (!data) throw new Error('Profile not found');
            
            const isUnlimited = data.role === 'admin';
            return {
                used: data.storage_used_bytes || 0,
                limit: data.storage_limit_bytes || 0,
                remaining: isUnlimited ? -1 : Math.max(0, (data.storage_limit_bytes || 0) - (data.storage_used_bytes || 0)),
                unlimited: isUnlimited
            };
        } catch (error) {
            console.error("❌ Failed to get storage info:", error);
            return { used: 0, limit: 0, remaining: 0, unlimited: false };
        }
    },

    // Upload beat to Supabase Storage
    async uploadBeat(userId, file, songId = null, metadata = {}) {
        try {
            const client = window.supabaseClient;
            
            // Check permission first
            const canUpload = await this.canUploadBeats(userId);
            if (!canUpload) {
                throw new Error('Premium subscription required to upload beats');
            }
            
            // Check storage limit (skip for admins)
            const storageInfo = await this.getStorageInfo(userId);
            if (!storageInfo.unlimited && file.size > storageInfo.remaining) {
                throw new Error(`Storage limit exceeded. ${Math.round(storageInfo.remaining / 1024 / 1024)}MB remaining.`);
            }
            
            // Generate unique filename (flat structure, no folders)
            const ext = file.name.split('.').pop() || 'mp3';
            const filename = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            
            // Upload to storage bucket
            const { data: uploadData, error: uploadError } = await client
                .storage
                .from('beats')
                .upload(filename, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type || 'audio/mpeg'
                });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = client
                .storage
                .from('beats')
                .getPublicUrl(filename);
            
            // Create record in beats table - ALL METADATA FIELDS ARE OPTIONAL
            // Users can upload without knowing anything about the beat
            const beatData = {
                user_id: userId,
                song_id: songId || null,
                filename: filename,
                original_filename: file.name || null,
                file_size_bytes: file.size || 0,
                mime_type: file.type || 'audio/mpeg',
                storage_path: uploadData.path,
                public_url: urlData.publicUrl,
                
                // User-provided metadata (all optional, can be blank)
                title: metadata.title || null,
                artist: metadata.artist || null,
                album: metadata.album || null,
                bpm: metadata.bpm ? parseInt(metadata.bpm) : null,
                key: metadata.key || null,
                genre: metadata.genre || null,
                mood: metadata.mood || null,
                tags: metadata.tags || null,
                
                // Auto-detected fields (Premium/Admin feature)
                duration_seconds: metadata.duration_seconds || null,
                detected_bpm: metadata.detected_bpm || null,
                detected_bpm_confidence: metadata.detected_bpm_confidence || null,
                detected_key: metadata.detected_key || null,
                detected_key_confidence: metadata.detected_key_confidence || null,
                detected_energy: metadata.detected_energy || null,
                detected_danceability: metadata.detected_danceability || null,
                waveform_data: metadata.waveform_data || null,
                
                // Embedded ID3 metadata (extracted from file)
                embedded_title: metadata.embedded_title || null,
                embedded_artist: metadata.embedded_artist || null,
                embedded_album: metadata.embedded_album || null,
                embedded_year: metadata.embedded_year || null,
                embedded_genre: metadata.embedded_genre || null,
                
                // Analysis status
                analysis_status: metadata.detected_bpm ? 'completed' : 'pending',
                analysis_completed_at: metadata.detected_bpm ? new Date().toISOString() : null
            };
            
            // Remove null/undefined values to let database defaults apply
            Object.keys(beatData).forEach(key => {
                if (beatData[key] === null || beatData[key] === undefined) {
                    delete beatData[key];
                }
            });
            
            const beatRecord = await window.dailyBarsApi.api.create('beats', beatData);
            
            return {
                success: true,
                beat: beatRecord,
                url: urlData.publicUrl
            };
        } catch (error) {
            console.error("❌ Failed to upload beat:", error);
            throw error;
        }
    },

    // Get user's beats
    async getUserBeats(userId) {
        if (!userId) return [];
        try {
            return (await window.dailyBarsApi.api.get('beats', { sort: '-created_at' })).data || [];
        } catch (error) {
            console.error("❌ Failed to get user beats:", error);
            return [];
        }
    },

    // Delete a beat
    async deleteBeat(beatId, userId) {
        try {
            const client = window.supabaseClient;
            const beats = await window.dailyBarsApi.api.get('beats', { eq: { id: beatId }, limit: 1 });
            const beat = beats.data?.[0];
            if (!beat) throw new Error('Beat not found');
            
            // Delete from storage
            const { error: storageError } = await client
                .storage
                .from('beats')
                .remove([beat.storage_path]);
            
            if (storageError) console.warn('Storage delete error:', storageError);
            
            await window.dailyBarsApi.api.delete('beats', beatId);
            
            return { success: true };
        } catch (error) {
            console.error("❌ Failed to delete beat:", error);
            throw error;
        }
    },

    // Get signed URL for private beat (if bucket is private)
    async getBeatSignedUrl(beatPath, expiresIn = 3600) {
        try {
            const client = window.supabaseClient;
            const { data, error } = await client
                .storage
                .from('beats')
                .createSignedUrl(beatPath, expiresIn);
            
            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            console.error("❌ Failed to get signed URL:", error);
            throw error;
        }
    }
};

// Expose to window
window.DailyDepositEngine = DailyDepositEngine;
