import type en from './content.en.ts'

const repo = 'https://github.com/yonglun/deepseek-harness-themes'
export const installCommand = 'dsh plugin --profile web add deepseek-harness-design-md-themes'
const arrow = '<span aria-hidden="true">↗</span>'
const mark = '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function renderPage(c: typeof en, prefix: string): string {
  const zh = c.lang === 'zh-CN'
  const copyKeys = ['count', 'selected', 'previewAction', 'light', 'dark', 'copy', 'copied', 'copyFallback', 'themeError', 'showAll', 'showLess'] as const
  const strings = Object.fromEntries(copyKeys.map(key => [key, c[key]]))
  const doc = zh ? 'README.zh.md' : 'README.md'
  return `<!doctype html>
<html lang="${c.lang}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(c.title)}</title><meta name="description" content="${escape(c.description)}">
  <meta name="theme-color" content="#f7f6f2"><meta property="og:type" content="website">
  <meta property="og:title" content="${escape(c.title)}"><meta property="og:description" content="${escape(c.description)}">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate" hreflang="en" href="${prefix}"><link rel="alternate" hreflang="zh-CN" href="${prefix}zh/">
  <link rel="stylesheet" href="${prefix}assets/style.css">
  <script type="module" src="${prefix}assets/app.js"></script>
</head>
<body>
<a class="skip" href="#main">${c.skip}</a>
<header class="header wrap">
  <a class="brand" href="#" aria-label="DeepSeek Harness / theme">${mark}<span>DeepSeek Harness<span class="brand-suffix"> / theme</span></span></a>
  <nav aria-label="${zh ? '主导航' : 'Main navigation'}"><a href="#collection">${c.nav[0]}</a><a href="#native">${c.nav[1]}</a><a href="#install">${c.nav[2]}</a></nav>
  <div class="nav-end"><a class="language" href="${c.languageHref}" lang="${zh ? 'en' : 'zh-CN'}">${c.language}</a><a class="github-link" href="${repo}">GitHub ${arrow}</a></div>
</header>
<main id="main">
  <section class="hero wrap" aria-labelledby="hero-title">
    <div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span>${c.eyebrow}</p>
      <h1 id="hero-title">${c.headline}</h1><p class="hero-intro">${c.intro}</p>
      <div class="hero-actions"><a class="button primary" href="#collection">${c.explore}<span aria-hidden="true">↓</span></a><a class="text-link" href="${repo}">${c.github} ${arrow}</a></div>
      <p class="hero-note"><span aria-hidden="true">✳</span> ${c.heroNote}</p>
    </div>
    <div class="hero-demo" id="preview" tabindex="-1">
      <div class="demo-label"><span>${c.previewLabel}</span><span class="live-dot" aria-hidden="true"></span><span data-preview-name>Claude</span></div>
      <div class="workspace" data-workspace>
        <div class="window-bar"><span class="window-dots" aria-hidden="true">● ● ●</span><span>harness / ${c.previewWorkspace}</span><span aria-hidden="true">↗</span></div>
        <div class="workspace-body">
          <aside class="workspace-sidebar" aria-hidden="true"><div class="mini-brand">${mark} deepseek</div><div class="fake-new">＋ ${zh ? '新建会话' : 'New session'}</div><small>${zh ? '工作区' : 'WORKSPACES'}</small><div class="fake-active">▦ &nbsp; ${zh ? '我的创意空间' : 'Creative space'}</div><div class="fake-file">${zh ? '网站新想法' : 'Ideas for the website'}</div><div class="fake-file">${zh ? '一点新的灵感' : 'A little inspiration'}</div><div class="fake-file">${zh ? '值得创造的事' : 'Things worth building'}</div><div class="fake-settings">⚙ &nbsp; ${zh ? '设置' : 'Settings'}</div></aside>
          <div class="workspace-chat"><div class="chat-heading">${c.previewSession}<span aria-hidden="true">···</span></div><div class="chat-content"><p class="chat-user">${c.previewQuestion}</p><div class="assistant-heading"><span class="assistant-symbol" aria-hidden="true">✳</span><strong>Harness</strong></div><p class="chat-answer">${c.previewAnswer}</p><div class="preview-project"><span class="project-icon" aria-hidden="true">⌘</span><strong>${c.previewTask}</strong><span>${c.previewTaskNote}</span><div class="sample-code" aria-hidden="true"><span>const</span> workspace = {<br>&nbsp; theme: <b data-code-theme>'claude'</b>,<br>&nbsp; feeling: <b>'right at home'</b><br>};</div></div></div><div class="fake-composer"><span>${c.previewInput}</span><div><span aria-hidden="true">＋ &nbsp; ◇</span><span class="fake-send" aria-hidden="true">↑</span></div></div></div>
        </div>
      </div>
      <div class="preview-caption"><span>${c.previewDisclaimer}</span><span aria-hidden="true">↖ ${c.previewHint}</span></div>
    </div>
    <div class="featured-row"><span class="featured-label">${zh ? '从这些风格开始' : 'A FEW FAVORITES'}</span><div id="featured" class="featured" aria-label="${zh ? '精选主题' : 'Featured themes'}"></div></div>
  </section>
  <div class="facts wrap">${c.stats.map(([number, label]) => `<div><strong>${number}</strong><span>${label}</span></div>`).join('')}<p>DESIGN MD<br><span>× DEEPSEEK HARNESS</span></p></div>
  <section class="collection wrap section" id="collection" aria-labelledby="collection-title">
    <p class="eyebrow">${c.collectionEyebrow}</p><div class="section-heading"><div><h2 id="collection-title">${c.collectionTitle}</h2><p class="section-intro">${c.collectionIntro}</p></div><span class="collection-count" aria-hidden="true">01—74</span></div>
    <div class="collection-controls"><div class="scheme-filter" role="group" aria-label="${zh ? '色彩模式' : 'Color scheme'}">${c.filters.map((label, i) => `<button type="button" data-scheme="${['all', 'light', 'dark'][i]}" aria-pressed="${i === 0}">${label}</button>`).join('')}</div><div class="search-controls"><label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">${c.search}</span><input id="search" type="search" placeholder="${c.searchPlaceholder}" autocomplete="off"></label><label class="category-label"><span class="sr-only">${c.categoryLabel}</span><select id="category"><option value="all">${c.allCategories}</option></select></label></div></div>
    <div class="collection-meta"><span id="result-count" role="status" aria-live="polite">${c.themeLoading}</span><a href="#preview" class="preview-back">${c.backPreview}</a></div>
    <div id="load-error" class="empty-state" hidden><p>${c.themeError}</p><button id="retry" class="button" type="button">${c.retry}</button></div>
    <noscript><p class="empty-state">${c.noScript}</p></noscript>
    <div id="theme-grid" class="theme-grid"></div>
    <div id="empty" class="empty-state" hidden><h3>${c.emptyTitle}</h3><p>${c.emptyText}</p><button class="button" id="reset" type="button">${c.reset}</button></div>
    <div class="collection-more"><button type="button" class="button outline" id="show-all" hidden>${c.showAll}<span aria-hidden="true">↓</span></button></div>
  </section>
  <section class="native-section" id="native" aria-labelledby="native-title"><div class="native-layout wrap section"><div class="native-intro"><p class="eyebrow">${c.nativeEyebrow}</p><h2 id="native-title">${c.nativeTitle}</h2><p>${c.nativeIntro}</p><a href="https://yonglun.me/deepseek-harness-themes-plugin/" class="text-link">${c.blog} ${arrow}</a><div class="plugin-diagram" aria-label="Theme plugin integrates with Harness"><span>HARNESS</span><span aria-hidden="true">＋</span><span class="diagram-plugin">${mark} THEMES</span></div></div><div class="features">${c.features.map(([title, text], i) => `<article><span class="feature-number">0${i + 1}</span><div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div></div></section>
  <section class="install-layout wrap section" id="install" aria-labelledby="install-title"><div><p class="eyebrow">${c.installEyebrow}</p><h2 id="install-title">${c.installTitle}</h2><p class="section-intro">${c.installIntro}</p><a class="text-link" href="${repo}/blob/master/${doc}">${c.installDocs} ${arrow}</a></div><div class="install-steps"><div class="step"><span class="step-number">1</span><div><h3>${c.stepInstall}</h3><div class="command"><div class="command-top"><span>TERMINAL</span><button type="button" id="copy-command" aria-label="${c.copy} — ${c.commandLabel}">${c.copy} <span aria-hidden="true">⧉</span></button></div><code id="install-command" tabindex="0">${installCommand}</code></div><p id="copy-status" class="copy-status" role="status" aria-live="polite"></p></div></div><div class="step"><span class="step-number">2</span><div><h3>${c.stepLaunch}</h3><code class="launch-code">dsh web</code></div></div><div class="step"><span class="step-number">3</span><div><h3>${c.stepChoose}</h3><p>${c.chooseText}</p></div></div><p class="compatibility">${c.compatibility}</p></div></section>
  <section class="faq-layout wrap section" aria-labelledby="faq-title"><h2 id="faq-title">${c.faqTitle}</h2><div>${c.faqs.map(([question, answer]) => `<details><summary>${question}<span aria-hidden="true">＋</span></summary><p>${answer}</p></details>`).join('')}</div></section>
</main>
<footer class="footer"><div class="wrap"><div class="footer-top"><div><p class="footer-title">${c.footerTitle}</p><p>${c.footerNote}</p></div><a class="button primary" href="#install">${c.nav[2]} ${arrow}</a></div><div class="footer-bottom"><a class="brand" href="#">${mark}<span>DeepSeek Harness / theme</span></a><div><a href="${repo}">${c.source}</a><a href="https://www.npmjs.com/package/deepseek-harness-design-md-themes">npm ${arrow}</a><a href="${repo}/blob/master/LICENSE">${c.license}</a><a href="${repo}/blob/master/THIRD_PARTY_NOTICES${zh ? '.zh-CN' : ''}.md">${c.notices}</a></div></div><p class="attribution">${c.attribution} <a href="https://github.com/VoltAgent/awesome-design-md">awesome-design-md ${arrow}</a></p></div></footer>
<script id="page-strings" type="application/json">${JSON.stringify(strings).replace(/</g, '\\u003c')}</script>
</body></html>\n`
}
