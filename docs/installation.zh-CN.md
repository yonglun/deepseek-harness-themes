# 安装

[英文版](installation.md)

## Harness 插件管理器

在隔离 profile 或日常使用的 profile 中执行：

```bash
dsh plugin add deepseek-harness-design-md-themes
dsh plugin list
```

如果在本地开发并使用 tarball，可将打包产物安装到隔离 profile：

```bash
dsh plugin --profile web add --offline /path/to/deepseek-harness-design-md-themes-0.1.0.tgz
```

使用常规 Harness 启动器重启 Web 客户端，然后打开“设置 → 主题”。页面应显示 `design-md-themes` 区块，先列出三个内置主题，再列出来源主题卡片。

## 本地打包校验

```bash
pnpm install
pnpm build
pnpm pack:check
```

`pack:check` 会检查 npm tarball、`dsh` manifest 和 Cordis patch，并拒绝开发专用文件或相对源码导入；它不会修改 Harness profile。

## 可选的真实 profile 冒烟测试

仓库包含一个针对真实 `dsh` profile 的 opt-in 测试。请使用隔离状态目录并显式启用：

```bash
DSH_HOME=/tmp/dsh-design-md-smoke RUN_HARNESS_E2E=1 pnpm exec vitest run tests/harness-profile.e2e.spec.ts
```

默认测试会跳过该检查，因此普通 CI 和本地开发不会修改用户已有的 Harness 状态。
