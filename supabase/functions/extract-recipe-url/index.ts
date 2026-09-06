import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a recipe editor. Your job is to extract and clean recipes.
Take the provided recipe content and rewrite it as a clean, concise recipe.
Remove all blog narrative, life stories, SEO filler, ads, and unnecessary descriptions.
Keep only: a clear title, a brief one-sentence description, a clean ingredient list with precise measurements, and numbered step-by-step instructions written as direct, actionable commands.
Simplify complex instructions into plain language.
For ingredients, always separate the quantity, unit, and ingredient name.

Output ONLY valid JSON with this exact structure (no markdown, no extra text):
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

async function logImport(supabase: any, userId: string, urlHash?: string) {
  await supabase.from('recipe_import_log').insert({
    user_id: userId,
    url_hash: urlHash ?? null,
  });
}

async function getCachedResult(supabase: any, urlHash: string) {
  const { data } = await supabase
    .from('recipe_import_cache')
    .select('result')
    .eq('url_hash', urlHash)
    .single();
  return data?.result ?? null;
}

async function cacheResult(supabase: any, urlHash: string, result: any) {
  await supabase.from('recipe_import_cache').upsert({
    url_hash: urlHash,
    result,
    created_at: new Date().toISOString(),
  });
}

async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function extractJsonLd(html: string): any | null {
  const matches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'Recipe') return item;
        if (item['@graph']) {
          const recipe = item['@graph'].find((n: any) => n['@type'] === 'Recipe');
          if (recipe) return recipe;
        }
      }
    } catch {}
  }
  return null;
}

function extractImageUrl(html: string, jsonLd: any | null): string | null {
  // Try JSON-LD image first
  if (jsonLd?.image) {
    const img = jsonLd.image;
    if (typeof img === 'string') return img;
    if (Array.isArray(img) && typeof img[0] === 'string') return img[0];
    if (Array.isArray(img) && img[0]?.url) return img[0].url;
    if (img?.url) return img.url;
  }
  // Fall back to og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];
  return null;
}

function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000); // Limit tokens
}

async function callClaude(content: string, isExtract: boolean): Promise<any> {
  const userMessage = isExtract
    ? `Extract the recipe from this webpage text and rewrite it cleanly:\n\n${content}`
    : `Rewrite this recipe cleanly, removing all blog narrative:\n\n${content}`;

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
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Auth check
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

    // Rate limit
    const withinLimit = await checkRateLimit(supabase, user.id);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. You can import 20 recipes per day.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const urlHash = await hashUrl(url);

    // Check cache
    const cached = await getCachedResult(supabase, urlHash);
    if (cached) {
      await logImport(supabase, user.id, urlHash);
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Fetch page — use a realistic browser UA; many recipe sites block anything that looks like a bot
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!pageRes.ok) {
      throw new Error(`Failed to fetch URL: ${pageRes.status}`);
    }

    const html = await pageRes.text();

    // Try structured data first
    const jsonLd = extractJsonLd(html);
    let result: any;

    if (jsonLd) {
      // Format structured data for Claude to clean up
      const structured = JSON.stringify(jsonLd, null, 2).slice(0, 8000);
      result = await callClaude(structured, false);
    } else {
      // Fall back to full page text extraction
      const pageText = extractPageText(html);
      result = await callClaude(pageText, true);
    }

    result.source_url = url;
    result.image_url = extractImageUrl(html, jsonLd);

    // Cache and log
    await cacheResult(supabase, urlHash, result);
    await logImport(supabase, user.id, urlHash);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('extract-recipe-url error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
