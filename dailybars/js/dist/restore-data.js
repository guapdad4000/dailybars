(function () {
// ============================================================================
// DAILY BARS - SUPABASE DATA RESTORE SCRIPT
// Run this in browser console after pasting your backup data
// ============================================================================

window.RESTORE_TO_SUPABASE = async backupData => {
  const SUPABASE_URL = 'https://tilpgwoyyervbgdlucap.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHBnd295eWVydmJnZGx1Y2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTAwNDksImV4cCI6MjA4MjQ4NjA0OX0.Zw1DPMS91CxaNArACem74_-mR6IPmYpDqJksK8gwEk0';
  const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : window.supabaseClient;
  if (!client) {
    console.error("❌ Supabase client not found! Make sure you're on the Daily Bars site.");
    return;
  }
  console.log("🚀 Starting Supabase restore...");
  console.log("📦 Backup data:", backupData);

  // Parse if string
  const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;

  // Stats
  let restored = {
    bars: 0,
    songs: 0,
    users: 0
  };
  let failed = {
    bars: 0,
    songs: 0,
    users: 0
  };

  // ========================================================================
  // RESTORE BARS
  // ========================================================================
  if (data.bars?.data && data.bars.data.length > 0) {
    console.log(`\n📝 Restoring ${data.bars.data.length} bars...`);
    for (const bar of data.bars.data) {
      try {
        // Clean and transform the bar data
        const cleanBar = {
          text: bar.text,
          tags: bar.tags || [],
          image_url: bar.imageUrl || bar.image_url || null,
          audio_url: bar.audioUrl || bar.audio_url || null,
          is_favorite: bar.isFavorite || bar.is_favorite || false,
          ai_generated: bar.aiGenerated || bar.ai_generated || false,
          username: bar.username || 'guap'
        };

        // Skip if no text
        if (!cleanBar.text || cleanBar.text.trim() === '') {
          console.log(`⏭️ Skipping empty bar`);
          continue;
        }

        // Skip base64 images that are too large (Supabase has limits)
        if (cleanBar.image_url && cleanBar.image_url.startsWith('data:') && cleanBar.image_url.length > 100000) {
          console.log(`⚠️ Skipping large base64 image for bar: "${cleanBar.text.substring(0, 30)}..."`);
          cleanBar.image_url = null;
        }
        const {
          data: result,
          error
        } = await client.from('bars').insert(cleanBar).select().single();
        if (error) {
          console.error(`❌ Failed to restore bar: "${cleanBar.text.substring(0, 30)}..."`, error.message);
          failed.bars++;
        } else {
          console.log(`✅ Restored: "${cleanBar.text.substring(0, 40)}..."`);
          restored.bars++;
        }
      } catch (err) {
        console.error(`❌ Error restoring bar:`, err);
        failed.bars++;
      }
    }
  }

  // ========================================================================
  // RESTORE SONGS
  // ========================================================================
  if (data.songs?.data && data.songs.data.length > 0) {
    console.log(`\n🎵 Restoring ${data.songs.data.length} songs...`);
    for (const song of data.songs.data) {
      try {
        const cleanSong = {
          title: song.title,
          blocks: song.blocks || [],
          status: song.status || 'draft',
          is_favorite: song.isFavorite || song.is_favorite || false,
          cover_image: song.coverImage || song.cover_image || null,
          beat_url: song.beatUrl || song.beat_url || null,
          studio: song.studio || '',
          producer: song.producer || '',
          key: song.key || song.song_key || '',
          bpm: song.bpm ?? null,
          username: song.username || 'guap'
        };
        if (!cleanSong.title || cleanSong.title.trim() === '') {
          console.log(`⏭️ Skipping song with no title`);
          continue;
        }
        const {
          data: result,
          error
        } = await client.from('songs').insert(cleanSong).select().single();
        if (error) {
          console.error(`❌ Failed to restore song: "${cleanSong.title}"`, error.message);
          failed.songs++;
        } else {
          console.log(`✅ Restored song: "${cleanSong.title}"`);
          restored.songs++;
        }
      } catch (err) {
        console.error(`❌ Error restoring song:`, err);
        failed.songs++;
      }
    }
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log("\n" + "=".repeat(50));
  console.log("🏁 RESTORE COMPLETE!");
  console.log("=".repeat(50));
  console.log(`✅ Bars restored: ${restored.bars}`);
  console.log(`✅ Songs restored: ${restored.songs}`);
  if (failed.bars > 0 || failed.songs > 0) {
    console.log(`❌ Bars failed: ${failed.bars}`);
    console.log(`❌ Songs failed: ${failed.songs}`);
  }
  console.log("=".repeat(50));
  console.log("\n🔄 Refresh the page to see your restored data!");
  return {
    restored,
    failed
  };
};

// Quick helper to restore just bars from an array
window.RESTORE_BARS = async barsArray => {
  return window.RESTORE_TO_SUPABASE({
    bars: {
      data: barsArray
    }
  });
};
console.log("📦 Restore script loaded!");
console.log("Usage: RESTORE_TO_SUPABASE({ bars: { data: [...] }, songs: { data: [...] } })");
console.log("Or: RESTORE_BARS([...array of bars...])");
})();
