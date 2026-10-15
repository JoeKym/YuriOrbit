export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatScore(score?: number): string {
  if (!score) return '—';
  return (score / 10).toFixed(1);
}

export function formatYear(year?: number): string {
  if (!year) return '—';
  return String(year);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export function getFallbackCover(title: string): string {
  const encoded = encodeURIComponent(title.slice(0, 40));
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e1a2c"/>
          <stop offset="100%" style="stop-color:#2d2840"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" font-family="serif" font-size="20" fill="#9089a8" text-anchor="middle" dominant-baseline="middle">${encoded}</text>
    </svg>`
  )}`;
}

export function getFallbackBanner(title: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#12101a"/>
          <stop offset="50%" style="stop-color:#1e1a2c"/>
          <stop offset="100%" style="stop-color:#12101a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" font-family="serif" font-size="36" fill="#4a4360" text-anchor="middle" dominant-baseline="middle">${encodeURIComponent(title.slice(0, 40))}</text>
    </svg>`
  )}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    RELEASING: 'Releasing',
    FINISHED: 'Completed',
    NOT_YET_RELEASED: 'Not Yet Released',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
    UNKNOWN: 'Unknown',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    RELEASING: 'text-success-400',
    FINISHED: 'text-ink-300',
    NOT_YET_RELEASED: 'text-lavender-400',
    CANCELLED: 'text-error-400',
    HIATUS: 'text-warning-400',
    UNKNOWN: 'text-ink-400',
  };
  return colors[status] || 'text-ink-400';
}
