// Unicode fraction map for display
const UNICODE_FRACTIONS: Record<string, number> = {
  '\u00BC': 0.25,  // ¼
  '\u00BD': 0.5,   // ½
  '\u00BE': 0.75,  // ¾
  '\u2153': 1/3,   // ⅓
  '\u2154': 2/3,   // ⅔
  '\u2155': 0.2,   // ⅕
  '\u2156': 0.4,   // ⅖
  '\u2157': 0.6,   // ⅗
  '\u2158': 0.8,   // ⅘
  '\u2159': 1/6,   // ⅙
  '\u215A': 5/6,   // ⅚
  '\u215B': 0.125, // ⅛
  '\u215C': 0.375, // ⅜
  '\u215D': 0.625, // ⅝
  '\u215E': 0.875, // ⅞
};

// Common fraction display map.
// Keys must match what Number.toFixed(3) produces — note trailing zeros are included.
const FRACTION_DISPLAY: Record<string, string> = {
  '0.125': '1/8',
  '0.250': '1/4',  // 0.25.toFixed(3) === '0.250'
  '0.333': '1/3',
  '0.375': '3/8',
  '0.500': '1/2',  // 0.5.toFixed(3) === '0.500'
  '0.625': '5/8',
  '0.667': '2/3',
  '0.750': '3/4',  // 0.75.toFixed(3) === '0.750'
  '0.875': '7/8',
};

/** Parse a string like "1 1/2", "1.5", "½", "2-3" into a number */
export function parseAmount(amount: string): number {
  if (!amount) return 0;
  const trimmed = amount.trim();

  // Handle ranges like "2-3" — return the average
  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }

  // Replace unicode fractions
  let normalized = trimmed;
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(char, ` ${val}`);
  }

  // Handle "1 1/2" or "1/2" or "1 2/3"
  const parts = normalized.trim().split(/\s+/);
  let result = 0;

  for (const part of parts) {
    const fractionMatch = part.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      result += parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
    } else {
      const n = parseFloat(part);
      if (!isNaN(n)) result += n;
    }
  }

  return result;
}

/** Format a number as a human-readable cooking fraction */
export function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (!isFinite(value)) return '';

  const whole = Math.floor(value);
  const decimal = value - whole;

  if (decimal < 0.01) {
    return String(whole);
  }

  // Find the closest common fraction
  const fractionStr = decimal.toFixed(3);
  const fractionDisplay = FRACTION_DISPLAY[fractionStr];

  if (fractionDisplay) {
    return whole > 0 ? `${whole} ${fractionDisplay}` : fractionDisplay;
  }

  // Find nearest common fraction within 2% tolerance
  const commonFractions = [
    [1, 8], [1, 4], [1, 3], [3, 8],
    [1, 2], [5, 8], [2, 3], [3, 4], [7, 8],
  ] as const;

  for (const [num, den] of commonFractions) {
    if (Math.abs(decimal - num / den) < 0.02) {
      const frac = `${num}/${den}`;
      return whole > 0 ? `${whole} ${frac}` : frac;
    }
  }

  // Fall back to 1 decimal place
  return value.toFixed(1).replace(/\.0$/, '');
}

/** Scale an amount string by a multiplier, returning a display string */
export function scaleAmount(amount: string, multiplier: number): string {
  const parsed = parseAmount(amount);
  if (parsed === 0) return amount; // Can't scale "to taste", etc.
  return formatAmount(parsed * multiplier);
}

/** Format time in minutes to "X hr Y min" or "X min" */
export function formatTime(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
