# 贡献指南

感谢你想要帮助维护 Queer Resources（酷儿资源库）。本指南旨在让贡献过程清晰、透明、一致。

## 1. 贡献前请先看 [Code of Conduct](CODE_OF_CONDUCT.md)

本项目参与者应被尊重对待。任何形式的骚扰、歧视、人身攻击都是不可接受的。

## 2. 贡献类型

你可以通过以下方式帮助我们：

| 类型 | 描述 |
| --- | --- |
| 新增资源 | 补充一个经过验证的社区/组织/指南/热线 |
| 更新资源 | 修正失效链接、更新联系方式、补充最新说明 |
| 移除资源 | 对已停运、失联或不再安全的资源提出移除 |
| 翻译 | 将资源库或页面翻译为更多语言（目前仅简体中文） |
| 反馈 | 对错误、矛盾、内容重复、排版问题提出 Issue |

## 3. 数据更新流程

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
| 地区 | ✅ | 中国大陆 / 台湾 / 香港 / 国际 等 |
| 标签 | 建议 | 逗号分隔的关键词，如 `跨性别女性, 激素信息` |
| 章节 | ✅ | 所属大章节（一、二、三…） |
| 小节 | ✅ | 所属小节（2.1、3.2…） |
| 说明 | ✅ | 简要描述；如有风险提醒请在此明确写出 |

## 4. 审核标准（Acceptance Criteria）

PR 在合入前需满足以下全部条件：

- [ ] 资源链接**实际可访问**（合并前维护者会手动点测）
- [ ] 资源属于当前分类 / 章节，或 PR 说明了重新分类的理由
- [ ] 同一章节内，**没有**与现有条目的名称或 URL 重复
- [ ] 说明文本不包含歧视性语言，不误导读者
- [ ] 如果资源涉及医疗或法律内容，说明中已加入「以官方最新说明为准」提醒
- [ ] PR 描述清晰，写明「为什么要更新 / 新增 / 移除」

## 5. 维护者角色

- **社区维护者（Maintainer）**：负责合并 PR、审核资源、处理 Issue。由社区提名产生。
- **数据维护者（Data Curator）**：专注 resources.md 的章节结构和数据质量。
- **技术维护者（Tech Maintainer）**：负责前端代码、解析脚本、部署。

## 6. 如何被加入维护团队

持续贡献 3 个月以上、PR 质量稳定的贡献者，可以在社区讨论中被提名加入维护团队。欢迎表达兴趣。

## 7. 技术开发

- **无构建步骤**：本站使用 Tailwind CDN，不需要安装 Node / npm，不需要打包。
- **Python 脚本**：`scripts/parse_resources.py` 仅依赖 Python 3.7+ 标准库（`re`、`pathlib`、`json`）。
- **本地预览**：任意静态服务器即可，例如：
  ```bash
  python3 -m http.server 8080
  # 然后访问 http://localhost:8080
  ```

## 7. 添加搜索同义词 / 黑话 / 俚语

很多用户会用社群黑话（如 "拉拉"、"木桶饭"、"吃药"、"mtf"）来搜，但 resources.js 的 tag 用的是正式术语。我们在搜索层做了一层**同义词展开**，贡献流程：

1. 编辑 [`docs/search-aliases.md`](docs/search-aliases.md)
2. 在表格末尾新增一行：`aliases` 列填用户可能搜的词，`targets` 列填 resources.js 里**实际存在**的 tag / name / subsection / type 片段（小写）
3. 提 PR

> 合入后维护者会同步更新 `app.js` 里的 `QUERY_ALIAS_GROUPS` 常量（结构必须保持一致：`{aliases: [...], targets: [...]}`）。详细规则见 MD 文件顶部说明。

## 8. 致谢

每一条 PR、每一个 Issue、每一次反馈都在让这个资源库更可靠。谢谢你。
