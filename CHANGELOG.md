# 更新日志

所有值得记录的项目变化都将写在这里。版本号遵循语义化版本（SemVer）。

## Unreleased

### 仓库整理与文档规范化

- **删除** `.trae-html-share-packages/`（含 `privacy.html.zip`，约 1.5 MB IDE 分享产物，已被 `.gitignore` 忽略）
- **删除** `locales/_tmp/i18n.bak.json`（多语言融合前的临时备份，运行时与脚本均无引用）
- **重命名** `docs/COLOR_SYSTEM.md` → `docs/color-system.md`（与其他文档统一为小写连字符命名），并按 `index.html` 中的**实际实现**校正内容：原文档描述的 `.rainbow-bg` / `.blob` / `blur(120px)` / `translateY(-4px)` / `--rainbow-*` / `--accent-gradient` 等取值与实现不符，实际为 `.aurora-blob` + `blur-[110–120px]` + `animate-aurora-*` + hover `translateY(-6px)`
- **修复** `docs/search-aliases.md` 缺失第 32–40 组（性别焦虑 / 性取向探索 / 泛性恋 / 浪漫取向 / 多边恋 / 束胸 / 网络骚扰 / 生育 / 宗教）的问题。原文只有 48 组，而 `app.js` 与 `locales/i18n.json` 均为 57 组 —— 按原文档执行 `generate_alias_js.py` 会把 9 组同义词从 `app.js` 中静默删除；现已按 `app.js` 实际数据补齐，并注明「表格必须覆盖全部组」
- **修复** `docs/search-aliases.md` 的测试示例：`QUERY_ALIAS_GROUPS` 定义在 `app.js` 的 IIFE 内部、并非全局变量，示例改为 `window.QRi18n.aliasGroups()`
- **重写** `README.md`：新增**完整文件地图**（逐文件标注「被谁引用 / 指向哪里 / 有什么用处」）、多语言与图标字体的生成流程、`file://` 直开时的限制说明
- **重写** `CONTRIBUTING.md`：修正重复的章节编号（两处「7」）、移除指向不存在文件的 `CODE_OF_CONDUCT.md` 死链、新增「文件地图」与「多语言文案」章节、更正同义词贡献流程（两份表 + `locales/i18n.json` 中的外语检索词）、把「目前仅简体中文」更正为四种语言
- **修正** `LICENSE`：代码许可（MIT）适用范围补齐 `i18n.js`、`resources.js` 与 `scripts/` 全量脚本；内容许可（CC BY-SA 4.0）补充 `locales/i18n.json` 中的译文

### 已知问题（待处理）

- 搜索同义词表存在**两份**：`docs/search-aliases.md`（经 `generate_alias_js.py` 同步进 `app.js`）与 `locales/i18n.json` 的 `searchAliases`，而运行时**优先使用后者**。因此当前对中文同义词的实际生效改动点是 `i18n.json`，`app.js` 中的表仅在 `i18n.json` 加载失败时兜底；两者需人工保持一致，建议后续为 `generate_alias_js.py` 增加同步 `i18n.json`（至少 `zh-CN`）的能力
- `locales/i18n.json` 目前无生成脚本，四种语言的键与资源译文均手工维护

### 文件系统重构（对齐 MtF.wiki 仓库风格）

- **删除** `_patch_html.py`（已废弃：index.html 直接 `<script src="app.js">`，不再需要 patch inline script）
- **删除** `resources.json`（app.js 运行时不引用，parse_resources.py 按需生成即可）
- **删除** `.trae/`、`.trae-html-share-packages/`（IDE 产物，已加入 .gitignore）
- **重命名** `Resources and Guidelines Document/` → `docs/`（去掉空格和混合大小写，符合 URL/CLI 惯例）
- **移动** `parse_resources.py` → `scripts/parse_resources.py`（工具脚本与运行时分离），PROJECT_ROOT 路径修正为 `SCRIPT_DIR.parent`
- **新增** `README.md`（项目总览 + 目录树 + 技术栈表）
- **新增** `LICENSE`（内容 CC BY-SA 4.0 + 代码 MIT 双许可）
- **新增** `.editorconfig`
- **更新** `.gitignore`（保留 tests/ 追踪，新增 .trae/、__pycache__/）
- **更新** CONTRIBUTING.md、contributing.html 中所有旧路径引用

### 已规划

- [ ] 定期链接有效性自动检查（CI）
- [ ] 在 parse_resources.py 中增加 `phone` 字段提取（配合 crisisCardHtml 真实显示电话）
- [ ] 新增 Sitemap 生成脚本
- [ ] 为 `generate_alias_js.py` 增加同步 `locales/i18n.json` 的能力（消除同义词表双份维护）
- [ ] 间性人 / 无性恋专项资源扩充

---

## 1.1.0 — 2025-07-04

### 修复（100 项 issue 大版本）

- **路径与环境**：`parse_resources.py`、`_patch_html.py` 硬编码路径全部改为 `Path(__file__).resolve().parent`，支持 Windows / macOS / Linux
- **解析准确性**：
  - `type_key()` 关键词匹配顺序修复，避免「百科；健康」被错误归类为 `ngo`
  - `skip_section` 逻辑只跳过引言「一、」和尾部未核验章节，不再误伤其他以「一」开头的章节
  - 去重增加 `normalize_name()`（strip + lower + 折叠空白），避免名称仅大小写或空格差异导致重复
- **可访问性（WCAG）**：
  - 新增跳过链接 `跳到主内容`
  - 搜索框添加 `<label for="searchInput">`（sr-only）
  - 分类按钮组 `role="tablist"`，分类按钮 `role="tab"` + `aria-pressed`
  - 资源卡片 `<article>` 添加 `aria-labelledby="card-title-*"` 关联标题
  - Material Symbols 装饰性图标全部 `aria-hidden="true"`
  - 新增 `aria-live` 区域，筛选结果变化时朗读反馈
  - `@media (prefers-reduced-motion: reduce)` 禁用极光等动画
- **安全**：
  - 添加 CSP（Content Security Policy）meta，限制脚本、样式、字体来源
  - 内联 `onclick` 全部移除，改为 `data-action` + 事件委托（避免 CSP 'unsafe-inline' 脚本）
  - `safeUrl()` 扩展协议白名单：新增 `tel:`、`mailto:`（带格式校验）
  - 所有动态生成的外部链接保证 `rel="noopener noreferrer"`
  - 邮件提交改用 `<a href="mailto:...">` 代替 `alert()`
- **隐私**：
  - 新增 `privacy.html`（独立隐私政策页面）
  - `localStorage` 访问全部包裹 try/catch，隐私模式安全
  - 明确声明「无分析、无追踪、无 Cookie」
- **数据一致性**：
  - 全站统一改为「社区索引（未独立核验）」，删除所有「经核验词条」矛盾表述
  - 硬编码「267 条」全部移除，改用 JS 动态注入 `resources.length`
  - 危机热线区域从硬编码 3 条改为动态从 `resources.js`（`categories.crisis`）提取
- **功能增强**：
  - 多关键词 AND 搜索（空格分词），支持更精确的筛选
  - URL Hash 状态同步：筛选条件写入 `#/?cat=...&type=...&reg=...&q=...`，刷新/分享保持状态
  - 新增地区筛选按钮组（全部 / 中国大陆 / 台湾 / 香港 / 国际）
  - 支持 `⌘K / Ctrl+K` 快捷键聚焦搜索框
  - 搜索框回车自动切换到「全部资源」视图
- **SEO**：
  - 添加 `<meta name="description">`、`author`、`theme-color`
  - 添加 Open Graph 标签（og:title / og:description / og:type / og:locale）
  - 添加 `<link rel="canonical" href="./">`
  - 新增 `robots.txt`
  - 新增 SVG emoji favicon（🏳️‍🌈）

### 新增文件

| 文件 | 用途 |
| --- | --- |
| `privacy.html` | 独立隐私政策页面 |
| `robots.txt` | 爬虫指令 + sitemap 预留 |
| `CONTRIBUTING.md` | 贡献指南 + PR 审核标准 |
| `CHANGELOG.md` | 本文件 |
| `COLOR_SYSTEM.md` | 色彩系统说明（v1.1 前已存在） |

### 废弃

- 内联 `onclick` 属性（已全部移除）
- 危机热线硬编码数组（改用 `resources.js` 数据）

---

## 1.0.0 — 2025-06-20

### 初始版本

- 267 条资源，覆盖 Wiki / 身份 / 性取向 / 医疗 / 危机 / 法律 / 青年 / 声音 / 职场 / 社群 / 安全 / 数据 / 住房 / 暴力等 16 个主题章节
- 首页精选 9 条 + 全部资源视图
- 分类 + 类型筛选
- 单关键词搜索
- 浅 / 深色主题切换（本地存储偏好）
- 极光渐变背景装饰
- 危机热线硬编码 3 条（988 / 12345 / LGBTQ 社区）
- Tailwind CDN + Google Fonts + Material Symbols
- 无构建步骤的纯静态站点
