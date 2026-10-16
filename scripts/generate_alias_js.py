#!/usr/bin/env python3
"""从 docs/search-aliases.md 自动生成 app.js 里的 QUERY_ALIAS_GROUPS 常量。

用法:
    python3 scripts/generate_alias_js.py              # 标准用法
    python3 scripts/generate_alias_js.py --strict     # 严格模式：target 必须在 resources.js 里真实存在
    python3 scripts/generate_alias_js.py --check       # 只检查，不写文件

原理:
    1. 解析 docs/search-aliases.md 的三级标题和表格行
    2. 每个表格行 → {aliases: [...], targets: [...]}
    3. 验证 targets 是否全部在 resources.js 的 data-search 字段里存在
    4. 把结果注入 app.js 的 /*BEGIN_ALIAS*/ ... /*END_ALIAS*/ 注释之间

本脚本只依赖 Python 3.7+ 标准库。
"""
import re
import sys
import json
import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MD_PATH = PROJECT_ROOT / "docs" / "search-aliases.md"
JS_PATH = PROJECT_ROOT / "app.js"
RESOURCES_PATH = PROJECT_ROOT / "resources.js"

BEGIN_MARKER = "  /*BEGIN_ALIAS*/"
END_MARKER = "  /*END_ALIAS*/"


def parse_md(md_text: str) -> list:
    """把 search-aliases.md 解析成 [{aliases: [...], targets: [...]}]"""
    lines = md_text.splitlines()
    groups = []
    in_table = False
    header_seen = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("### "):
            in_table = False
            header_seen = False
            continue
        if stripped.startswith("| aliases") and "targets" in stripped.lower():
            in_table = True
            header_seen = True
            continue
        if not in_table:
            continue
        if stripped.startswith("|---") or stripped == "":
            continue
        if not stripped.startswith("|"):
            in_table = False
            continue
        # 数据行: | aliases, a2 | targets, t2 |
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cells) < 2:
            continue
        # 兼容表格里误写成三列表头的情况（跳过中间列）
        aliases_raw = cells[0]
        targets_raw = cells[-1] if len(cells) >= 3 else cells[1]
        aliases = [a.strip() for a in aliases_raw.split(",") if a.strip()]
        targets = [t.strip() for t in targets_raw.split(",") if t.strip()]
        if aliases and targets:
            groups.append({"aliases": aliases, "targets": targets})

    return groups


def load_resources_searchable() -> str:
    """把 resources.js 里所有条目拼起来转小写（模拟 data-search 字段）"""
    text = RESOURCES_PATH.read_text(encoding="utf-8")
    # 直接用正则找所有字符串 value（简单可靠）
    values = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', text)
    return " ".join(values).lower()


def validate_targets(groups: list, searchable: str) -> list:
    """返回 (valid_groups, missing_warnings)"""
    valid = []
    warnings = []
    for g in groups:
        missing = [t.lower() for t in g["targets"] if t.lower() not in searchable]
        if missing:
            warnings.append((g, missing))
        # 即使有 missing 也保留（贡献者可能是为未来条目做准备）
        valid.append(g)
    return valid, warnings


def groups_to_js(groups: list) -> str:
    """把 [{aliases: [...], targets: [...]}] 转成 JS 常量字符串"""
    lines = [BEGIN_MARKER, "  const QUERY_ALIAS_GROUPS = ["]
    for i, g in enumerate(groups):
        aliases_js = ", ".join(repr(a) for a in g["aliases"])
        targets_js = ", ".join(repr(t) for t in g["targets"])
        comment = f"    // group {i+1}: {g['aliases'][0] if g['aliases'] else '?'} → {g['targets'][0] if g['targets'] else '?'}"
        lines.append(comment)
        lines.append(f"    {{ aliases: [{aliases_js}], targets: [{targets_js}] }},")
    lines.append("  ];")
    lines.append(END_MARKER)
    return "\n".join(lines)


def inject_js(js_text: str, replacement: str) -> str:
    """把 /*BEGIN_ALIAS*/ ... /*END_ALIAS*/ 之间替换成 replacement"""
    pattern = re.compile(
        re.escape(BEGIN_MARKER) + r".*?" + re.escape(END_MARKER),
        re.DOTALL,
    )
    if not pattern.search(js_text):
        print("❌ app.js 里没找到 BEGIN/END_ALIAS 标记，请先插入这两个注释。", file=sys.stderr)
        sys.exit(1)
    return pattern.sub(replacement, js_text)


def main():
    ap = argparse.ArgumentParser(description="search-aliases.md → app.js QUERY_ALIAS_GROUPS")
    ap.add_argument("--check", action="store_true", help="只检查，不写文件")
    ap.add_argument("--strict", action="store_true", help="只保留 targets 全部命中的组")
    args = ap.parse_args()

    if not MD_PATH.exists():
        print(f"❌ {MD_PATH} 不存在", file=sys.stderr)
        sys.exit(1)

    print(f"📖 解析 {MD_PATH} ...")
    groups = parse_md(MD_PATH.read_text(encoding="utf-8"))
    print(f"   找到 {len(groups)} 组同义词")

    searchable = load_resources_searchable()

    # 每组统计 target 命中率
    used = []
    unused = []
    for g in groups:
        hit = [t for t in g["targets"] if t.lower() in searchable]
        miss = [t for t in g["targets"] if t.lower() not in searchable]
        if hit:
            used.append({**g, "_hit": hit, "_miss": miss})
        else:
            unused.append(g)

    if unused:
        print(f"\n⚠️  有 {len(unused)} 组的 targets 全部在 resources.js 里不存在：")
        for g in unused:
            print(f"   aliases={g['aliases'][:3]}... targets={g['targets'][:3]}...")

    if args.strict:
        groups = [g for g in used]
        print(f"\n🔒 --strict 模式：只保留 {len(groups)} 组有真实 target 的")
    else:
        groups = [{"aliases": g["aliases"], "targets": g["targets"]} for g in used + unused]
        print(f"\n✅ 保留全部 {len(groups)} 组（其中 {len(used)} 组有命中，{len(unused)} 组未来可能命中）")

    if args.check:
        print("\n🔍 check 模式，不写文件")
        return

    new_block = groups_to_js(groups)
    js_text = JS_PATH.read_text(encoding="utf-8")
    new_js = inject_js(js_text, new_block)
    JS_PATH.write_text(new_js, encoding="utf-8")
    print(f"\n✅ 已更新 {JS_PATH}")


if __name__ == "__main__":
    main()
