# deepseek-harness-design-md-themes 设计规格

日期：2026-08-27  
状态：已获用户批准，待实现计划  
目标包名：`deepseek-harness-design-md-themes`

## 1. 背景与目标

本项目创建一个独立、无侵入式的 DeepSeek Harness 主题插件。插件依据
VoltAgent `awesome-design-md` 中当前固定版本的 74 份 `DESIGN.md`，生成 74
个可选择的 Harness 主题，并在 Harness 设置中提供独立的视觉卡片画廊。

首版目标：

- 覆盖固定上游版本中的全部 74 个设计目录，每个目录生成一个最具代表性的
  light 或 dark 主题。
- 只通过 DeepSeek Harness 的公开插件、Theme、Slot 和 Settings 机制集成。
- 主题只覆盖官方 `--dsw-*` 主题 token，不改变 Harness 组件结构、布局或内部
  实现。
- 生成过程可复现，生成结果进入版本库，主题质量允许通过小型人工 override
  校准。
- 关键文字和控件满足 WCAG AA。
- 选择结果持久化，插件卸载后 Harness 恢复原生行为。

## 2. 上游基线

设计源：

- 仓库：<https://github.com/VoltAgent/awesome-design-md>
- 固定提交：`8147538b4226ae41e2487a9179e3bcc1f68e8554`
- 读取范围：`design-md/*/DESIGN.md`
- 该提交实际包含 74 个设计目录；生成器以目录清单为权威输入，不依赖 README
  中可能滞后的计数。
- 许可证：MIT。项目保留许可证文本、来源链接和提交号。

初始 Harness 兼容基线：

- 仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 固定提交：`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
- 对应版本：`dsh@0.1.1-rc.2`
- 初始版本只声明并验证该 API 基线。Harness 仍处于 developer preview；只有兼容
  测试通过后才扩大支持范围。

## 3. 强制架构约束：无侵入式

本项目是独立仓库和独立 npm 包，不修改、复制覆盖或给 DeepSeek Harness 源码
打补丁。安装入口是正常的 Harness bundle：

```sh
dsh plugin --profile <name> add deepseek-harness-design-md-themes
```

只使用以下公开扩展点：

- `ctx.theme.register()` 注册第三方主题。
- `ctx.theme.setTheme()` 切换主题。
- `ctx.slots.register({ name: 'settings.section', ... })` 增加独立设置页面。
- Host `settings.register()` 注册插件自有设置 schema。
- Client `settingsScope.bind()` 读取和写入该设置命名空间。
- Cordis disposer 和 `ctx.effect()` 管理生命周期。

`cordis.patch.yml` 是安装包向 Profile 贡献的普通配置层，不会修改 Harness 仓库
文件。

明确禁止：

- 修改、替换或 monkey-patch Harness React 组件。
- 覆盖 Harness 全局 CSS 选择器。
- 直接查找或修改 Harness 内部 DOM。
- 导入未公开的 Harness 内部源码路径。
- 要求用户 fork、重新构建或手动修改 Harness。
- 在运行时下载、替换或注入 Harness 资源。
- 在公开 API 不兼容时退化为上述侵入式方案。

如果所需能力不存在或版本不兼容，插件必须拒绝激活并输出可操作诊断，不能留下
部分主题或空设置页面。

## 4. 总体架构

项目发布为一个 npm-ready Harness bundle，内部按职责分层：

```text
awesome-design-md（固定 commit）
          ↓ 开发期导入
DESIGN.md 导入器
          ↓
规范化主题模型
          ↓
自动映射 → 人工 overrides → WCAG 校正
          ↓
74 个 ThemeDefinition + 画廊元数据 + 审计报告
          ↓ 运行时
主题注册器 + settings.section 画廊 + 插件设置持久化
```

建议目录边界：

```text
deepseek-harness-design-md-themes/
├── src/
│   ├── index.ts                 # Host 入口
│   ├── client.ts                # Client 入口
│   ├── host/                    # 设置 schema 与 Host 注册
│   ├── runtime/                 # 注册、选择、恢复与事务清理
│   ├── gallery/                 # settings.section 页面、store、locale、CSS Module
│   ├── compiler/                # 解析后的规范化与映射规则
│   └── generated/
│       ├── themes/              # 74 个生成 ThemeDefinition
│       ├── catalog.ts           # 运行时目录与画廊元数据
│       ├── categories.ts
│       └── source-manifest.json
├── scripts/                     # 上游同步、生成、审计、预览
├── theme-overrides/             # 每套主题的小型人工差异
├── reports/                     # 生成的 WCAG 与来源报告
├── docs/                        # 安装、同步、主题画廊和维护文档
├── cordis.patch.yml
└── package.json
```

`compiler` 与 `scripts` 是开发期能力；运行包只包含编译后的 Host/Client 入口、
生成主题、画廊资源、许可证和 bundle patch。

## 5. 主题生成管线

### 5.1 输入与规范化

生成器从显式指定的本地上游 checkout 读取固定提交中的 74 份
`design-md/*/DESIGN.md`，不在脚本内部隐式拉取网络资源。它提取：

- slug、显示名称、描述和上游分类；
- `colors` 中的颜色值与语义键；
- `typography` 中的字体类别、字重和角色；
- 可映射的阴影或 elevation 信息；
- 用于诊断的来源路径和原始角色名称。

不同文档中的颜色命名被归一化为中间模型：

- 基础背景、一级/二级/三级表面与 overlay；
- 一级/二级边框；
- 主、次、弱化文字；
- 品牌主色、品牌文字和交互状态；
- success、warning、error；
- sidebar、bubble、input、menu；
- markdown code block、inline code 和选中态。

规范化模型与 Harness token 分离，使上游文档格式和 Harness API 可分别演进。

### 5.2 单一明暗模式

每个来源只生成一个主题。默认依据主画布颜色的相对亮度确定
`colorScheme: 'light' | 'dark'`，描述文本仅作辅助信号。人工 override 可以显式
固定模式。不会为缺失的另一模式臆造配色。

主题 ID 使用 `design-md-<slug>`，例如 `design-md-claude`。`light`、`dark`、
`system` 是保留 ID；任何重复或冲突都会中止生成。

### 5.3 Token 映射边界

输出只包含初始兼容基线中公开、实际消费的 `--dsw-*` 主题 token，覆盖颜色、
字体角色、阴影和已有渐变能力。字体只映射到系统字体栈：

- sans：系统 UI sans-serif 栈；
- serif：系统 serif 栈；
- monospace：系统等宽字体栈。

不打包专有字体，不从 CDN 加载字体。圆角、间距、布局、响应式结构、组件形态和
动效若没有对应公开 token，则不写入主题。此类来源信息可以留在报告中，但不能
通过全局 CSS 模拟。

### 5.4 人工校准层

`theme-overrides/<slug>.yaml` 只保存自动结果的差异，可包含：

- 强制 `colorScheme`；
- 来源角色到中间角色的纠正；
- 单个公开 Harness token 的最终覆盖；
- 需要保留或允许调整的品牌色声明；
- 校准原因说明。

生成文件不可手工编辑，并带有生成标记和来源提交。override 是唯一允许人工改变
生成语义的入口。

### 5.5 WCAG AA 校正

生成器审计正常字号文字 4.5:1、大字号文字和关键非文字控件 3:1。至少覆盖：

- `bg-base`；
- `bg-layer-1`；
- `bg-layer-2`；
- bubble；
- markdown code block；
- sidebar fill。

校正遵循最小变化原则：优先调整前景文字的亮度，在不破坏可读性的前提下保留
品牌主色。若自动调整超过允许边界或无法满足所有组合，生成失败并要求增加人工
override。报告记录原始值、最终值、对比度和调整原因。

### 5.6 确定性与上游变化

生成后立即以相同输入再次运行并比较输出。相同输入必须产生字节级一致结果。

`source-manifest.json` 记录上游仓库、提交、74 个 slug、源文件摘要和生成器版本。
新增、删除、重命名或摘要变化必须出现在显式更新报告中；脚本不能静默接受目录
变化。

## 6. 运行时插件

### 6.1 Host 入口

Host 入口注册插件自有命名空间 `deepseek-harness-design-md-themes`。首版设置模型
包含一个字符串选择字段，默认值为 `system`。它不扩大或修改 Harness 自带的
`ui-theme.preference` schema。

### 6.2 Client 入口

Client 入口声明公开服务依赖：`theme`、`settingsScope`、`slots` 和 `locale`。
激活顺序为：

1. 预验证完整生成目录。
2. 事务式注册全部 74 个主题。
3. 绑定插件设置命名空间。
4. 注册中英文 locale。
5. 注册独立 `settings.section` 页面。
6. 注册 `theme/change` 同步监听。
7. 在确认持久化 ID 已注册后恢复选择。

所有 disposer 归属同一个 Cordis 生命周期。正常卸载、热更新或激活失败都会撤销
已完成的主题、页面和监听注册。

### 6.3 主题选择与持久化

主题选择流程：

1. 用户点击卡片。
2. 校验 ID 属于本插件目录或 Harness 内置三项。
3. 调用 `ctx.theme.setTheme(id)`。
4. Theme 服务成功发布变化后更新页面状态。
5. 写入插件自有设置命名空间。

画廊额外展示 Harness 内置的 Light、Dark 和 System 三张卡片。选择其中之一时，
同时让 Harness 原生 Theme 服务执行正常的内置偏好写入，并把插件自有选择同步为
相同 ID。从 Harness 原生 Appearance 控件发生的内置主题切换也会通过
`theme/change` 清除过期的第三方恢复选择。

按 Harness 当前设置边界，loopback 浏览器可持久化到 Host 设置；远程浏览器选择
保持当前进程有效。插件不使用 `localStorage` 绕过该边界。

## 7. 独立主题画廊

插件通过公开 `settings.section` slot 增加一个独立“主题”导航项，不把 74 张卡片
塞入 General 设置行。

页面包含：

- 文本搜索：匹配主题名称、slug、分类和描述；
- 模式筛选：全部、浅色、深色；
- 上游领域分类筛选；
- 响应式视觉卡片网格；
- 当前选择状态和空结果状态。

每张卡片直接使用生成目录中的 token 绘制小型预览，包括 sidebar、base、layer、
primary text 和 brand accent。预览不使用截图、iframe、远程图片或运行时解析，
因此与实际主题数据保持一致。

可访问性要求：

- 主题选项使用单选语义；
- 支持 Tab、方向键、Enter 和 Space；
- 选中态不只依赖颜色；
- 保持可见焦点；
- 搜索和筛选均有可访问名称；
- 中文和英文文案均由插件 locale 提供，品牌名称保持原文。

页面样式仅使用本组件 CSS Module 和 Harness 公开语义 token，不定义 Harness 全局
选择器。

## 8. 错误处理

### 8.1 生成阶段

以下情况直接失败，并报告主题、文件和字段：

- 上游提交或目录清单不匹配；
- YAML/front matter 无法解析；
- 关键颜色缺失、引用循环或 CSS 值无效；
- 主题 ID 重复或使用保留 ID；
- 生成未知、未允许或基线中未消费的 token；
- WCAG AA 无法通过允许的自动调整和已有 override 达成；
- 两次生成输出不一致；
- 生成结果与版本库不一致。

### 8.2 运行阶段

- 注册前先验证整个目录；注册途中发生冲突时，反向调用已获得的 disposer，保证
  原子失败。
- 持久化 ID 不存在时，不调用 `setTheme()`；清除无效值并回退 `system`。
- 设置写入失败时，当前主题在本次会话继续生效，页面显示非阻断、可重试提示。
- 不兼容 Harness 版本或缺少公开服务时拒绝激活，日志给出所需版本和缺失能力。
- 单个卡片渲染数据异常不得破坏整个设置外壳；目录预验证应在注册页面前发现该
  类问题。

## 9. 测试策略

### 9.1 生成器单元测试

覆盖解析、颜色引用、语义归一化、模式判断、override 合并、字体回退、颜色调整和
确定性排序。

### 9.2 全目录契约测试

- 固定来源必须生成 74 个唯一主题。
- 每个主题只有一个合法 `colorScheme`。
- 每个主题包含运行所需的完整 token 集。
- 不存在保留 ID、未知 token、无效 CSS 值或手工修改的生成文件。
- `source-manifest.json` 与实际来源摘要一致。

### 9.3 可访问性测试

对每个主题参数化执行颜色对比度审计，覆盖第 5.5 节的六类表面和关键状态。失败
输出可直接转化为 override 修复。

### 9.4 Host 与 Client 测试

- 设置 schema 注册和默认值；
- 74 个主题的事务式注册与 disposer 清理；
- 冲突回滚；
- 搜索、分类、模式筛选和空状态；
- 单选语义、键盘导航和焦点；
- 主题切换、`theme/change` 同步和内置主题回退；
- 冷启动恢复、无效 ID 和设置写入失败；
- locale 注册与卸载。

### 9.5 打包与兼容性测试

- 对最终 tarball 的文件白名单和入口做 smoke test。
- 安装到临时 Harness Profile，验证 `--dump-config` 包含本 bundle 层。
- 在受支持 Harness 基线运行真实浏览器测试：页面可见、74 张来源卡片存在、切换
  生效、刷新恢复、控制台无错误。
- 删除插件后，主题和设置页面消失，Harness 原生界面与内置主题仍可工作。
- 初始支持矩阵的最低版本和当前版本均为 `0.1.1-rc.2`；未来扩大版本范围时，CI
  同时保留范围下界与最新已验证版本。

## 10. 文档与发布

版本库生成并维护：

- 74 套主题画廊与色板；
- 每套主题的来源路径、上游提交、模式和人工调整说明；
- WCAG 审计报告；
- 同步上游和编写 override 的维护指南；
- 安装、升级、卸载和兼容版本说明。

发布包仅包含运行所需产物、生成目录、locale、组件 CSS Module、许可证、README
和 `cordis.patch.yml`。上游 `DESIGN.md`、生成脚本、测试夹具、报告源数据和研究
材料不进入运行包。

项目明确声明：它是社区插件，与 DeepSeek、DeepSeek Harness、VoltAgent 以及
74 个设计来源品牌均无官方从属或背书关系。品牌名称只用于描述主题灵感来源。

## 11. 完成标准

- 用户通过一条 `dsh plugin --profile <name> add` 命令安装，无需修改 Harness。
- 固定上游提交的全部 74 个来源主题出现在独立画廊中。
- 主题通过官方 Theme API 即时生效，冷启动后恢复。
- 搜索、分类、明暗筛选、鼠标和键盘操作可用。
- 关键颜色组合通过 WCAG AA。
- 同一输入生成完全相同的输出；上游变化可被审查。
- 打包、契约、组件、集成和真实浏览器验证通过。
- 插件卸载后不残留主题、页面、监听器或全局样式。
- 项目包含 MIT 许可传递、来源署名和非官方声明。

## 12. 非目标

首版不包括：

- 为每个来源生成第二套明暗配色；
- 用户在线编辑或导入任意主题；
- 运行时从 GitHub 更新主题；
- 自定义壁纸、背景视频或玻璃效果；
- 修改圆角、间距、布局、组件结构或动效；
- 主题市场、云同步、遥测或账户系统；
- 自动发布 npm 包或修改用户的 Harness Profile 之外的文件。
