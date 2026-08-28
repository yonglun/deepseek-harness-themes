# Everything is a Plugin 博客文章设计

## 1. 目标

以 `deepseek-harness-design-md-themes` 为真实案例，面向广泛的 AI 产品与技术读者，解释 DeepSeek Harness 的「Everything is a Plugin」理念，以及一个第三方插件从能力设计、系统接入到发布分发的完整路径。

文章不以 API 手册或逐行编程教程为目标。它需要让不熟悉 Cordis、TypeScript 或 React 的读者理解以下问题：

- 「Everything is a Plugin」与传统的「核心程序加扩展」有什么差别。
- Harness 为什么能够在不修改源码的前提下增加一整套主题能力。
- Plugin、Context、Service、`inject`、Effect、Bundle 和 Profile 分别解决什么问题。
- 一个真实插件怎样同时连接 Host 和 Client，并最终成为普通用户可安装的 npm 包。
- 这种架构对 AI 产品设计、生态建设和第三方开发者有什么价值。

## 2. 读者

主要读者是关注 AI Agent、AI 产品和开发者工具的人，包括：

- 希望理解 Agent Harness 架构的产品经理与技术管理者。
- 熟悉基本开发概念，但不一定使用 TypeScript 或 React 的工程师。
- 想评估 DeepSeek Harness 扩展能力的插件作者和开源贡献者。
- 对「可组合 Agent 系统」感兴趣的普通技术读者。

文章默认读者知道插件是什么，但不要求了解依赖注入、生命周期管理或前后端双端插件。

## 3. 核心叙事

文章采用案例驱动的架构故事。

开篇提出一个具体约束：为 DeepSeek Harness 增加 74 个主题，但不能修改 Harness 源码、替换 Harness 文件或依赖 DOM 注入等内部实现。

这个约束把抽象的插件理念转化为一个可验证的问题。文章随后从最终效果向下拆解，说明主题插件不是贴在系统外面的 CSS 补丁，而是作为一个普通节点参与 Harness 的能力组合：

1. Host 侧向 Settings Service 注册插件自己的配置命名空间。
2. Client 侧向 Theme Service 注册 74 个主题。
3. Client 侧通过 UI Slots 向设置页贡献主题画廊。
4. Client 侧通过 Locale Service 注册中文和英文文案。
5. Bundle patch 将插件插入 Cordis 配置树。
6. Profile 决定某次 Harness 运行是否加载这个 Bundle。
7. npm 包负责把预构建代码和配置层交付给普通用户。

由此引出全文的核心判断：开发者不是把代码塞进一个等待修改的核心，而是向一张由服务依赖连接起来的能力图增加新节点。

## 4. 文章结构

### 4.1 开场

从「不改一行 Harness 源码，能不能增加 74 个主题」开始。

展示主题画廊和 74 主题主视觉，让读者先看到结果，再提出机制问题。避免从插件化定义或行业趋势开始。

### 4.2 Everything is a Plugin

结合官方架构文档解释：

- Cordis 是 Harness 底层的插件框架。
- 模型适配器、工具注册、会话日志和 Agent Loop 本身也都是插件。
- 插件通过共享 Context 使用和提供 Service。
- `inject` 声明依赖关系，加载顺序由能力是否就绪决定，而不是由代码中的手工启动顺序决定。
- 注册是可逆 Effect，插件卸载时，其贡献可以被清理。

用「能力网络」作为主要类比。避免把它描述成无限制的微内核，也不把项目当前实现提升为长期不变的兼容承诺。

### 4.3 用主题插件看能力如何协作

围绕四个公开服务展开：Theme Service、Settings Service、UI Slots 和 Locale Service。

每个服务只回答三个问题：插件需要什么能力、它贡献了什么、移除插件后会发生什么。主题生成算法、React 状态管理和 CSS token 的完整列表不进入正文。

### 4.4 Host 与 Client

用「后台登记与持久化，前台呈现与交互」解释两个运行环境。

Host 片段展示设置 schema 的注册；Client 片段展示服务注入、主题注册和设置页插槽。强调两端由同一个 npm 包交付，但依赖和运行时边界不同。

### 4.5 Bundle、Profile 与配置层

解释三层关系：

- Plugin 是能力实现。
- Bundle 是插件代码及其 Cordis 配置层的分发形式。
- Profile 是一次运行所采用的 Bundle 组合。

展示精简后的 `package.json` 中 `dsh.bundle` 与 `dsh.client`，以及 `cordis.patch.yml` 的插入行。说明用户仍可通过更高层的 profile patch 覆盖组合，而不需要修改插件或 Harness。

### 4.6 从最小插件到可分发产品

给出一条可复制但不过度展开的开发路径：

1. 从导出 `apply(ctx)` 的最小 TypeScript 模块开始。
2. 找到需要消费或提供的 Harness Service。
3. 用 `inject` 声明依赖，并通过公开注册接口贡献能力。
4. 为显式资源提供 disposer，让卸载和热重载可预测。
5. 使用 `cordis.patch.yml` 和 `dsh.bundle` 把插件加入组合树。
6. 为 Web 客户端声明 `dsh.client`、导出 `./client` 并生成浏览器 bundle。
7. 在隔离 Profile 中安装、启动和验证。
8. 将预构建产物发布到 npm，让用户通过 `dsh plugin --profile web add <package>` 安装。

正文展示不超过四段代码，每段只服务一个概念。完整实现通过项目链接提供。

### 4.7 产品层面的价值

从工程实现回到产品设计：

- 用户获得可选择、可替换的系统组合。
- 插件作者能在明确边界内创新，不必长期维护 Harness Fork。
- 系统能力由服务契约连接，降低对具体实现的耦合。
- 可逆生命周期让加载、卸载和热更新更可控。

同时承认代价：插件作者必须理解服务边界、运行环境和打包契约；「一切皆插件」不会自动消除兼容性、版本约束或测试成本。

### 4.8 收尾

回到开篇的 74 个主题。真正值得关注的并不是主题数量，而是它们能够以一个独立 npm 包进入系统、参与系统能力、又能被完整移除。

用开放式判断结束：对 Agent 产品而言，未来的差异可能不只来自内置功能多少，也来自它允许谁、以多低的成本重新组合这些能力。

## 5. 技术事实边界

文章中的官方架构判断仅以 DeepSeek Harness 官方仓库为依据，主要使用：

- `docs/architecture.md`
- `docs/cordis-primer.md`
- `docs/user/develop/basic/index.md`
- `docs/user/develop/basic/publish.md`
- `packages/client/ui-theme/README.md`

案例事实以本仓库当前发布版本为依据：

- npm 包名为 `deepseek-harness-design-md-themes`。
- 当前版本为 `0.1.1`，采用 MIT License。
- 74 个主题来自固定的 `awesome-design-md` 上游提交。
- 插件使用公开的 `dsh.client`、`dsh.bundle`、Theme Service、Settings Service、UI Slots 和 Locale Service。
- 插件不修改 Harness 源码，不替换 Harness 文件，不依赖内部 DOM 注入。

文章必须明确哪些是 Harness 官方机制，哪些是本插件的实现选择。例如，使用独立设置命名空间保存第三方主题选择是本插件的方案，不应描述为所有 Harness 插件的强制模式。

## 6. 代码与图片

### 代码片段

计划保留四段精简代码：

1. 最小的 `apply(ctx)` 插件。
2. Host 侧 Settings Service 注册。
3. Client 侧 `inject` 与能力注册。
4. `package.json` 与 `cordis.patch.yml` 的分发声明。

代码可以为便于阅读而省略类型和防御性逻辑，但必须标注为精简示意，不能伪装成可直接复制的完整文件。

### 图片

计划使用：

- `docs/assets/readme/hero.png`
- 一张主题画廊截图或 README 现有代表性主题图
- 一张新制作的关系图，建议结构为：

  `Profile → Bundle patch → Host Plugin / Client Plugin → Settings / Theme / Slots / Locale`

关系图只表现文章所需的关系，不声称覆盖 Harness 的完整运行时拓扑。

## 7. 语言与篇幅

- 中文正文约 4000 至 5000 字。
- 面向广泛技术读者，概念先于 API，案例先于定义。
- 使用第一人称介绍项目决策，但不编造个人经历、情绪或对话。
- 保持短段落和自然转场，避免教科书式定义堆砌。
- 不采用故障复盘叙事，不展开已解决的加载与主题切换问题。
- 不使用营销式夸张，不把 74 个主题描述为 Harness 官方功能。

## 8. 完成标准

正式文章完成时应满足：

- 广泛 AI 技术读者能够复述「Everything is a Plugin」与普通插件系统的关键差别。
- 读者能够说清 Plugin、Service、`inject`、Effect、Bundle 和 Profile 的基本关系。
- 项目案例贯穿全文，不退化成官方文档的中文改写。
- 至少给出一条从最小插件到 npm 分发的可执行路径。
- 所有官方架构结论都有一手资料链接。
- 所有项目事实与当前仓库、GitHub 和 npm 发布信息一致。
- 不包含本次开发的故障排查过程。
