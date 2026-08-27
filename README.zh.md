# deepseek-harness-design-md-themes

英文版：[README.md](README.md)

![DeepSeek Harness 的 74 个确定性 Design MD 主题](docs/assets/readme/hero.png)

> 基于 `awesome-design-md` 确定性生成 74 个主题，通过 DeepSeek Harness 原生插件机制安装，无需修改 Harness 源码。

## 快速开始

```bash
dsh plugin --profile web add deepseek-harness-design-md-themes
dsh web
```

打开“设置 → Design MD themes”，选择主题卡片；刷新页面后仍会保持所选主题。

## 为什么选择这个插件

- **原生集成**——通过 Theme Service 注册主题，并贡献一个 `settings.section`。
- **确定性目录**——74 个主题来自固定上游提交 `8147538b4226ae41e2487a9179e3bcc1f68e8554`。
- **独立持久化**——只写入 `deepseek-harness-design-md-themes` 自有设置命名空间。

## 八个代表性主题

<p align="center">
  <img src="docs/assets/readme/spotlight/claude.svg" width="48%" alt="Claude 主题预览">
  <img src="docs/assets/readme/spotlight/binance.svg" width="48%" alt="Binance 主题预览">
  <img src="docs/assets/readme/spotlight/linear.app.svg" width="48%" alt="Linear 主题预览">
  <img src="docs/assets/readme/spotlight/airbnb.svg" width="48%" alt="Airbnb 主题预览">
  <img src="docs/assets/readme/spotlight/spotify.svg" width="48%" alt="Spotify 主题预览">
  <img src="docs/assets/readme/spotlight/posthog.svg" width="48%" alt="PostHog 主题预览">
  <img src="docs/assets/readme/spotlight/ferrari.svg" width="48%" alt="Ferrari 主题预览">
  <img src="docs/assets/readme/spotlight/nintendo-2001.svg" width="48%" alt="Nintendo 2001 主题预览">
</p>

## 全部 74 个主题

![74 个 Design MD 主题完整图谱](docs/assets/readme/theme-atlas.svg)

主题 ID、分类、来源路径和对比度调整见[中文主题目录](docs/themes.zh-CN.md)。

## 无侵入式设计

插件只使用公开的 `dsh.client` 注入列表、Cordis patch、Theme Service、Settings Scope、Locale Service 和 UI Slots。它不会修改 Harness 组件、访问内部 DOM、覆盖无关全局 CSS 或替换 Harness 文件。

## 兼容性与维护

- DeepSeek Harness `0.1.1-rc.2`
- 本地生成和打包需要 Node.js `^22.19.0 || >=24.0.0`
- React `18.2+` 或 `19.x`，由 Harness 提供

安装：[docs/installation.zh-CN.md](docs/installation.zh-CN.md) · 维护：[docs/maintenance.zh-CN.md](docs/maintenance.zh-CN.md) · 第三方声明：[THIRD_PARTY_NOTICES.zh-CN.md](THIRD_PARTY_NOTICES.zh-CN.md)
