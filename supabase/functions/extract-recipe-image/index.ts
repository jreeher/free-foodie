import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a recipe editor. Your job is to extract recipes from images.
Extract the recipe from the provided image (cookbook page, recipe card, handwritten note, screenshot, etc).
Rewrite it as a clean, concise recipe. Remove any narrative or unnecessary text.
For ingredients, always separate the quantity, unit, and ingredient name.

IMPORTANT: Only extract a recipe if you can actually read one in the image. Do NOT invent or hallucinate recipes.
If the image does not clearly contain a readable recipe, or if you cannot make out the text well enough to be confident, output this exact JSON instead:
{ "error": "No readable recipe found in this image. Please try a clearer photo with better lighting." }

If you CAN read a recipe, output ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "title": "string",
  "description": "string (one sentence)",
  "servings": number,
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "ingredients": [
    { "name": "string", "amount": "string", "unit": "string" }
  ],
  "instructions": ["string", "string"]
}`;

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('recipe_import_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  return (count ?? 0) < 20;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized: ${authError?.message ?? 'no user'}` }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const withinLimit = await checkRateLimit(supabase, user.id);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. You can import 20 recipes per day.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const { image_base64, media_type = 'image/jpeg' } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type,
                  data: image_base64,
                },
              },
              {
                type: 'text',
                text: 'Extract and clean the recipe from this image. Output only the JSON.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(cleaned);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 422,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Log the import
    await supabase.from('recipe_import_log').insert({ user_id: user.id });

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('extract-recipe-image error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
