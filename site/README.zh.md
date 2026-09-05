# 宣传落地页

[English](README.md)

英文页面为 `index.html`，中文页面为 `zh/index.html`。共用样式、浏览器脚本和主题数据放在 `assets/`。

在仓库根目录执行：

```sh
pnpm site:generate
pnpm site:preview
```

打开[中文页面](http://127.0.0.1:4173/zh/)或[英文页面](http://127.0.0.1:4173/)。预览服务仅监听本机；需要其他端口时设置 `SITE_PORT`。

服务同时提供 `/deepseek-harness-themes/` 路径，用于检查 GitHub Pages 项目子路径兼容性。部署时将 **`site/` 的内容**作为静态站点根目录，无需后端。不要直接用 `file://` 打开 HTML，因为浏览器可能阻止主题数据加载；请使用 HTTP 预览服务。

## 如何维护

- 文案：`scripts/site/content.en.ts` 和 `scripts/site/content.zh.ts`。
- HTML 结构：`scripts/site/page.ts`。
- 样式：`site/assets/style.css`。
- 交互：`site/assets/app.js` 和 `site/assets/theme-utils.js`。
- 主题来源：现有 `src/themes/generated/catalog.ts`。

修改文案或主题目录后执行 `pnpm site:generate`，重新生成两种语言的 HTML 和精简的 `assets/themes.json`。生成器不会写入 README 宣传图或插件运行时文件。生成的页面与源文件一起提交。

网页中的选色只用于演示，使用浏览器的 `harness-themes-site:preview` 保存，独立于 Harness 设置。存储不可用时仍可正常预览；剪贴板不可用时会选中安装命令供手动复制；主题数据加载失败可重试。未启用 JavaScript 时仍可阅读产品介绍和安装说明。

公开部署与本地生成分开。上述命令不会改变线上托管或部署配置。网站目录不在 npm 发布包的文件白名单中。
