import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dailybars-proxy-secret',
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

type GenerateRequest = {
  prompt?: string;
  systemPrompt?: string;
};

async function generateWithGemini(prompt: string, systemPrompt: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed');
  }

  return data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function generateWithOpenAI(prompt: string, systemPrompt: string) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.85
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI request failed');
  }

  return data?.choices?.[0]?.message?.content?.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const proxySecret = Deno.env.get('DAILYBARS_AI_PROXY_SECRET');
  const suppliedSecret = req.headers.get('x-dailybars-proxy-secret');
  if (!proxySecret || !suppliedSecret || suppliedSecret !== proxySecret) {
    return jsonResponse({ error: 'AI requests must use the Daily Raps API.' }, 403);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization') || '';

  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Missing Supabase auth configuration' }, 500);
  }

  if (!authorization) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  try {
    const body = (await req.json()) as GenerateRequest;
    const prompt = body.prompt?.trim();
    const systemPrompt = body.systemPrompt?.trim() ||
      "You are GUAPDAD 4000's AI assistant. Write bars with Oakland energy - witty, slick, confident. Just output the bars, no explanations.";

    if (!prompt) {
      return jsonResponse({ error: 'Prompt required' }, 400);
    }

    const text = await generateWithGemini(prompt, systemPrompt) ||
      await generateWithOpenAI(prompt, systemPrompt);

    if (!text) {
      return jsonResponse({ error: 'No AI provider configured' }, 501);
    }

    return jsonResponse({ text });
  } catch (error) {
    console.error('dailybars-ai failed:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'AI generation failed' }, 500);
  }
});
