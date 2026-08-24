-- ============================================================================
-- DAILY BARS - App Store hardening
-- Auth profiles, account deletion audit trail, and community moderation support.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Link public app profiles to Supabase Auth users without breaking legacy rows.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

ALTER TABLE community_submissions
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'visible'
        CHECK (moderation_status IN ('visible', 'reported', 'hidden', 'removed')),
    ADD COLUMN IF NOT EXISTS reported_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_community_submissions_user_id ON community_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_submissions_moderation ON community_submissions(moderation_status);

CREATE TABLE IF NOT EXISTS community_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES community_submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_submission ON community_upvotes(submission_id);
CREATE INDEX IF NOT EXISTS idx_community_upvotes_user ON community_upvotes(user_id);

CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES community_submissions(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT DEFAULT 'inappropriate',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reports_submission ON community_reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter ON community_reports(reporter_id);

CREATE TABLE IF NOT EXISTS community_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_author TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, blocked_author)
);

CREATE INDEX IF NOT EXISTS idx_community_blocks_user ON community_blocks(user_id);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_auth_user ON account_deletion_requests(auth_user_id);

CREATE OR REPLACE FUNCTION public.profile_belongs_to_current_user(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users
        WHERE id = profile_id
          AND (auth_user_id = auth.uid() OR id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.increment_submission_report_count(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE community_submissions
    SET reported_count = COALESCE(reported_count, 0) + 1,
        moderation_status = CASE
            WHEN COALESCE(reported_count, 0) + 1 >= 3 THEN 'reported'
            ELSE moderation_status
        END
    WHERE id = p_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upvote_submission(
    p_submission_id UUID,
    p_user_id UUID,
    p_username TEXT DEFAULT 'Anonymous'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_likes INTEGER;
BEGIN
    IF NOT public.profile_belongs_to_current_user(p_user_id) THEN
        RAISE EXCEPTION 'User profile does not belong to authenticated user';
    END IF;

    INSERT INTO community_upvotes (submission_id, user_id, username)
    VALUES (p_submission_id, p_user_id, COALESCE(p_username, 'Anonymous'))
    ON CONFLICT (submission_id, user_id) DO NOTHING;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('alreadyVoted', true);
    END IF;

    UPDATE community_submissions
    SET likes = COALESCE(likes, 0) + 1
    WHERE id = p_submission_id
      AND moderation_status = 'visible'
    RETURNING likes INTO v_likes;

    RETURN jsonb_build_object('success', true, 'newLikes', COALESCE(v_likes, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_request_id UUID;
BEGIN
    SELECT id INTO v_profile_id
    FROM users
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
    LIMIT 1;

    INSERT INTO account_deletion_requests (auth_user_id, user_id)
    VALUES (auth.uid(), v_profile_id)
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_submission_report_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upvote_submission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community readable" ON community_submissions;
DROP POLICY IF EXISTS "Community insertable" ON community_submissions;
DROP POLICY IF EXISTS "Community updatable" ON community_submissions;
DROP POLICY IF EXISTS "Visible community submissions are readable" ON community_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit community posts" ON community_submissions;
DROP POLICY IF EXISTS "Owners can update own community posts" ON community_submissions;

CREATE POLICY "Visible community submissions are readable"
ON community_submissions
FOR SELECT
USING (moderation_status = 'visible');

CREATE POLICY "Authenticated users can submit community posts"
ON community_submissions
FOR INSERT
TO authenticated
WITH CHECK (public.profile_belongs_to_current_user(user_id));

CREATE POLICY "Owners can update own community posts"
ON community_submissions
FOR UPDATE
TO authenticated
USING (public.profile_belongs_to_current_user(user_id))
WITH CHECK (public.profile_belongs_to_current_user(user_id));

DROP POLICY IF EXISTS "Users can view own upvotes" ON community_upvotes;
DROP POLICY IF EXISTS "Users can insert own upvotes" ON community_upvotes;

CREATE POLICY "Users can view own upvotes"
ON community_upvotes
FOR SELECT
TO authenticated
USING (public.profile_belongs_to_current_user(user_id));

CREATE POLICY "Users can insert own upvotes"
ON community_upvotes
FOR INSERT
TO authenticated
WITH CHECK (public.profile_belongs_to_current_user(user_id));

DROP POLICY IF EXISTS "Users can view own reports" ON community_reports;
DROP POLICY IF EXISTS "Users can create own reports" ON community_reports;

CREATE POLICY "Users can view own reports"
ON community_reports
FOR SELECT
TO authenticated
USING (public.profile_belongs_to_current_user(reporter_id));

CREATE POLICY "Users can create own reports"
ON community_reports
FOR INSERT
TO authenticated
WITH CHECK (public.profile_belongs_to_current_user(reporter_id));

DROP POLICY IF EXISTS "Users can view own blocks" ON community_blocks;
DROP POLICY IF EXISTS "Users can create own blocks" ON community_blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON community_blocks;

CREATE POLICY "Users can view own blocks"
ON community_blocks
FOR SELECT
TO authenticated
USING (public.profile_belongs_to_current_user(user_id));

CREATE POLICY "Users can create own blocks"
ON community_blocks
FOR INSERT
TO authenticated
WITH CHECK (public.profile_belongs_to_current_user(user_id));

CREATE POLICY "Users can delete own blocks"
ON community_blocks
FOR DELETE
TO authenticated
USING (public.profile_belongs_to_current_user(user_id));

DROP POLICY IF EXISTS "Users can view own deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can request own deletion" ON account_deletion_requests;

CREATE POLICY "Users can view own deletion requests"
ON account_deletion_requests
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Users can request own deletion"
ON account_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());
