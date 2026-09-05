export const featuredSlugs = ['claude', 'binance', 'linear.app', 'airbnb', 'spotify', 'posthog', 'ferrari', 'nintendo-2001'];

export function filterThemes(themes, { query = '', scheme = 'all', category = 'all' } = {}) {
  const search = query.trim().toLocaleLowerCase();
  return themes.filter(theme => (scheme === 'all' || theme.colorScheme === scheme)
    && (category === 'all' || theme.category === category)
    && `${theme.name} ${theme.slug}`.toLocaleLowerCase().includes(search));
}

export function validateThemes(themes) {
  if (!Array.isArray(themes) || themes.length !== 74) throw new Error('Expected 74 themes');
  const ids = new Set();
  for (const theme of themes) {
    if (!theme || !['id', 'slug', 'name', 'category'].every(key => typeof theme[key] === 'string' && theme[key].length)
      || !['light', 'dark'].includes(theme.colorScheme)
      || !['base', 'layer', 'sidebar', 'text', 'accent'].every(key => /^#[a-f0-9]{6}$/i.test(theme.preview?.[key] ?? ''))
      || ids.has(theme.id)) throw new Error('Invalid theme data');
    ids.add(theme.id);
  }
  if (!featuredSlugs.every(slug => themes.some(theme => theme.slug === slug))) throw new Error('Missing featured theme');
  return themes;
}

export function applyPalette(element, palette) {
  for (const key of ['base', 'layer', 'sidebar', 'text']) element.style.setProperty(`--${key}`, palette[key]);
  element.style.setProperty('--theme-accent', palette.accent);
}
