# 搜索同义词 / 黑话 / 俚语映射表

> **用途**: 用户搜索时输入的大众词、黑话、网络梗（如 "拉拉"、"木桶饭"、"吃药"）会被展开成对应的精准 tag（resources.js 里实际存在的、**不会跨类别误命中**的 tag）。
> **维护方式**: 编辑本文件 → 运行 `python3 scripts/generate_alias_js.py` 自动同步 `app.js`。
> **生成脚本**: `scripts/generate_alias_js.py` —— 从本文件的 Markdown 表格解析，自动注入 app.js 的 `/*BEGIN_ALIAS*/ ... /*END_ALIAS*/` 之间。
> **精准性规则**: targets **不能是跨 2+ 不同意图条目的通用词**（如 "跨性别总称" 在 70 条里都有，会让 MtF 搜索也命中 FtM）。

## 格式说明

| 字段 | 说明 |
|---|---|
| **aliases** | 用户可能搜的词（可多选，逗号分隔）。匹配时做**双向模糊包含** |
| **targets** | `resources.js` 里**实际存在**且**精准不跨类别的 tag**。**绝对不要**写 "跨性别总称"、"性别"、"心理"、"安全"、"mtf" 这类通用词 —— 会导致搜索跨组误命中 |

---

## 映射表（已全部经过精准性筛选）

### 1. 跨性别统称（trans）

| aliases | targets |
|---|---|
| 跨性别, 跨性, trans, 变性, 人妖, 性别转换, 性别再分配, 性别确认 | 跨性别总称 |

> 💡 **为什么只剩一个 target？** "跨性别总称" 在 70 个条目中都存在，包括 MtF / FtM / 非二元。这正好符合"搜 trans 就是想找所有跨性别资源"的语义。组 2/12 是精准 MtF 搜索，才需要更窄的 tag。

### 2. 跨性别女性 / MtF

| aliases | targets |
|---|---|
| mtf, 男转女, 跨女, 变女, 女跨, 伪娘, 娘炮, 飞天猫, 满天星, 药娘, 术娘, 女装大佬 | 跨性别女性, 女性倾向, transfeminine |

### 3. 跨性别男性 / FtM

| aliases | targets |
|---|---|
| ftm, 女转男, 跨男, 变男, 男跨 | 跨性别男性, 男性倾向, transmasculine |

### 4. 非二元 / 性别多元

| aliases | targets |
|---|---|
| 非二元, nb, non-binary, nonbinary, 性别酷儿, 多元性别, 性别流动, genderfluid, enby | 非二元, 性别多元, 性别流动 |

### 5. 女同性恋 / 拉拉

| aliases | targets |
|---|---|
| 拉拉, les, lesbian, 女同, lesbi, 百合, 蕾丝边, 蕾丝, 拉子, 橘里橘气 | 女同性恋, lesbian |

### 6. 男同性恋 / Gay

| aliases | targets |
|---|---|
| gay, 基佬, 男同, homosexual, 给佬, 搞基, 玻璃, 断背, 龙阳 | 男同性恋, gay |

> ⚠️ 注意：不包含 "同志" 作为 target —— 中文"同志"在社群里也指一般朋友，容易误命中。

### 7. 双性恋

| aliases | targets |
|---|---|
| 双性恋, bi, bisexual, 双性 | 双性恋, bisexual |

### 8. 无性恋

| aliases | targets |
|---|---|
| 无性恋, ace, asexual, 无性, 灰无性, 灰色无性恋 | 无性恋, 灰色无性恋 |

### 9. 无浪漫倾向

| aliases | targets |
|---|---|
| 无浪漫, aro, aromantic, 无浪漫倾向 | 无浪漫倾向, aromantic |

### 10. 酷儿

| aliases | targets |
|---|---|
| 酷儿, queer | 酷儿, queer |

### 11. 间性人

| aliases | targets |
|---|---|
| 间性, 阴阳人, 双性人, 雌雄同体 | 间性人, intersex |

### 12. 木桶饭 / 女装大佬（MtF 语境）

| aliases | targets |
|---|---|
| 木桶饭, 异装, 跨装, crossdress, 女装大佬, 女装, 男娘, 异装癖 | 跨性别女性, 女性倾向, transfeminine |

> 💡 **这个组之前有 bug**：旧 targets 包含 "跨性别总称" 和 "mtf" —— "跨性别总称" 出现在 70 个条目（含 MtF + FtM + 非二元），导致搜"木桶饭"同时命中 FtM。现在只保留 "跨性别女性" / "女性倾向" / "transfeminine"，这三个 tag 只出现在 MtF 条目里，与 FtM 零交集。

### 13. 激素 / HRT

| aliases | targets |
|---|---|
| hrt, 激素, 荷尔蒙, 吃药, 打针, 雌激素, estrogen, testosterone | 激素治疗, hrt |

### 14. 手术

| aliases | targets |
|---|---|
| 手术, srs, 改性别, 变性手术, 确认手术, gender affirming, 切胸 | 性别肯定手术, srs, surgery |

### 15. 声音 / 变声

| aliases | targets |
|---|---|
| 声音, 伪声, 变声 | 声音训练 |

### 16. PrEP / PEP

| aliases | targets |
|---|---|
| prep, 暴露前预防, pep, PrEP | 暴露前预防 |

### 17. HIV / 艾滋

| aliases | targets |
|---|---|
| hiv, 艾滋, 爱滋, aids | 艾滋 |

### 18. 自杀 / 危机

| aliases | targets |
|---|---|
| 自杀, 想死, 轻生, 危机, 跳楼 | 危机干预, 自杀 |

> ⚠️ 移除了 "心理" —— 这个词出现在咨询、自杀、治疗、医疗等**所有**心理相关条目里，太宽泛。

### 19. 咨询 / 治疗师

| aliases | targets |
|---|---|
| 咨询, therapy, 治疗师, counselor | 咨询, mental health |

### 20. 诊所 / 医院

| aliases | targets |
|---|---|
| 诊所, 医院, 看病, 医生 | 诊所, 医院, 医生 |

### 21. 法律 / 维权

| aliases | targets |
|---|---|
| 法律, 维权, 权益, 诉讼, 官司 | 法律, 权益 |

### 22. 安全 / 隐私

| aliases | targets |
|---|---|
| 安全, 隐私, 加密, vpn, 翻墙, 匿名 | 数字安全 |

> ⚠️ 只留 "数字安全" —— "安全" / "隐私" / "加密" 单独出现时太宽泛。

### 23. 工作 / 职场 / 出柜

| aliases | targets |
|---|---|
| 工作, 职场, 就业, 老板, 出柜, come out | 职场, 就业 |

### 24. 学生 / 学校

| aliases | targets |
|---|---|
| 学生, 学校, 上学, 老师, 校园 | 青年, 学校, 学生 |

### 25. 社区 / 小组

| aliases | targets |
|---|---|
| 社区, 小组, 聚会, 微信群 | 社区, 同伴 |

### 26. 改名 / 证件

| aliases | targets |
|---|---|
| 改名, 改证, 身份证, 证件, 性别标记, 性别变更 | 证件, 法律性别承认 |

### 27. 家庭 / 父母

| aliases | targets |
|---|---|
| 家庭, 父母, 妈妈, 爸爸, 家长 | 家庭, 父母 |

### 28. DIY / 自助

| aliases | targets |
|---|---|
| diy, 自助, 自己, 网购, 海淘 | DIY, 减害 |

### 29. 性角色

| aliases | targets |
|---|---|
| 1, 0, 0.5, top, bottom, vers, 攻, 受, 可攻可受 | 性角色 |

### 30. 身材分类（男同社群）

| aliases | targets |
|---|---|
| 熊, 猴, 壮熊, 肌肉, bear, otter, twink, twunk, cub, wolf | 身材分类 |

### 31. 出柜 / Pass

| aliases | targets |
|---|---|
| pass, 过关, 出柜, come out, 深柜, stealth | 出柜, come out |

### 41. 变装 / CD / 伪娘 / 男娘

| aliases | targets |
|---|---|
| cd, crossdress, crossdressing, 变装, 异装, 跨装, 伪娘, 男娘, 女装, 女装大佬, 女装子, 男の娘, ニューハーフ, 여장, 크로스드레서, cdts, tsf, 性转, 变身 | 变装, 伪娘, 男娘, CDTS, TSF, 性转 |

### 42. 攻受 / 性角色 / Vers

| aliases | targets |
|---|---|
| 1, 0, 0.5, top, bottom, vers, versatile, 攻, 受, 可攻可受, 偏1, 偏0, 纯1, 纯0, 公, 母, タチ, ネコ, リバ, 탑, 바텀 | 性角色 |

### 43. 熊圈 / 身材类型

| aliases | targets |
|---|---|
| 熊, 猴, 狒狒, 狼, 猪, 壮熊, 肌肉, 毛熊, bear, otter, twink, twunk, cub, wolf, silver fox, chaser, 追逐者, ゴリマッチョ | 身材分类 |

### 44. 药娘 / 吃糖 / GAHT

| aliases | targets |
|---|---|
| 药娘, 吃糖, 糖, 药, gaht, 激素替代, 抗雄, 雌激素, 补佳乐, 色普龙, 螺内酯, ホルモン療法, 호르몬 치료 | 药娘, 激素治疗, hrt |

### 45. BDSM / 字母圈 / 主奴

| aliases | targets |
|---|---|
| bdsm, sm, 字母圈, 主奴, 主人, 奴隶, dom, sub, switch, 调教, 束缚, 皮绳, 愉虐, spank, 小圈, fetish, kink, 恋物, d/s, 支配, 臣服, 縄, 緊縛 | BDSM, 字母圈, 主奴 |

### 46. CDTS变身文学 / TSF

| aliases | targets |
|---|---|
| tsf, 变身文学, 性转小说, 变身小说, cdbook, 伪娘漫画, 性转漫画, ts漫画, 变身漫画, 성전환 소설 | TSF, 变身文学, 性转 |

### 47. 韩国性少数

| aliases | targets |
|---|---|
| 이반시티, ivancity, 게이, 레즈비언, 트랜스젠더, 성소수자, 퀴어, 한�국 게이, 한�국 레즈, 커밍아웃, 한�국 성소수자 | 韩国, KSCRC |

### 48. 日本伪娘 / 女装子

| aliases | targets |
|---|---|
| 男の娘, 女装子, ニューハーフ, おとこのこ, メンズメイク | 日本, 男の娘 |

### 49. 台湾伪娘 / CDTS

| aliases | targets |
|---|---|
| 偽娘, 女裝男子, 偽娘板, 巴哈偽娘, dcard偽娘, 女裝男子互助 | 伪娘, CDTS |

### 50. 中东 / 阿拉伯语

| aliases | targets |
|---|---|
| arab, arabic, 阿拉伯, 中东, middle east, mena, queer arab, lgbt arab, عربي, المثليين, مجتمع الميم | 中东, 阿拉伯 |

### 51. 非洲

| aliases | targets |
|---|---|
| africa, african, 非洲, gala, gender dynamix, cal, qayn, amsher, south africa, african lgbt, african queer | 非洲, GALA |

### 52. 拉丁美洲

| aliases | targets |
|---|---|
| latino, latina, latin america, 拉丁美洲, 拉美, ilgalac, gpsgay, 巴西, 墨西哥, argentina, colombia | 拉丁美洲 |

### 53. 残障 / 聋人 / 视障

| aliases | targets |
|---|---|
| disability, disabled, deaf, blind, 残障, 聋人, 视障, 听障, pwda, deaf queer, blind lgbt | 残障, 聋人, 视障 |

### 54. 宗教 / 信仰（补充英文）

| aliases | targets |
|---|---|
| religion, religious, faith, church, christian, jewish, muslim, buddhist, 基督教, 犹太教, 穆斯林, 佛教 | 宗教, 信仰 |

### 55. 移民 / 难民 / 庇护

| aliases | targets |
|---|---|
| immigrant, refugee, asylum, migration, 移民, 难民, 庇护, 政治庇护, immigration equality, oram, rainbow railroad, rainbow initiative | 移民, 难民, 庇护 |

### 56. 性健康 / PrEP 补充

| aliases | targets |
|---|---|
| 性健康, sexual health, pep, 暴露后预防, 安全套, 检测, hiv检测, 匿名检测, 性病, std, sti | 暴露前预防, 艾滋, 检测 |

### 57. 多边恋 / 开放关系 / ENM

| aliases | targets |
|---|---|
| 多边恋, 开放关系, 非单偶, poly, polyamory, polyam, enm, ethical non-monogamy, 多元关系, 开放式关系 | 多边恋, 开放关系, 非单偶 |

---

## 贡献流程

1. 在本文件**末尾新增表格行**
2. `aliases` 填用户可能搜的词；`targets` 必须是 `resources.js` 里**实际存在**且**不跨类别的 tag**
3. **重要**: 先跑 `python3 scripts/generate_alias_js.py --check` 确认 targets 能命中真实条目
4. 跑 `python3 scripts/generate_alias_js.py` 自动同步到 app.js
5. 提 PR → 审核 → 合入

## 测试

打开 DevTools Console，快速验证：

```js
// 验证木桶饭只命中 MtF
const group = QUERY_ALIAS_GROUPS.find(g => g.aliases.includes('木桶饭'));
console.log('木桶饭 →', group.targets); // 应该只有: 跨性别女性, 女性倾向, transfeminine

// 验证不命中 FtM
const ftmGroup = QUERY_ALIAS_GROUPS.find(g => g.aliases.includes('ftm'));
console.log('FtM targets', ftmGroup.targets);
console.log('是否与木桶饭 targets 有交集？', group.targets.some(t => ftmGroup.targets.includes(t)));
// 应该是 false ✅
```
