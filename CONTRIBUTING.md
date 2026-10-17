# 贡献指南

感谢你想要帮助维护 Queer Resources（酷儿资源库）。本指南旨在让贡献过程清晰、透明、一致。

## 1. 行为准则

本项目参与者应被尊重对待。任何形式的骚扰、歧视、人身攻击、隐私泄露（包括未经同意公开他人身份、联系方式、就诊信息）都是不可接受的，维护者有权直接关闭相关 Issue / PR。

## 2. 贡献类型

你可以通过以下方式帮助我们：

| 类型 | 描述 |
| --- | --- |
| 新增资源 | 补充一个经过验证的社区/组织/指南/热线 |
| 更新资源 | 修正失效链接、更新联系方式、补充最新说明 |
| 移除资源 | 对已停运、失联或不再安全的资源提出移除 |
| 多语言 | 修正译文、补译缺失文案（现支持：简体中文 / English / 日本語 / 한국어） |
| 搜索同义词 | 补充社群黑话、外语检索词（见第 5 节） |
| 前端 / 样式 | 修复可访问性、响应式、暗色模式问题 |
| 反馈 | 对错误、矛盾、内容重复、排版问题提出 Issue |

## 3. 文件地图（每个文件指向哪里、有什么用）

```
index.html            首页（精选视图 + 全部资源视图）      ← 加载 resources.js / app.js / i18n.js
crisis.html           求助热线独立页                        ← 加载 resources.js / i18n.js（有自己的内联渲染，不加载 app.js）
contributing.html     本指南的网页版                        ← 加载 resources.js / i18n.js（有自己的内联渲染，不加载 app.js）
privacy.html          隐私政策页                            ← 加载 i18n.js

app.js                首页运行时：卡片渲染、筛选、搜索、视图与主题切换
i18n.js               多语言运行时：语言判定 → 拉取 locales/i18n.json → 渲染文案 → 注入语言切换器
resources.js          【生成物】window.QUEER_RESOURCES 资源数据

locales/i18n.json     四语言 UI 文案 + searchAliases（分语言同义词）+ resources（条目译文），只被 i18n.js 读取

assets/icons.css      图标字体的 @font-face 与加载失败兜底样式
assets/fonts/material-symbols-outlined.woff2  图标子集字体
assets/logo-sub.png   站点图标 / 页头 logo
assets/logo-main.png  社交分享大图（og:image）

docs/resources.md     【唯一数据源】社区索引 Markdown 表格   ← 被 scripts/parse_resources.py 解析
docs/search-aliases.md【中文同义词权威来源】                ← 被 scripts/generate_alias_js.py 解析
docs/color-system.md  色彩 / 毛玻璃 / 极光背景设计规范       ← 人工查阅

scripts/parse_resources.py    docs/resources.md → resources.js
scripts/generate_alias_js.py  docs/search-aliases.md → app.js 内同义词表
scripts/build_icon_font.py    子集化 Material Symbols 图标字体

tests/quick_test.html        浏览器打开的冒烟测试（safeUrl / escapeHtml / 哈希读写）
vercel.json           部署配置与安全响应头（其 CSP 必须与页面 meta CSP 保持一致）
robots.txt / .editorconfig / .gitignore / LICENSE
```

> **两条硬规则**：① 不要手改 `resources.js`（改 `docs/resources.md` 后跑脚本）；② 不要手改 `app.js` 里 `/*BEGIN_ALIAS*/` 之间的同义词表（改 `docs/search-aliases.md` 后跑脚本）。

完整文件说明（谁加载谁）见 [README.md 的文件地图](README.md#-文件地图)。

## 4. 数据更新流程

本站资源数据维护在 `docs/resources.md`，是一份 Markdown 表格。完整的数据更新流程：

```bash
# 1. Fork 仓库并创建新分支
git checkout -b update/add-new-resource

# 2. 编辑 docs/resources.md
# 按照现有章节格式添加 / 修改行，保持表格格式一致

# 3. 运行解析脚本，重新生成 resources.js
python3 scripts/parse_resources.py

# 4. 提交并推送，发起 Pull Request
git add -A
git commit -m "docs(resources): 新增 XXX 资源 / 更新 XXX 链接"
git push
```

### resources.md 条目字段说明

每行一个资源，Markdown 表格列为：

| 列 | 必填 | 说明 |
| --- | --- | --- |
| 名称 | ✅ | 资源的公开名称 |
| 类型 | ✅ | 如「知识百科；入门指南」「组织与服务」 |
| 链接 | ✅ | 以 `http://` 或 `https://` 开头的官网链接 |
| 地区 | ✅ | 中国大陆 / 台湾 / 香港 / 国际 等（格式：`地区 · 语言`） |
| 标签 | 建议 | 分隔符为 `;` 或 `；`，如 `跨性别女性; 激素信息` |
| 章节 | ✅ | 所属大章节（二、三、四…） |
| 小节 | ✅ | 所属小节（2.1、3.2…） |
| 说明 | ✅ | 简要描述；如有风险提醒请在此明确写出 |

> 章节以「一、」开头的说明性章节，以及「十七、」「十八、」未核验章节，会被 `skip_section` 逻辑自动跳过，不会进入站点数据。

## 5. 添加搜索同义词 / 黑话 / 俚语

很多用户会用社群黑话（如 "拉拉"、"木桶饭"、"吃药"、"mtf"）搜索，而 `resources.js` 的 tag 用的是正式术语。搜索层会做**同义词展开**，运行时有**两份表**：

| 位置 | 角色 |
| --- | --- |
| `docs/search-aliases.md` | 中文同义词**权威来源**，由 `scripts/generate_alias_js.py` 同步进 `app.js` |
| `locales/i18n.json` 的 `searchAliases.<语言>` | 运行时**实际优先使用**的那一份（按当前界面语言取），另有各语言追加的外语检索词 |

`app.js` 只有在 `i18n.json` 加载失败时才回退到内置表。所以新增一组同义词需要**同时改两处**：

1. 编辑 [`docs/search-aliases.md`](docs/search-aliases.md)，在对应分组表格里补 `aliases` / `targets`；
2. 在 `locales/i18n.json` 的 `searchAliases` 中为各语言补上同一组（`zh-CN` 需与上表保持一致，其他语言在此基础上追加本地词）；
3. 先跑 `python3 scripts/generate_alias_js.py --check` 确认 targets 能命中真实条目，再跑 `python3 scripts/generate_alias_js.py` 写入 `app.js`；
4. 提 PR → 审核 → 合入。

**精准性要求**：`targets` 必须写成 `resources.js` 里**实际存在、且不跨类别**的 tag。像「跨性别总称」「性别」「心理」「安全」这类在几十条条目里都出现的通用词**禁止**作为 target —— 否则搜 MtF 会命中 FtM、搜「心理」会命中全部医疗条目。详细规则与原因见 `docs/search-aliases.md` 顶部说明。

## 6. 多语言文案

界面文案由 `locales/i18n.json` 提供，页面通过自定义属性声明待翻译内容：

| 属性 | 作用 |
| --- | --- |
| `data-i18n="key"` | 替换 `textContent`（纯文本） |
| `data-i18n-html="key"` | 替换 `innerHTML`，支持 `\n` 换行与 `{n}` 占位符 |
| `data-i18n-attr="attr=key;attr2=key2"` | 替换属性（`placeholder` / `aria-label` / `content` 等） |

**新增文案时，四种语言必须补齐同一个键**（键名必须完全一致）。缺键会回退中文，不会报错，因此请自查一遍。资源条目本身的译文放在 `resources` 段，按条目在 `resources.js` 中的**索引顺序**对齐。

## 7. 审核标准（Acceptance Criteria）

PR 在合入前需满足以下全部条件：

- [ ] 资源链接**实际可访问**（合并前维护者会手动点测）
- [ ] 资源属于当前分类 / 章节，或 PR 说明了重新分类的理由
- [ ] 同一章节内，**没有**与现有条目的名称或 URL 重复
- [ ] 说明文本不包含歧视性语言，不误导读者
- [ ] 如果资源涉及医疗或法律内容，说明中已加入「以官方最新说明为准」提醒
- [ ] 新增 / 修改的 tag 均为 `resources.md` 中已声明的规范标签
- [ ] 多语言改动在四种语言中都补齐了同名键
- [ ] PR 描述清晰，写明「为什么要更新 / 新增 / 移除」

## 8. 维护者角色

- **社区维护者（Maintainer）**：负责合并 PR、审核资源、处理 Issue。由社区提名产生。
- **数据维护者（Data Curator）**：专注 `docs/resources.md` 的章节结构和数据质量。
- **技术维护者（Tech Maintainer）**：负责前端代码、脚本、部署。

持续贡献 3 个月以上、PR 质量稳定的贡献者，可以在社区讨论中被提名加入维护团队。欢迎表达兴趣。

## 9. 技术开发环境

- **无构建步骤**：本站使用 Tailwind CDN，不需要安装 Node / npm，不需要打包。
- **Python 脚本**：`scripts/parse_resources.py`、`scripts/generate_alias_js.py` 仅依赖 Python 3.7+ 标准库（`re`、`pathlib`、`json`、`argparse`）；`scripts/build_icon_font.py` 额外需要 `pip install fonttools brotli`。
- **本地预览**：任意静态服务器即可，例如：
  ```bash
  python3 -m http.server 8080
  # 然后访问 http://localhost:8080
  ```
- **改样式前请先读** [`docs/color-system.md`](docs/color-system.md)：颜色统一走 CSS 变量，暗色模式需保留色相、仅降低饱和度。
- **改安全响应头时**：`vercel.json` 的 CSP 必须与页面内 `<meta http-equiv="Content-Security-Policy">` 保持同步，两处都要改。

## 10. 致谢

每一条 PR、每一个 Issue、每一次反馈都在让这个资源库更可靠。谢谢你。
