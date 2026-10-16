# Queer Resources · 酷儿资源库
<div align="center">
   <img src="assets/logo-main.png" alt="描述" width="50%">
</div>

> 温和、严谨与包容的 LGBTQIA+ 同行互助平台

一个纯静态、无构建步骤的性少数社区资源索引。按功能收录跨性别、间性人、多元性取向、性别肯定医疗、危机热线、法律人权与生活支持条目。所有链接未经独立核验，请以机构官网为准。

---

## 🚀 本地预览

本站是纯静态站点，不需要 Node / npm / 构建工具。任意 HTTP 服务器即可：

```bash
# Python 3
python3 -m http.server 8080

# 然后访问 http://localhost:8080
```

---

## 📁 目录结构

```
Queer-Resources/
├── index.html            ← 首页（含全部资源视图）
├── crisis.html           ← 求助热线独立页
├── contributing.html     ← 关于贡献独立页
├── privacy.html          ← 隐私政策页
├── app.js                ← 运行时：筛选/搜索/渲染/主题切换
├── resources.js          ← 运行时数据（window.QUEER_RESOURCES）
│
├── docs/                 ← 源数据（由 scripts/parse_resources.py 生成 resources.js）
│   ├── resources.md      ← Markdown 表格（267+ 条社区索引）
│   └── COLOR_SYSTEM.md   ← 色彩设计说明
│
├── scripts/
│   └── parse_resources.py   ← 从 docs/resources.md 解析生成 resources.js
│
├── tests/
│   └── quick_test.html   ← 在浏览器中打开，运行 safeUrl / escapeHtml / groupResources 基础测试
│
├── CONTRIBUTING.md       ← 贡献指南 + PR 审核标准
├── CHANGELOG.md          ← 版本更新日志
├── LICENSE               ← CC BY-SA 4.0（内容）+ MIT（代码）
├── robots.txt
├── .editorconfig
└── .gitignore
```

---

## 🧪 数据生成流程

```bash
# 1. 编辑 docs/resources.md（按照现有 Markdown 表格格式）
# 2. 运行解析脚本（自动读取 docs/resources.md，输出到项目根目录）
python3 scripts/parse_resources.py

# 3. 脚本会生成：
#    ├── resources.js   （被 index.html / crisis.html 运行时加载）
#    └── resources.json （中间产物，同时生成）

# 4. （可选）重新运行 HTML patch：通常不需要，index.html 已直接 <script src> resources.js
```

---

## 🎨 技术栈

| 组件 | 选型 | 原因 |
| --- | --- | --- |
| 构建 | **无** | 纯静态 HTML + CDN Tailwind，GitHub Pages / Vercel / Netlify 直接部署 |
| 样式 | Tailwind CSS（CDN） | 快速迭代、无样式漂移 |
| 图标 | Material Symbols Outlined | Google Fonts 同源，加载性能好 |
| 运行时 | 原生 ES6+ JavaScript（IIFE） | 无框架，400 行内搞定 |
| 数据源 | Markdown 表格 + Python 脚本 | 社群友好、版本控制清晰 |

---

## 🔗 外部链接

- **GitHub 仓库**：<https://github.com/Clipsule/Queer-Resources>
- **提交新条目 / 失效反馈**：[contributing.html](./contributing.html)
- **隐私政策**：[privacy.html](./privacy.html)
- **姐妹站 MtF.wiki**：<https://mtf.wiki/> · 本站参考其仓库结构与 CC BY-SA 许可方式

---

## 📜 许可

本项目内容（resources.md 中的社区索引、Markdown 文字说明、HTML 页面文案）采用 **CC BY-SA 4.0 署名-相同方式共享** 许可。

代码部分（`scripts/`、`app.js`、HTML 模板）采用 **MIT 许可**。

详见 [`LICENSE`](./LICENSE)。
