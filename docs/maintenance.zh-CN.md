# 维护

[英文版](maintenance.md)

源仓库和 commit 会被刻意固定，生成文件必须能够从完全相同的 checkout 可重复生成。

```bash
git clone https://github.com/VoltAgent/awesome-design-md.git /tmp/awesome-design-md
git -C /tmp/awesome-design-md checkout 8147538b4226ae41e2487a9179e3bcc1f68e8554
rm -rf tmp/vendor/awesome-design-md
mkdir -p tmp/vendor
cp -R /tmp/awesome-design-md tmp/vendor/awesome-design-md
pnpm themes:generate --source tmp/vendor/awesome-design-md --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output .
pnpm themes:verify --source tmp/vendor/awesome-design-md --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output .
pnpm test
pnpm build
pnpm pack:check
```

请同时检查 `src/themes/generated/source-manifest.json`、`reports/contrast.json` 和 `docs/themes.zh-CN.md`。来源哈希或分类变化都属于需要评审的数据变更。主题覆盖配置位于 `theme-overrides/`，必须写明原因；它们是直接来源映射之外唯一允许提交的例外。

## README 视觉资产

使用以下命令重新生成确定性的精选主题和图谱 SVG：

```bash
pnpm readme:assets
```

请使用隔离的 `DSH_HOME`，以 1440×900 视口截取 Harness 设置页面；该 profile 不能包含工作区、会话或聊天数据。将最终 `docs/assets/readme/hero.png` 合成为 1600×900，人工检查其中没有私密内容，再运行 `pnpm pack:check` 验证所有公开资产均已进入发布包。
