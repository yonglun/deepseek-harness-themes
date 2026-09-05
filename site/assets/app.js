import { featuredSlugs, filterThemes, validateThemes, applyPalette } from './theme-utils.js';

const $ = selector => document.querySelector(selector);
const strings = JSON.parse($('#page-strings').textContent);
const storageKey = 'harness-themes-site:preview';
const chinese = document.documentElement.lang.startsWith('zh');
const state = { themes: [], selection: null, query: '', scheme: 'all', category: 'all', expanded: false };
const categories = {
  'ai-llm': ['AI & LLM', 'AI 与大模型'], 'automotive': ['Automotive', '汽车'],
  'backend-devops': ['Backend & DevOps', '后端与运维'], 'design-creative': ['Design & creative', '设计与创意'],
  'ecommerce-retail': ['Commerce & retail', '电商与零售'], 'fintech-crypto': ['Finance & crypto', '金融与加密'],
  'productivity-saas': ['Productivity', '效率工具'], 'hardware-tech': ['Hardware & tech', '硬件与科技'],
  'media-entertainment': ['Media & entertainment', '媒体与娱乐'], 'social-communication': ['Social & communication', '社交与沟通'],
  'media-consumer': ['Media & consumer', '媒体与消费'], 'developer-tools': ['Developer tools', '开发工具'], 'retro-web': ['Retro web', '复古网页'],
};
const categoryName = category => categories[category]?.[chinese ? 1 : 0] ?? category.replaceAll('-', ' ');
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function swatch(color) {
  const element = make('i', 'swatch');
  element.style.setProperty('--swatch', color);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function updateSelection(theme) {
  state.selection = theme.id;
  applyPalette($('[data-workspace]'), theme.preview);
  $('[data-workspace]').style.colorScheme = theme.colorScheme;
  $('[data-preview-name]').textContent = theme.name;
  $('[data-code-theme]').textContent = `'${theme.slug}'`;
  document.querySelectorAll('[data-theme-id]').forEach(button => {
    const active = button.dataset.themeId === theme.id;
    button.setAttribute('aria-pressed', String(active));
  });
  try { localStorage.setItem(storageKey, theme.id); } catch { /* Preview works without storage. */ }
}

function bindTheme(button, theme) {
  button.type = 'button';
  button.dataset.themeId = theme.id;
  button.setAttribute('aria-pressed', String(theme.id === state.selection));
  button.setAttribute('aria-label', `${strings.previewAction} ${theme.name}`);
  button.addEventListener('click', () => {
    updateSelection(theme);
    $('#result-count').textContent = `${strings.selected}: ${theme.name} · ${strings.count.replace('{count}', filterThemes(state.themes, state).length)}`;
  });
}

function renderFeatured() {
  $('#featured').replaceChildren(...featuredSlugs.map(slug => {
    const theme = state.themes.find(item => item.slug === slug);
    const button = make('button', '', theme.name);
    button.prepend(swatch(theme.preview.accent));
    bindTheme(button, theme);
    return button;
  }));
}

function miniWorkspace() {
  const mini = make('div', 'mini-workspace');
  mini.setAttribute('aria-hidden', 'true');
  // Constant decorative markup; catalog strings are inserted using textContent elsewhere.
  mini.innerHTML = '<div class="mini-toolbar"><i></i><i></i><i></i></div><div class="mini-body"><div class="mini-sidebar"><i></i><i></i><i></i><i></i></div><div class="mini-main"><div class="mini-title"></div><div class="mini-line"></div><div class="mini-line short"></div><div class="mini-panel"><div class="mini-line"></div><div class="mini-line short"></div><div class="mini-accent"></div></div></div></div>';
  return mini;
}

function themeCard(theme) {
  const card = make('button', 'theme-card');
  bindTheme(card, theme);
  applyPalette(card, theme.preview);
  const info = make('div', 'card-info');
  info.append(make('strong', '', theme.name), make('span', 'card-mode', `${theme.colorScheme === 'light' ? '◐' : '◑'} ${strings[theme.colorScheme]}`));
  const footer = make('div', 'card-footer');
  const palette = make('span', 'card-palette');
  palette.append(...Object.values(theme.preview).map(swatch));
  footer.append(make('span', 'card-category', categoryName(theme.category)), palette);
  card.append(miniWorkspace(), info, footer);
  return card;
}

function renderGrid() {
  const filtered = filterThemes(state.themes, state);
  const limited = !state.expanded && !state.query.trim() && state.scheme === 'all' && state.category === 'all';
  // Put the eight signature palettes first, then keep the remaining catalog order.
  const ordered = [...filtered].sort((a, b) => {
    const rank = theme => featuredSlugs.includes(theme.slug) ? featuredSlugs.indexOf(theme.slug) : 99;
    return rank(a) - rank(b);
  });
  $('#theme-grid').replaceChildren(...(limited ? ordered.slice(0, 12) : ordered).map(themeCard));
  $('#result-count').textContent = strings.count.replace('{count}', filtered.length);
  $('#empty').hidden = filtered.length !== 0;
  $('#show-all').hidden = filtered.length <= 12 || !!state.query.trim() || state.scheme !== 'all' || state.category !== 'all';
  $('#show-all').textContent = state.expanded ? strings.showLess : strings.showAll;
  $('#show-all').setAttribute('aria-expanded', String(state.expanded));
}

async function loadThemes() {
  $('#load-error').hidden = true;
  $('#retry').disabled = true;
  try {
    const response = await fetch(new URL('./themes.json', import.meta.url));
    if (!response.ok) throw new Error(`Theme data: ${response.status}`);
    state.themes = validateThemes(await response.json());
    let stored;
    try { stored = localStorage.getItem(storageKey); } catch { /* Optional persistence. */ }
    const initial = state.themes.find(theme => theme.id === stored) ?? state.themes.find(theme => theme.slug === 'claude');
    updateSelection(initial);
    renderFeatured();
    const select = $('#category');
    while (select.options.length > 1) select.remove(1);
    [...new Set(state.themes.map(theme => theme.category))].sort().forEach(category => {
      const option = make('option', '', categoryName(category));
      option.value = category;
      select.append(option);
    });
    select.value = state.category;
    renderGrid();
  } catch {
    $('#load-error').hidden = false;
    $('#result-count').textContent = strings.themeError;
  } finally { $('#retry').disabled = false; }
}

document.querySelectorAll('[data-scheme]').forEach(button => button.addEventListener('click', () => {
  state.scheme = button.dataset.scheme;
  document.querySelectorAll('[data-scheme]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderGrid();
}));
$('#search').addEventListener('input', event => { state.query = event.target.value; renderGrid(); });
$('#category').addEventListener('change', event => { state.category = event.target.value; renderGrid(); });
$('#show-all').addEventListener('click', () => { state.expanded = !state.expanded; renderGrid(); });
$('#reset').addEventListener('click', () => {
  Object.assign(state, { query: '', scheme: 'all', category: 'all', expanded: false });
  $('#search').value = '';
  $('#category').value = 'all';
  document.querySelectorAll('[data-scheme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scheme === 'all')));
  renderGrid();
  $('#search').focus();
});
$('#retry').addEventListener('click', loadThemes);
$('#copy-command').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#install-command').textContent.trim());
    $('#copy-status').textContent = strings.copied;
  } catch {
    $('#copy-status').textContent = strings.copyFallback;
    const command = $('#install-command');
    command.focus();
    const range = document.createRange();
    range.selectNodeContents(command);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
});
loadThemes();
