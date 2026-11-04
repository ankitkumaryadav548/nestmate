/**
 * Status Tone Helpers for HostelMatch
 * 
 * Provides consistent color mapping and Tailwind classes across all screens.
 * WCAG AA compliant across both light and dark themes.
 */

export function getRoomStatusTone(status) {
  const s = String(status || '').toLowerCase().trim();
  switch (s) {
    case 'available':
      return 'teal';
    case 'claimed':
    case 'reserved':
      return 'amber';
    case 'full':
    case 'occupied':
      return 'brand';
    case 'maintenance':
      return 'rose';
    default:
      return 'slate';
  }
}

export function getRoomStatusClasses(status) {
  const tone = getRoomStatusTone(status);
  switch (tone) {
    case 'teal':
      return {
        badge: 'success',
        text: 'text-teal-700 dark:text-teal-300',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-800/60',
        dot: 'bg-teal-500',
        color: '#0d9488',
        label: 'Available',
      };
    case 'amber':
      return {
        badge: 'warning',
        text: 'text-amber-800 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        color: '#d97706',
        label: status === 'reserved' ? 'Reserved' : 'Claimed',
      };
    case 'brand':
      return {
        badge: 'brand',
        text: 'text-indigo-700 dark:text-indigo-300',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-800/60',
        dot: 'bg-indigo-500',
        color: '#4f46e5',
        label: status === 'occupied' ? 'Occupied' : 'Full',
      };
    case 'rose':
      return {
        badge: 'danger',
        text: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800/60',
        dot: 'bg-rose-500',
        color: '#e11d48',
        label: 'Maintenance',
      };
    default:
      return {
        badge: 'neutral',
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        color: '#64748b',
        label: String(status || 'Unknown'),
      };
  }
}

export function getRunStatusTone(status) {
  const s = String(status || '').toLowerCase().trim();
  switch (s) {
    case 'draft':
      return 'amber';
    case 'publishing':
      return 'blue';
    case 'published':
      return 'teal';
    case 'rolled_back':
      return 'slate';
    case 'failed':
      return 'rose';
    case 'discarded':
      return 'slate';
    default:
      return 'slate';
  }
}

export function getRunStatusClasses(status) {
  const tone = getRunStatusTone(status);
  switch (tone) {
    case 'teal':
      return {
        badge: 'success',
        text: 'text-teal-700 dark:text-teal-300',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-800/60',
        dot: 'bg-teal-500',
        label: 'Published',
      };
    case 'amber':
      return {
        badge: 'warning',
        text: 'text-amber-800 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        label: 'Draft',
      };
    case 'blue':
      return {
        badge: 'info',
        text: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500 animate-pulse',
        label: 'Publishing',
      };
    case 'rose':
      return {
        badge: 'danger',
        text: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800/60',
        dot: 'bg-rose-500',
        label: 'Failed',
      };
    case 'slate':
    default:
      return {
        badge: 'neutral',
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: s === 'rolled_back' ? 'Rolled Back' : s === 'discarded' ? 'Discarded' : String(status || 'Unknown'),
      };
  }
}

export function getWindowStatusTone(status) {
  const s = String(status || '').toLowerCase().trim();
  switch (s) {
    case 'open':
      return 'teal';
    case 'scheduled':
      return 'blue';
    case 'closed':
      return 'amber';
    case 'finalized':
      return 'slate';
    default:
      return 'slate';
  }
}

export function getWindowStatusClasses(status) {
  const tone = getWindowStatusTone(status);
  switch (tone) {
    case 'teal':
      return {
        badge: 'success',
        text: 'text-teal-700 dark:text-teal-300',
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-800/60',
        dot: 'bg-teal-500 animate-pulse',
        label: 'Open',
        pulse: true,
      };
    case 'blue':
      return {
        badge: 'info',
        text: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500',
        label: 'Scheduled',
        pulse: false,
      };
    case 'amber':
      return {
        badge: 'warning',
        text: 'text-amber-800 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        label: 'Closed',
        pulse: false,
      };
    case 'slate':
    default:
      return {
        badge: 'neutral',
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: s === 'finalized' ? 'Finalized' : String(status || 'Unknown'),
        pulse: false,
      };
  }
}

