# 更新日志

所有值得记录的项目变化都将写在这里。版本号遵循语义化版本（SemVer）。

## Unreleased

### 已规划

- [ ] 定期链接有效性自动检查（CI）
- [ ] 新增 Sitemap 生成脚本
- [ ] 添加英文界面（i18n 基础架构）
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
