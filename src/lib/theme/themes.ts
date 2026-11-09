export type ThemeId = 'velvet' | 'sakura' | 'wisteria' | 'noir-rose' | 'moonlit';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  /** Preview swatches [bg, accent, accent2] */
  swatches: [string, string, string];
}

export const THEMES: ThemeDef[] = [
  {
    id: 'velvet',
    name: 'Dark Velvet',
    description: 'The classic YuriOrbit look — deep ink with rose and lavender.',
    swatches: ['#12101a', '#e84d8a', '#9362f0'],
  },
  {
    id: 'sakura',
    name: 'Sakura Blush',
    description: 'Warm plum nights and soft cherry-blossom pinks.',
    swatches: ['#1a1014', '#f06a8a', '#f2a6b8'],
  },
  {
    id: 'wisteria',
    name: 'Wisteria Dusk',
    description: 'Lavender-forward twilight with gentle lilac highlights.',
    swatches: ['#141020', '#b07cf0', '#7c8cf0'],
  },
  {
    id: 'noir-rose',
    name: 'Noir Rose',
    description: 'Near-black canvas with vivid rose accents — high contrast.',
    swatches: ['#0b090d', '#ff4d8d', '#ff7ab3'],
  },
  {
    id: 'moonlit',
    name: 'Moonlit Lily',
    description: 'Cool blue-silver night with soft rose glow.',
    swatches: ['#0e121a', '#e88ab0', '#8aaee8'],
  },
];

export const THEME_STORAGE_KEY = 'yuriorbit_theme';

export function getStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {}
  return 'velvet';
}

export function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  if (id === 'velvet') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', id);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {}
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
