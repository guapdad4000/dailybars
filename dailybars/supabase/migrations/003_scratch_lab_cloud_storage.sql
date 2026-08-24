-- ============================================================================
-- SCRATCH LAB - AUTHENTICATED CLOUD SESSIONS
-- Store beats and recorded layers in private managed storage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.scratch_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    title TEXT DEFAULT 'Untitled Session',
    beat_url TEXT,
    beat_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scratch_layers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.scratch_sessions(id) ON DELETE CASCADE,
    layer_number INTEGER NOT NULL,
    audio_url TEXT NOT NULL,
    waveform_data JSONB DEFAULT '[]'::JSONB,
    volume INTEGER DEFAULT 80,
    pan NUMERIC DEFAULT 0,
    muted BOOLEAN DEFAULT FALSE,
    solo BOOLEAN DEFAULT FALSE,
    duration_seconds NUMERIC DEFAULT 0,
    time_shift NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scratch_layers
    ADD COLUMN IF NOT EXISTS time_shift NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scratch_sessions_user ON public.scratch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_created_at ON public.scratch_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scratch_layers_session ON public.scratch_layers(session_id);

-- The original Scratch Lab schema shipped permissive public policies. Keep the
-- tables, but replace those policies with ownership checks tied to Supabase
-- Auth through the public users profile.
CREATE OR REPLACE FUNCTION public.scratch_profile_belongs_to_current_user(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = profile_id
          AND (auth_user_id = auth.uid() OR id = auth.uid())
    );
$$;

ALTER TABLE public.scratch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scratch sessions are viewable by everyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions can be created by anyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions can be updated by anyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions can be deleted by anyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions viewable by everyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions insertable by everyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions updatable by everyone" ON public.scratch_sessions;
DROP POLICY IF EXISTS "Scratch sessions deletable by everyone" ON public.scratch_sessions;

DROP POLICY IF EXISTS "Scratch layers are viewable by everyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers can be created by anyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers can be updated by anyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers can be deleted by anyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers viewable by everyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers insertable by everyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers updatable by everyone" ON public.scratch_layers;
DROP POLICY IF EXISTS "Scratch layers deletable by everyone" ON public.scratch_layers;

CREATE POLICY "Scratch Lab owners can view sessions"
ON public.scratch_sessions
FOR SELECT
TO authenticated
USING (public.scratch_profile_belongs_to_current_user(user_id));

CREATE POLICY "Scratch Lab owners can create sessions"
ON public.scratch_sessions
FOR INSERT
TO authenticated
WITH CHECK (public.scratch_profile_belongs_to_current_user(user_id));

CREATE POLICY "Scratch Lab owners can update sessions"
ON public.scratch_sessions
FOR UPDATE
TO authenticated
USING (public.scratch_profile_belongs_to_current_user(user_id))
WITH CHECK (public.scratch_profile_belongs_to_current_user(user_id));

CREATE POLICY "Scratch Lab owners can delete sessions"
ON public.scratch_sessions
FOR DELETE
TO authenticated
USING (public.scratch_profile_belongs_to_current_user(user_id));

CREATE POLICY "Scratch Lab owners can view layers"
ON public.scratch_layers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.scratch_sessions
        WHERE id = session_id
          AND public.scratch_profile_belongs_to_current_user(user_id)
    )
);

CREATE POLICY "Scratch Lab owners can create layers"
ON public.scratch_layers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.scratch_sessions
        WHERE id = session_id
          AND public.scratch_profile_belongs_to_current_user(user_id)
    )
);

CREATE POLICY "Scratch Lab owners can update layers"
ON public.scratch_layers
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.scratch_sessions
        WHERE id = session_id
          AND public.scratch_profile_belongs_to_current_user(user_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.scratch_sessions
        WHERE id = session_id
          AND public.scratch_profile_belongs_to_current_user(user_id)
    )
);

CREATE POLICY "Scratch Lab owners can delete layers"
ON public.scratch_layers
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.scratch_sessions
        WHERE id = session_id
          AND public.scratch_profile_belongs_to_current_user(user_id)
    )
);

-- A single RPC keeps session and layer metadata atomic. The browser uploads
-- audio first, then calls this function; no metadata row exists on upload
-- failure, and the client removes already-uploaded objects if this RPC fails.
CREATE OR REPLACE FUNCTION public.save_scratch_session(
    p_session_id UUID,
    p_user_id UUID,
    p_title TEXT,
    p_beat_url TEXT DEFAULT NULL,
    p_beat_title TEXT DEFAULT NULL,
    p_layers JSONB DEFAULT '[]'::JSONB
)
RETURNS public.scratch_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.scratch_sessions;
    v_username TEXT;
    v_layer JSONB;
    v_audio_path TEXT;
BEGIN
    IF auth.uid() IS NULL OR NOT public.scratch_profile_belongs_to_current_user(p_user_id) THEN
        RAISE EXCEPTION 'Scratch Lab sessions require an authenticated owner';
    END IF;

    SELECT username
    INTO v_username
    FROM public.users
    WHERE id = p_user_id;

    IF v_username IS NULL THEN
        RAISE EXCEPTION 'Scratch Lab user profile was not found';
    END IF;

    -- New storage paths are scoped to the Auth user. Allow legacy URLs so an
    -- existing session can be re-saved without forcing a migration download.
    IF p_beat_url IS NOT NULL
       AND p_beat_url !~* '^https?://'
       AND split_part(p_beat_url, '/', 1) <> auth.uid()::TEXT THEN
        RAISE EXCEPTION 'Scratch Lab beat path is not owned by the authenticated user';
    END IF;

    INSERT INTO public.scratch_sessions (id, user_id, username, title, beat_url, beat_title)
    VALUES (
        p_session_id,
        p_user_id,
        v_username,
        COALESCE(NULLIF(BTRIM(p_title), ''), 'Untitled Session'),
        p_beat_url,
        p_beat_title
    )
    RETURNING * INTO v_session;

    FOR v_layer IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_layers, '[]'::JSONB))
    LOOP
        v_audio_path := v_layer->>'audio_url';
        IF v_audio_path IS NULL OR v_audio_path = '' THEN
            RAISE EXCEPTION 'Scratch Lab layer is missing its storage path';
        END IF;
        IF v_audio_path !~* '^https?://'
           AND split_part(v_audio_path, '/', 1) <> auth.uid()::TEXT THEN
            RAISE EXCEPTION 'Scratch Lab layer path is not owned by the authenticated user';
        END IF;

        INSERT INTO public.scratch_layers (
            session_id,
            layer_number,
            audio_url,
            waveform_data,
            volume,
            pan,
            muted,
            solo,
            duration_seconds,
            time_shift
        )
        VALUES (
            p_session_id,
            COALESCE((v_layer->>'layer_number')::INTEGER, 1),
            v_audio_path,
            COALESCE(v_layer->'waveform_data', '[]'::JSONB),
            COALESCE((v_layer->>'volume')::INTEGER, 80),
            COALESCE((v_layer->>'pan')::NUMERIC, 0),
            COALESCE((v_layer->>'muted')::BOOLEAN, FALSE),
            COALESCE((v_layer->>'solo')::BOOLEAN, FALSE),
            (v_layer->>'duration_seconds')::NUMERIC,
            COALESCE((v_layer->>'time_shift')::NUMERIC, 0)
        );
    END LOOP;

    RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_scratch_session(UUID, UUID, TEXT, TEXT, TEXT, JSONB)
TO authenticated;

-- The bucket is private; signed URLs are generated by the client for playback.
INSERT INTO storage.buckets (id, name, public)
VALUES ('scratch-lab', 'scratch-lab', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS "Public read access for scratch-lab bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to scratch-lab bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own scratch-lab files" ON storage.objects;
DROP POLICY IF EXISTS "Scratch Lab authenticated users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Scratch Lab authenticated users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Scratch Lab authenticated users can delete own files" ON storage.objects;

CREATE POLICY "Scratch Lab authenticated users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'scratch-lab'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

CREATE POLICY "Scratch Lab authenticated users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'scratch-lab'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

CREATE POLICY "Scratch Lab authenticated users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'scratch-lab'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);