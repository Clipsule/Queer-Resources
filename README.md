# Queer Resources · 酷儿资源库
<div align="center">
   <img src="assets/logo-main.png" alt="Queer Resources" width="50%">
</div>

> 温和、严谨与包容的 LGBTQIA+ 同行互助平台

一个纯静态、无构建步骤的性少数社区资源索引。按功能收录跨性别、间性人、多元性取向、性别肯定医疗、危机热线、法律人权与生活支持条目。所有链接未经独立核验，请以机构官网为准。

界面支持 **简体中文 / English / 日本語 / 한국어** 四种语言（首次访问按浏览器语言自动判定）。

---

## 🚀 本地预览

本站是纯静态站点，不需要 Node / npm / 构建工具。任意 HTTP 服务器即可：

```bash
# Python 3
python3 -m http.server 8080

# 然后访问 http://localhost:8080
```

> 建议用 HTTP 方式打开：多语言运行时通过 `fetch` 读取 `locales/i18n.json`，`file://` 直开时会被浏览器安全策略拦截（页面仍可用，但退回中文原文）。

---

## 📁 文件地图

每个文件指向哪里、被谁引用、有什么用处：

```
Queer-Resources/
├── index.html                          ← 首页（精选 + 全部资源视图）
├── crisis.html                         ← 求助热线独立页
├── contributing.html                   ← 「关于贡献」独立页（CONTRIBUTING.md 的网页版）
├── privacy.html                        ← 隐私政策页
├── app.js                              ← 首页运行时逻辑
├── i18n.js                             ← 多语言运行时
├── resources.js                        ← 生成物：window.QUEER_RESOURCES 数据
│
├── locales/
│   └── i18n.json                        ← 四语言 UI 文案 + 同义词 + 资源译文
│
├── assets/
│   ├── icons.css                        ← 自托管图标字体的 @font-face 与兜底
│   ├── fonts/
│   │   └── material-symbols-outlined.woff2 ← 图标子集字体（约 11 KB）
│   ├── logo-main.png                    ← 社交分享大图（og:image）与 README 头图
│   └── logo-sub.png                     ← 站点图标（favicon / apple-touch-icon）与页头 logo
│
├── docs/
│   ├── resources.md                     ← 唯一数据源（Markdown 表格，社区编辑）
│   ├── search-aliases.md                ← 搜索同义词权威来源（供生成脚本解析）
│   └── color-system.md                  ← 色彩 / 毛玻璃设计规范
│
├── scripts/
│   ├── parse_resources.py               ← docs/resources.md → resources.js
│   ├── generate_alias_js.py             ← docs/search-aliases.md → app.js 同义词表
│   └── build_icon_font.py               ← 子集化 Material Symbols 图标字体
│
├── tests/
│   └── quick_test.html                  ← 浏览器打开的冒烟测试
│
├── README.md                            ← 本文件：项目总览 + 文件地图
├── CONTRIBUTING.md                      ← 贡献指南 + PR 审核标准
├── CHANGELOG.md                         ← 版本更新日志
├── LICENSE                              ← 内容 CC BY-SA 4.0 + 代码 MIT
├── robots.txt                           ← 爬虫指令
├── vercel.json                          ← 部署配置与安全响应头（CSP 等）
├── .editorconfig                        ← 编辑器统一格式
└── .gitignore                           ← 忽略规则
```

### 谁加载谁

| 文件 | 被谁引用 | 说明 |
| --- | --- | --- |
| `resources.js` | `index.html`、`crisis.html`、`contributing.html` | 定义 `window.QUEER_RESOURCES`，是卡片渲染与「各分类条目数」统计的唯一数据来源 |
| `app.js` | `index.html` | 首页运行时：卡片渲染、分类/类型/地区筛选、搜索、视图切换、主题切换 |
| `i18n.js` | 四个页面各引一行 | 多语言运行时：判定语言 → 拉取 `locales/i18n.json` → 渲染文案 → 注入语言切换器 |
| `locales/i18n.json` | `i18n.js` 唯一读取 | 顶层为 `zh-CN`/`en`/`ja`/`ko` 四份 UI 文案，另有 `searchAliases`（分语言同义词）与 `resources`（资源条目译文） |
| `assets/icons.css` | 四个页面 | 声明 `Material Symbols Outlined` 字体与「字体加载失败显示 emoji 兜底」样式 |
| `assets/logo-*.png` | 四个页面 + `README.md` | `logo-sub` 作图标/页头 logo，`logo-main` 作 og:image |
| `docs/resources.md` | `scripts/parse_resources.py` | 唯一数据源，**不要直接改 `resources.js`** |
| `docs/search-aliases.md` | `scripts/generate_alias_js.py` | 同义词权威来源，**不要手改 `app.js` 里的同义词表** |
| `docs/color-system.md` | 人工查阅 | 颜色变量、毛玻璃、极光背景的取值规范 |
| `vercel.json` | 部署平台 | 安全响应头；其 CSP 必须与页面 `<meta http-equiv="Content-Security-Policy">` 保持一致 |

---

## 🧩 生成流程

站点运行时文件（`resources.js`）与同义词表由脚本生成，请勿手改：

```bash
# 1) 资源数据：docs/resources.md → resources.js (+ resources.json)
python3 scripts/parse_resources.py

# 2) 搜索同义词：docs/search-aliases.md → app.js 的 /*BEGIN_ALIAS*/ ... /*END_ALIAS*/
python3 scripts/generate_alias_js.py --check   # 先检查 targets 是否命中真实条目
python3 scripts/generate_alias_js.py           # 确认无误后再写入

# 3) 图标字体（仅在新增图标时需要）
#    pip install fonttools brotli
python3 scripts/build_icon_font.py <完整字体.woff2 路径>
```

多语言文案 `locales/i18n.json` 目前没有生成脚本，直接手工维护；新增页面文案时请在四种语言里补齐同名键（缺键会回退中文）。

---

## 🎨 技术栈

| 组件 | 选型 | 原因 |
| --- | --- | --- |
| 构建 | **无** | 纯静态 HTML + CDN Tailwind，GitHub Pages / Vercel / Netlify 直接部署 |
| 样式 | Tailwind CSS（CDN） | 快速迭代、无样式漂移 |
| 图标 | Material Symbols Outlined（自托管子集） | 不受 Google Fonts 被墙影响，仅约 11 KB |
| 运行时 | 原生 ES6+ JavaScript（IIFE） | 无框架 |
| 数据源 | Markdown 表格 + Python 脚本 | 社群友好、版本控制清晰 |
| 多语言 | 自定义 `i18n.js` + `data-i18n` 属性 | 无构建步骤 |

---

## 🔗 外部链接

- **GitHub 仓库**：<https://github.com/Clipsule/Queer-Resources>
- **GitHub 组织**：<https://github.com/clipsule>
- **邮箱**：<mailto:queer-resources@clipsule.cn>
- **X / Twitter**：<https://x.com/qingmao_ovo>
- **Telegram 群**：<https://t.me/+uPey6QU-zqowODhl>
- **贡献指南**：[CONTRIBUTING.md](./CONTRIBUTING.md) · [contributing.html](./contributing.html)
- **隐私政策**：[privacy.html](./privacy.html)
- **姐妹站 MtF.wiki**：<https://mtf.wiki/> · 本站参考其仓库结构与 CC BY-SA 许可方式

---

## 📜 许可

本项目内容（`docs/resources.md` 中的社区索引、Markdown 文字说明、HTML 页面文案、`locales/i18n.json` 中的译文）采用 **CC BY-SA 4.0 署名-相同方式共享** 许可。

代码部分（`app.js`、`i18n.js`、`scripts/`、HTML 模板结构）采用 **MIT 许可**。

详见 [`LICENSE`](./LICENSE)。
