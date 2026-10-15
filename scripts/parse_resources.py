# -*- coding: utf-8 -*-
"""Parse docs/resources.md tables into unique JSON for the website.

用法: python scripts/parse_resources.py            # 输出到项目根目录
     python scripts/parse_resources.py <outdir>    # 指定输出目录
"""
import json
import re
import sys
from pathlib import Path

# ---- 跨平台路径解析 ----
SCRIPT_DIR = Path(__file__).resolve().parent          # scripts/
PROJECT_ROOT = SCRIPT_DIR.parent                       # 项目根目录
SRC_MD = PROJECT_ROOT / "docs" / "resources.md"

if len(sys.argv) > 1:
    OUT_ROOT = Path(sys.argv[1]).resolve()
else:
    OUT_ROOT = PROJECT_ROOT

# ---- 章节分类映射 ----
section_re = re.compile(r"^## (.+)$", re.M)
subsection_re = re.compile(r"^### (.+)$", re.M)


def cat_for(section: str, subsection: str) -> list[str]:
    """根据中文章节标题推断 categories。"""
    cats = []
    if section.startswith("二"):
        cats.append("wiki")
    elif section.startswith("三"):
        cats.append("identity")
    elif section.startswith("四"):
        cats.append("orientation")
    elif section.startswith("五"):
        cats.append("medical")
    elif section.startswith("六"):
        cats.append("crisis")
    elif section.startswith("七"):
        cats.append("legal")
    elif section.startswith("八"):
        cats.append("youth")
    elif section.startswith("九"):
        cats.append("voice")
    elif section.startswith("十一"):
        cats.append("community")
    elif section.startswith("十二"):
        cats.append("safety")
    elif section.startswith("十三"):
        cats.append("directory")
    elif section.startswith("十四"):
        cats.append("data")
    elif section.startswith("十五"):
        cats.append("housing")
    elif section.startswith("十六"):
        cats.append("violence")
        cats.append("crisis")
    elif section.startswith("十"):  # 十、就业与职场
        cats.append("workplace")
    return list(dict.fromkeys(cats)) or ["wiki"]


def region_key(loc: str) -> str:
    """从 location 字符串推断 region。"""
    loc = loc or ""
    if "中国大陆" in loc or "内地" in loc:
        return "cn"
    if "台湾" in loc:
        return "tw"
    if "香港" in loc:
        return "hk"
    if "中文互联网" in loc:
        return "cn"
    return "intl"


def type_key(rtype: str) -> str:
    """将 type 文本映射为 typeKey（clinical / wiki / ngo / academic）。

    匹配顺序：先匹配 clinical 相关词汇，再匹配 academic，再匹配 wiki，
    最后 fallback 为 ngo。
    """
    t = rtype or ""
    # clinical 先匹配（包含"百科；健康"这种会被 wiki 提前吃掉的情况）
    clinical_kw = ["临床", "诊所", "远程医疗", "公营医疗", "医疗教育",
                   "公共卫生", "医疗科普", "减害", "医疗信息", "医疗目录",
                   "医疗专业资源"]
    if any(k in t for k in clinical_kw):
        return "clinical"
    # academic 次优先
    academic_kw = ["研究", "数据", "报告", "地图", "指数", "档案", "工具型；地图"]
    if any(k in t for k in academic_kw):
        return "academic"
    # wiki 第三
    wiki_kw = ["百科", "Wiki", "wiki", "术语库", "入门指南", "知识百科"]
    if any(k in t for k in wiki_kw):
        return "wiki"
    return "ngo"


def parse_row(line: str) -> list[str] | None:
    if not line.startswith("|"):
        return None
    parts = [p.strip() for p in line.strip().strip("|").split("|")]
    if len(parts) < 6:
        return None
    if parts[0] in ("名称", "") or set(parts[0]) <= set(":-"):
        return None
    return parts


def normalize_name(name: str) -> str:
    """用于去重：小写 + 折叠空白 + strip。"""
    return re.sub(r"\s+", " ", (name or "").strip().lower())


SKIP_URL_FRAGMENTS = ("example.com", "lxi.me", "—", "微信")

# ---- 主解析循环 ----
text = SRC_MD.read_text(encoding="utf-8")
current_section = ""
current_sub = ""
seen_urls = set()
seen_names_norm = set()
items = []

lines = text.splitlines()
i = 0
skip_section = False  # 只跳过明确标记为未核验的章节（一、十七、十八等）

while i < len(lines):
    line = lines[i]
    m = section_re.match(line)
    if m:
        current_section = m.group(1)
        # 只跳过真正不应纳入的章节前缀
        skip_section = (
            current_section.startswith("十七")
            or current_section.startswith("十八")
            or current_section.startswith("一、")  # 第一部分：免责声明/说明性内容
        )
        current_sub = ""
        i += 1
        continue
    m = subsection_re.match(line)
    if m:
        current_sub = m.group(1)
        i += 1
        continue
    if skip_section:
        i += 1
        continue
    row = parse_row(line)
    if not row:
        i += 1
        continue
    name, url, tags, rtype, loc, note = row[0], row[1], row[2], row[3], row[4], row[5]

    # 已列 = 在其他章节已收录 → 跳过避免重复
    if "已列" in note:
        i += 1
        continue
    if not url.startswith("http"):
        i += 1
        continue
    if any(x in url for x in SKIP_URL_FRAGMENTS):
        i += 1
        continue

    # URL 去重：strip trailing slash + lower
    url_key = url.rstrip("/").lower()
    # 名称去重：标准化
    name_key = normalize_name(name)
    if url_key in seen_urls or name_key in seen_names_norm:
        i += 1
        continue
    seen_urls.add(url_key)
    seen_names_norm.add(name_key)

    cats = cat_for(current_section, current_sub)
    item = {
        "name": name,
        "url": url,
        "tags": [t.strip() for t in re.split(r"[;；]", tags) if t.strip()],
        "type": rtype,
        "location": loc,
        "note": note,
        "section": current_section,
        "subsection": current_sub,
        "categories": cats,
        "region": region_key(loc),
        "typeKey": type_key(rtype),
    }
    items.append(item)
    i += 1

# ---- 写出 ----
OUT_ROOT.mkdir(parents=True, exist_ok=True)
(OUT_ROOT / "resources.json").write_text(
    json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
)
js = "window.QUEER_RESOURCES = " + json.dumps(items, ensure_ascii=False) + ";\n"
(OUT_ROOT / "resources.js").write_text(js, encoding="utf-8")

from collections import Counter
print(f"✅ parsed {len(items)} unique resources → {OUT_ROOT}")
print("   categories:", dict(Counter(c for it in items for c in it["categories"])))
print("   regions:", dict(Counter(it["region"] for it in items)))
print("   types:", dict(Counter(it["typeKey"] for it in items)))
print("   sections:", dict(Counter(it["section"] for it in items)))
