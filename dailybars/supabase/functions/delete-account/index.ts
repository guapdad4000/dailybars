import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization') || '';

  if (!supabaseUrl || !anonKey || !authorization) {
    return jsonResponse({ error: 'Missing Supabase auth configuration' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  if (!serviceRoleKey) {
    const { data: requestId, error } = await userClient.rpc('request_account_deletion');
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({
      status: 'pending',
      requestId,
      message: 'Account deletion request recorded. Configure SUPABASE_SERVICE_ROLE_KEY to complete deletion automatically.'
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const user = authData.user;

  let requestId: string | null = null;

  try {
    const { data: profile } = await adminClient
      .from('users')
      .select('id, username')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    const { data: deletionRequest } = await adminClient
      .from('account_deletion_requests')
      .insert({
        auth_user_id: user.id,
        user_id: profile?.id || null,
        status: 'pending'
      })
      .select('id')
      .single();

    requestId = deletionRequest?.id || null;

    if (profile?.id) {
      await Promise.allSettled([
        adminClient.from('community_reports').delete().eq('reporter_id', profile.id),
        adminClient.from('community_blocks').delete().eq('user_id', profile.id),
        adminClient.from('community_upvotes').delete().eq('user_id', profile.id),
        adminClient.from('community_submissions').delete().eq('user_id', profile.id)
      ]);
    }

    if (profile?.username) {
      await Promise.allSettled([
        adminClient.from('bars').delete().eq('username', profile.username),
        adminClient.from('songs').delete().eq('username', profile.username)
      ]);
    }

    if (profile?.id) {
      await adminClient.from('users').delete().eq('id', profile.id);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    if (requestId) {
      await adminClient
        .from('account_deletion_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', requestId);
    }

    return jsonResponse({ status: 'completed', requestId });
  } catch (error) {
    console.error('delete-account failed:', error);

    if (requestId) {
      await adminClient
        .from('account_deletion_requests')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Account deletion failed'
        })
        .eq('id', requestId);
    }

    return jsonResponse({ error: error instanceof Error ? error.message : 'Account deletion failed' }, 500);
  }
});
