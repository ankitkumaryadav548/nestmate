/**
 * Standard Compatibility Score Tone Helper
 * 
 * Rules:
 *  - 85 and above: success (teal)
 *  - 70 to 84: brand (indigo/violet)
 *  - 50 to 69: warning (amber)
 *  - below 50: neutral / rose-tinted neutral
 */

export function getScoreTone(score) {
  const s = Math.round(Number(score) || 0);
  if (s >= 85) return 'success';
  if (s >= 70) return 'brand';
  if (s >= 50) return 'warning';
  return 'neutral';
}

export function getScoreClasses(score) {
  const tone = getScoreTone(score);
  switch (tone) {
    case 'success':
      return {
        text: 'text-teal-700 dark:text-teal-300',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-800/60',
        badge: 'success',
        color: '#0d9488',
      };
    case 'brand':
      return {
        text: 'text-indigo-700 dark:text-indigo-300',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-800/60',
        badge: 'brand',
        color: '#4f46e5',
      };
    case 'warning':
      return {
        text: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/60',
        badge: 'warning',
        color: '#d97706',
      };
    default:
      return {
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-50 dark:bg-slate-900/60',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'neutral',
        color: '#64748b',
      };
  }
}

