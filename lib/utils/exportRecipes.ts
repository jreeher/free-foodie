import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Recipe, Ingredient } from '../database.types';

const BRAND_COLOR = '#C4654A';
const BG_COLOR = '#FAFAF7';
const TEXT_COLOR = '#2C2C2C';
const SECONDARY_TEXT = '#6B6B6B';
const BORDER_COLOR = '#E8E0D5';

function formatTime(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function ingredientLine(ing: Ingredient): string {
  const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
  return parts.join(' ');
}

function recipeCardHtml(recipe: Recipe): string {
  const ingredients: Ingredient[] = (recipe.ingredients as Ingredient[]) ?? [];
  const instructions: string[] = (recipe.instructions as string[]) ?? [];
  const computed = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  const totalTime = recipe.total_time_minutes ?? (computed > 0 ? computed : null);

  const metaItems = [
    recipe.prep_time_minutes ? `<div class="meta-item"><span class="meta-label">Prep</span><span class="meta-value">${formatTime(recipe.prep_time_minutes)}</span></div>` : '',
    recipe.cook_time_minutes ? `<div class="meta-item"><span class="meta-label">Cook</span><span class="meta-value">${formatTime(recipe.cook_time_minutes)}</span></div>` : '',
    totalTime ? `<div class="meta-item"><span class="meta-label">Total</span><span class="meta-value">${formatTime(totalTime)}</span></div>` : '',
    recipe.servings ? `<div class="meta-item"><span class="meta-label">Serves</span><span class="meta-value">${recipe.servings}</span></div>` : '',
  ].filter(Boolean).join('');

  const ingredientsList = ingredients
    .map(ing => `<li>${ingredientLine(ing)}</li>`)
    .join('');

  const instructionsList = instructions
    .map((step, i) => `<li><span class="step-num">${i + 1}</span><span class="step-text">${step}</span></li>`)
    .join('');

  const imageHtml = recipe.image_url
    ? `<img src="${recipe.image_url}" class="hero-image" alt="${recipe.title}" />`
    : '';

  const sourceHtml = recipe.source_url
    ? `<p class="source">Source: <a href="${recipe.source_url}">${recipe.source_url}</a></p>`
    : '';

  return `
    <div class="recipe-card">
      ${imageHtml}
      <div class="card-body">
        <div class="card-header">
          <h1 class="recipe-title">${recipe.title}</h1>
          ${recipe.description ? `<p class="recipe-desc">${recipe.description}</p>` : ''}
        </div>
        ${metaItems ? `<div class="meta-row">${metaItems}</div>` : ''}
        <div class="two-col">
          <div class="ingredients-col">
            <h2 class="section-title">Ingredients</h2>
            <ul class="ingredients-list">${ingredientsList}</ul>
          </div>
          <div class="instructions-col">
            <h2 class="section-title">Instructions</h2>
            <ol class="instructions-list">${instructionsList}</ol>
          </div>
        </div>
        ${sourceHtml}
        <div class="footer">Simmer Down</div>
      </div>
    </div>
  `;
}

function wrapHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: ${BG_COLOR};
      color: ${TEXT_COLOR};
      font-size: 13px;
      line-height: 1.5;
    }
    .recipe-card {
      max-width: 750px;
      margin: 0 auto;
      background: #fff;
      page-break-after: always;
    }
    .hero-image {
      width: 100%;
      height: 280px;
      object-fit: cover;
      display: block;
    }
    .card-body {
      padding: 28px 32px 24px;
    }
    .card-header {
      border-bottom: 2px solid ${BRAND_COLOR};
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .recipe-title {
      font-size: 26px;
      color: ${BRAND_COLOR};
      font-weight: normal;
      letter-spacing: -0.3px;
      margin-bottom: 6px;
    }
    .recipe-desc {
      color: ${SECONDARY_TEXT};
      font-style: italic;
      font-size: 13px;
    }
    .meta-row {
      display: flex;
      gap: 0;
      margin-bottom: 20px;
      border: 1px solid ${BORDER_COLOR};
      border-radius: 8px;
      overflow: hidden;
    }
    .meta-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 8px;
      border-right: 1px solid ${BORDER_COLOR};
    }
    .meta-item:last-child { border-right: none; }
    .meta-label {
      font-family: Arial, sans-serif;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${SECONDARY_TEXT};
      margin-bottom: 3px;
    }
    .meta-value {
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: bold;
      color: ${TEXT_COLOR};
    }
    .two-col {
      display: flex;
      gap: 32px;
    }
    .ingredients-col {
      width: 38%;
      flex-shrink: 0;
    }
    .instructions-col {
      flex: 1;
    }
    .section-title {
      font-family: Arial, sans-serif;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${BRAND_COLOR};
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid ${BORDER_COLOR};
    }
    .ingredients-list {
      list-style: none;
      padding: 0;
    }
    .ingredients-list li {
      padding: 5px 0;
      border-bottom: 1px solid ${BORDER_COLOR};
      font-size: 12px;
    }
    .ingredients-list li:last-child { border-bottom: none; }
    .instructions-list {
      list-style: none;
      padding: 0;
    }
    .instructions-list li {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: flex-start;
    }
    .step-num {
      background: ${BRAND_COLOR};
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: bold;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text { font-size: 12px; }
    .source {
      margin-top: 16px;
      font-size: 10px;
      color: ${SECONDARY_TEXT};
      font-family: Arial, sans-serif;
    }
    .source a { color: ${BRAND_COLOR}; }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid ${BORDER_COLOR};
      text-align: center;
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: ${SECONDARY_TEXT};
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    @media print {
      .recipe-card { page-break-after: always; }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export async function exportSingleRecipe(recipe: Recipe): Promise<void> {
  const html = wrapHtml(recipeCardHtml(recipe), recipe.title);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${recipe.title} — Recipe Card`,
    UTI: 'com.adobe.pdf',
  });
}

export async function exportAllRecipes(recipes: Recipe[]): Promise<void> {
  if (!recipes.length) throw new Error('No recipes to export');
  const body = recipes.map(recipeCardHtml).join('');
  const html = wrapHtml(body, 'My Recipes — Simmer Down');
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `My Recipes (${recipes.length})`,
    UTI: 'com.adobe.pdf',
  });
}
