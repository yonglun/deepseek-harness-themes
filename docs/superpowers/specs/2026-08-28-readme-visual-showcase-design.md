# README 视觉展示优化设计

日期：2026-08-28

状态：已获用户批准，待实现计划

## 1. 目标

优化 `README.md` 与 `README.zh.md` 的叙事和视觉吸引力，让访问者在首屏快速理解：

- 这是一个遵循 DeepSeek Harness 插件机制的无侵入式主题插件；
- 插件提供由 `awesome-design-md` 确定性生成的 74 个主题；
- 主题真实改变 Harness 外观，可安装、可持久化、可复现；
- 中英文 README 使用独立文件，但共享同一套语言中立视觉资产。

本次只优化项目文档、预览资产和资产生成/校验工具，不改变插件运行时行为、主题 token 或 Harness 集成接口。

## 2. 已确认的视觉方向

采用用户选择的 A「Editorial Hero」方向：

1. 首屏使用大数字和短标题建立识别度，核心信息为 `74 Themes`、`One Native Plugin`。
2. 主视觉使用错落叠放的主题界面卡片，形成编辑设计感，而不是普通功能截图堆叠。
3. README 由“视觉吸引 → 快速安装 → 功能说服 → 全量证明 → 技术可信”逐层展开。
4. 视觉资产使用项目真实主题 token，不使用与运行结果无关的概念配色。

图片保持语言中立，只使用主题名、稳定技术名和短数字标签；中英文说明由各自 README 正文承担。

## 3. README 信息层级

两个 README 保持相同结构和对应内容：

1. 语言切换链接；
2. Editorial Hero 主视觉；
3. 一句话价值主张和状态徽章；
4. Quick Start，两条以内的安装与启动命令；
5. 三项核心优势：原生集成、确定性生成、安全持久化；
6. 8 个精选主题预览；
7. 74 个主题全量图谱；
8. 插件架构和无侵入式边界；
9. 兼容性、维护、来源与许可证链接。

README 不逐张纵向展示 74 张大图。全量主题通过一张紧凑图谱兑现数量承诺，避免页面过长和移动端加载压力。

## 4. 视觉资产

### 4.1 主视觉

输出 `docs/assets/readme/hero.png`：

- 16:9 横向画布，目标宽度 1600px；
- 使用隔离 `dsh` profile 中的真实 Harness 设置/主题界面作为产品证明；
- 不包含工作区名称、会话标题、聊天内容或其他用户数据；
- 在产品截图周围组合 4 个真实主题卡片：Airbnb、Binance、Claude、Linear；
- 文案只保留 `74 Themes`、`One Native Plugin` 等语言中立短标签；
- 压缩后目标体积不超过 600KB。

### 4.2 八个精选主题

选取 8 个具有明显区分度、覆盖明暗模式和主要设计类别的主题：

- Claude：温暖编辑式浅色；
- Binance：金融科技深色与黄色品牌色；
- Linear：克制的深色开发工具风格；
- Airbnb：友好消费市场浅色；
- Spotify：高对比深色媒体风格；
- PostHog：奶油底色与手绘开发者气质；
- Ferrari：深色汽车品牌与红色强调；
- Nintendo 2001：高辨识度复古网页风格。

每个主题输出一个 `docs/assets/readme/spotlight/<slug>.svg`。预览结构与插件主题卡一致：sidebar、基础表面、文本层级和 CTA，全部颜色直接来自 `catalog[].preview`。

### 4.3 全量主题图谱

输出 `docs/assets/readme/theme-atlas.svg`：

- 固定包含 74 个主题，缺少或重复都使生成失败；
- 采用约 12 列的紧凑卡片网格，兼顾桌面可读性和移动端缩放；
- 每格展示主题名、基础背景、表面、文字和强调色；
- 保持主题目录顺序，便于与 `docs/themes*.md` 对照；
- 图片本身不包含长说明或中英文句子。

## 5. 资产生成

新增独立脚本读取 `src/themes/generated/catalog.ts`，从真实 `preview` 字段生成 spotlight SVG 和 atlas SVG。脚本必须：

- 校验 catalog 恰好为 74 项且 ID 唯一；
- 校验预览颜色为可渲染颜色值；
- 校验 8 个精选 slug 全部存在；
- 对 XML 文本进行转义；
- 使用固定尺寸、顺序和格式，保证相同输入产生字节级一致输出；
- 只写入 `docs/assets/readme/`，不修改生成主题源文件。

真实 Harness 主图不由主题生成脚本伪造。它通过隔离 profile 启动 Harness、打开无用户数据的设置页，再由浏览器生成固定视口截图。最终合成图进入版本库，更新时按维护文档重新捕获。

## 6. README 表达原则

- 先展示效果，再解释架构；
- 首屏不使用大段背景介绍；
- 安装命令在第一次滚动前出现；
- 用可验证事实替代营销形容词，例如“74 generated themes”“no Harness source patches”“pinned source commit”；
- 中英文文档内容对应，但不要求逐句直译；
- 不使用外链图片、动态图或依赖第三方 CDN 的徽章；
- 图片必须有简洁 alt 文本，链接必须在仓库和 npm tarball 中都有效。

## 7. 打包与维护

发布包必须包含：

- `README.md`、`README.zh.md`；
- `docs/assets/readme/hero.png`；
- 8 个 spotlight SVG；
- `docs/assets/readme/theme-atlas.svg`。

更新主题 catalog 时，维护流程需要重新生成并验证视觉资产。只有 catalog 或视觉模板发生变化时才更新 SVG；主视觉在 Harness UI、插件设置页或视觉编排变化时重新捕获。

## 8. 验证标准

实现完成需满足：

1. 中英文 README 均能在 GitHub Markdown 中正确渲染；
2. README 的所有相对文件链接存在；
3. atlas 恰好包含 74 个不同主题；
4. 8 个 spotlight 的颜色与 catalog 对应值一致；
5. 资产生成连续运行两次输出完全一致；
6. npm tarball 包含所有 README 视觉资产，不包含内部 brainstorming 文件；
7. 全部现有测试、TypeScript 检查、构建和 package smoke 通过；
8. 主视觉不包含用户内容或工作区信息；
9. README 在窄屏下不会因 HTML 固定宽度表格产生横向滚动。

## 9. 非目标

- 不重新设计 Harness 或插件设置页；
- 不修改 74 个主题的颜色、字体或 token；
- 不引入远程图片托管、统计脚本或 README 动画；
- 不为中英文分别维护重复图片；
- 不把 74 个主题展开为 74 张大图放进 README 正文。
