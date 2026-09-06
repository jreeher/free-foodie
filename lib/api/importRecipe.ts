import * as ImageManipulator from 'expo-image-manipulator';
import { imageUriToBase64 } from '../utils/webCompat';
import { supabase } from '../supabase';
import { Ingredient } from '../database.types';
import { guessAisleCategory } from '../utils/ingredients';
import { AisleCategory } from '../theme';

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
    aisle_category: guessAisleCategory(ing.name) as AisleCategory,
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

export async function importFromImage(
  base64: string,
  mediaType: string = 'image/jpeg'
): Promise<ImportedRecipe> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const data = await fetchEdgeFunction(
    'extract-recipe-image',
    { image_base64: base64, media_type: mediaType },
    session.access_token
  );
  return { ...data, ingredients: normalizeIngredients(data.ingredients ?? []) };
}

/** Compress and convert a local image URI to base64 for the API.
 *  Resizes to max 1500px and applies JPEG compression to stay well under
 *  the edge function request body limit. */
export async function uriToBase64(uri: string): Promise<{ base64: string; mediaType: string; compressedUri: string }> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );

  const base64 = await imageUriToBase64(compressed.uri);

  return { base64, mediaType: 'image/jpeg', compressedUri: compressed.uri };
}
