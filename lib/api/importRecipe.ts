import { supabase } from '../supabase';
import { Ingredient } from '../database.types';

export interface ImportedRecipe {
  title: string;
  description: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  ingredients: { name: string; amount: string; unit: string }[];
  instructions: string[];
  source_url?: string;
  image_url?: string;
  cached?: boolean;
}

function normalizeIngredients(raw: ImportedRecipe['ingredients']): Ingredient[] {
  return raw.map((ing) => ({
    name: ing.name,
    amount: ing.amount ?? '',
    unit: ing.unit ?? '',
  }));
}

async function fetchEdgeFunction(path: string, body: object, token: string): Promise<any> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Gateway returned HTML (413 too large, 502, etc.)
    throw new Error(
      response.status === 413
        ? 'Image is too large to process. Please try a smaller photo.'
        : `Import failed (${response.status}). Please try again.`
    );
  }
  if (!response.ok) throw new Error(data.error ?? 'Import failed');
  return data;
}

export async function importFromUrl(url: string): Promise<ImportedRecipe> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const data = await fetchEdgeFunction('extract-recipe-url', { url }, session.access_token);
  return { ...data, ingredients: normalizeIngredients(data.ingredients ?? []) };
}

