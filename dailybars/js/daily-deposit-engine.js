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
    
    async submitToSyndicate(promptText, author, type = 'PROMPT') {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('community_submissions')
                .insert({
                    prompt_text: promptText,
                    author: author || 'Anonymous',
                    likes: 0,
                    submission_type: type
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
    },

    // Track user upvotes to prevent duplicates (uses localStorage + optional DB)
    async upvotePost(postId, userId) {
        const storageKey = `upvoted_posts_${userId || 'guest'}`;
        
        try {
            // Check localStorage first (fast)
            const upvotedPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (upvotedPosts.includes(postId)) {
                return { alreadyVoted: true };
            }
            
            // Get current post
            const client = this.getSupabase();
            const { data: post, error: fetchError } = await client
                .from('community_submissions')
                .select('likes')
                .eq('id', postId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Increment likes
            const { data, error } = await client
                .from('community_submissions')
                .update({ likes: (post.likes || 0) + 1 })
                .eq('id', postId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Save to localStorage
            upvotedPosts.push(postId);
            localStorage.setItem(storageKey, JSON.stringify(upvotedPosts));
            
            return { success: true, newLikes: data.likes };
        } catch (error) {
            console.error("❌ Failed to upvote:", error);
            throw error;
        }
    },

    // Check if user already upvoted a post
    hasUpvoted(postId, userId) {
        const storageKey = `upvoted_posts_${userId || 'guest'}`;
        const upvotedPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return upvotedPosts.includes(postId);
    },

    // ========================================================================
    // Real-time Song Collaboration
    // ========================================================================

    // Subscribe to real-time changes on a song
    subscribeToSong(songId, callback) {
        const client = this.getSupabase();
        
        const channel = client
            .channel(`song_${songId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'songs',
                    filter: `id=eq.${songId}`
                },
                (payload) => {
                    console.log('🔄 Song updated in real-time:', payload);
                    callback(payload.new);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Song subscription status: ${status}`);
            });
        
        return channel;
    },

    // Unsubscribe from song updates
    unsubscribeFromSong(channel) {
        if (channel) {
            const client = this.getSupabase();
            client.removeChannel(channel);
        }
    },

    // Get active collaborators on a song (presence)
    async joinSongSession(songId, userId, username) {
        const client = this.getSupabase();
        
        const channel = client.channel(`song_presence_${songId}`, {
            config: {
                presence: {
                    key: userId || 'guest_' + Math.random().toString(36).slice(2)
                }
            }
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            console.log('👥 Collaborators:', state);
        });

        channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('👋 User joined:', key, newPresences);
        });

        channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('👋 User left:', key, leftPresences);
        });

        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userId,
                    username: username || 'Anonymous',
                    online_at: new Date().toISOString()
                });
            }
        });

        return channel;
    },

    // Broadcast cursor/selection position to collaborators
    broadcastCursor(channel, userId, position) {
        if (channel) {
            channel.send({
                type: 'broadcast',
                event: 'cursor',
                payload: { userId, position }
            });
        }
    },

    // Create a shareable collaboration link
    async createCollabLink(songId, ownerId) {
        // Generate a unique token
        const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('song_collaborators')
                .insert({
                    song_id: songId,
                    invite_token: token,
                    created_by: ownerId,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                })
                .select()
                .single();
            
            if (error) throw error;
            
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
            const client = this.getSupabase();
            
            // Find the invite
            const { data: invite, error: findError } = await client
                .from('song_collaborators')
                .select('song_id, expires_at')
                .eq('invite_token', token)
                .single();
            
            if (findError || !invite) {
                throw new Error('Invalid or expired invite link');
            }
            
            // Check expiration
            if (new Date(invite.expires_at) < new Date()) {
                throw new Error('Invite link has expired');
            }
            
            // Add user as collaborator
            const { error: addError } = await client
                .from('song_collaborators')
                .insert({
                    song_id: invite.song_id,
                    user_id: userId,
                    username: username,
                    role: 'editor'
                });
            
            // Ignore duplicate errors (user already collaborator)
            if (addError && !addError.message.includes('duplicate')) {
                throw addError;
            }
            
            return { songId: invite.song_id };
        } catch (error) {
            console.error("❌ Failed to join via collab link:", error);
            throw error;
        }
    },

    // Get collaborators for a song
    async getSongCollaborators(songId) {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('song_collaborators')
                .select('user_id, username, role, created_at')
                .eq('song_id', songId)
                .not('user_id', 'is', null);
            
            if (error) throw error;
            return data || [];
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
            const client = this.getSupabase();
            const { data, error } = await client
                .from('trophies')
                .select('*')
                .order('xp_cost', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("❌ Failed to fetch trophies:", error);
            return [];
        }
    },

    async getUserTrophies(userId) {
        if (!userId) return [];
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('user_trophies')
                .select('trophy_id')
                .eq('user_id', userId);
            
            if (error) throw error;
            return data.map(t => t.trophy_id);
        } catch (error) {
            console.error("❌ Failed to fetch user trophies:", error);
            return [];
        }
    },

    async unlockTrophy(userId, trophyId) {
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('user_trophies')
                .insert({ user_id: userId, trophy_id: trophyId })
                .select()
                .single();
            
            if (error) throw error;
            return data;
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
            const client = this.getSupabase();
            const { data, error } = await client
                .from('users')
                .select('role, subscription_status')
                .eq('id', userId)
                .single();
            
            if (error) return false;
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
            const client = this.getSupabase();
            const { data, error } = await client
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();
            
            if (error) return false;
            return data.role === 'admin';
        } catch (error) {
            return false;
        }
    },

    // Get user's storage info
    async getStorageInfo(userId) {
        if (!userId) return { used: 0, limit: 0, remaining: 0, unlimited: false };
        try {
            const client = this.getSupabase();
            const { data, error } = await client
                .from('users')
                .select('storage_used_bytes, storage_limit_bytes, role')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            
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
            const client = this.getSupabase();
            
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
            
            // Generate unique filename
            const ext = file.name.split('.').pop() || 'mp3';
            const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            
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
            
            // Create record in beats table
            const { data: beatRecord, error: dbError } = await client
                .from('beats')
                .insert({
                    user_id: userId,
                    song_id: songId,
                    filename: filename,
                    original_filename: file.name,
                    file_size_bytes: file.size,
                    mime_type: file.type || 'audio/mpeg',
                    storage_path: uploadData.path,
                    public_url: urlData.publicUrl,
                    title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
                    artist: metadata.artist,
                    bpm: metadata.bpm,
                    key: metadata.key,
                    tags: metadata.tags
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            
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
            const client = this.getSupabase();
            const { data, error } = await client
                .from('beats')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("❌ Failed to get user beats:", error);
            return [];
        }
    },

    // Delete a beat
    async deleteBeat(beatId, userId) {
        try {
            const client = this.getSupabase();
            
            // Get beat info first
            const { data: beat, error: fetchError } = await client
                .from('beats')
                .select('*')
                .eq('id', beatId)
                .eq('user_id', userId)
                .single();
            
            if (fetchError || !beat) throw new Error('Beat not found');
            
            // Delete from storage
            const { error: storageError } = await client
                .storage
                .from('beats')
                .remove([beat.storage_path]);
            
            if (storageError) console.warn('Storage delete error:', storageError);
            
            // Delete from database (this will trigger storage usage update)
            const { error: dbError } = await client
                .from('beats')
                .delete()
                .eq('id', beatId);
            
            if (dbError) throw dbError;
            
            return { success: true };
        } catch (error) {
            console.error("❌ Failed to delete beat:", error);
            throw error;
        }
    },

    // Get signed URL for private beat (if bucket is private)
    async getBeatSignedUrl(beatPath, expiresIn = 3600) {
        try {
            const client = this.getSupabase();
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
