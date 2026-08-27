# deepseek-harness-design-md-themes

这是一个遵循 DeepSeek Harness 官方插件机制的无侵入式客户端主题插件：把 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md) 的 74 个设计分析转换为官方 token 主题，并放入“设置 → 主题”卡片墙。

## 安装

```bash
dsh plugin add deepseek-harness-design-md-themes
```

重启 Web 客户端后打开“设置 → 主题”。页面包含内置 Light、Dark、System，以及 74 个来源主题；搜索和分类筛选均在本地完成，并支持键盘操作。选择结果只写入插件自有命名空间 `deepseek-harness-design-md-themes`。

插件使用文档化的 `dsh.client` 注入列表和 Cordis patch，通过宿主 Theme Service 注册主题，并贡献一个 `settings.section`。不会修改 Harness 源码、全局样式或其他设置。

## 兼容性与维护

当前生成基线为 DeepSeek Harness `0.1.1-rc.2`，本地生成/打包需要 Node.js `^22.19.0 || >=24.0.0`。完整安装步骤见 [docs/installation.md](docs/installation.md)，74 个主题、来源 commit 和哈希见 [docs/themes.md](docs/themes.md)。

生成文件已提交并保持确定性；来源清单位于 `src/themes/generated/source-manifest.json`，WCAG 调整报告位于 `reports/contrast.json`。更新来源时执行 [docs/maintenance.md](docs/maintenance.md) 中的命令。

## 持久化与卸载

选中的主题写入插件命名空间；内置主题始终保留。若其他 provider 改变当前主题，控制器会采用该选择而不覆盖对方设置；之后的本地选择通过串行写队列重试。远程/桌面宿主可能只在进程内保存设置，插件不会修改宿主存储来规避该限制。

来源分析来自 VoltAgent 的 awesome-design-md 集合，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
