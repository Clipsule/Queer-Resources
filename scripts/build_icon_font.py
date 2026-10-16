"""
构建自托管的 Material Symbols Outlined 图标子集字体（assets/fonts/material-symbols-outlined.woff2）

用途:
    1. 从完整字体 (Google Fonts Material Symbols Outlined, 可变字体) 中
       提取本网站用到的图标连字 (ligature) 字形与对应 ASCII 字母。
    2. 重建最小 GSUB 'liga' 表，使 HTML 中 <span class="material-symbols-outlined">home</span>
       这类连字文本继续正常渲染。
    3. 输出 woff2（约 11KB，相比完整字体 1.1MB 大幅减小，且不受 Google Fonts 被墙影响）。

用法:
    python scripts/build_icon_font.py <完整字体 woff2 路径>
    # 完整字体下载（Chrome UA 访问）:
    #   https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block
    #   取 CSS 中 fonts.gstatic.com 的 woff2 链接

依赖:
    pip install fonttools brotli

新增图标:
    把连字名（如 "home"）加进下方 ICONS 列表后重新运行即可。
"""

import json
import os
import sys
import tempfile
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

ICONS = [
    "add", "arrow_back", "arrow_forward", "close", "code_blocks", "dark_mode",
    "edit_note", "emergency_home", "explore", "favorite", "filter_alt", "handshake",
    "help", "home", "info", "language", "light_mode", "list", "local_fire_department",
    "mail", "phone_in_talk", "public", "refresh", "remove", "search", "search_off",
    "security", "sort", "sos", "terminal", "translate", "verified", "warning",
    "workspace_premium",
]

LETTER_GLYPH = {"_": "underscore"}

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "fonts", "material-symbols-outlined.woff2")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    full_path = sys.argv[1]

    font = TTFont(full_path)
    rev_cmap = {}
    for table in font["cmap"].tables:
        if table.isUnicode():
            for cp, gname in table.cmap.items():
                rev_cmap.setdefault(gname, cp)

    # 1) 从原始 GSUB 解析 ligature 名称 -> 目标字形名
    lig_map = {}
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            if lookup.LookupType == 7:
                ext = sub.ExtSubTable
                if ext.LookupType == 4:
                    for first_name, ligs in ext.ligatures.items():
                        first_cp = rev_cmap.get(first_name)
                        if first_cp is None or not 0 < first_cp < 127:
                            continue
                        first_char = chr(first_cp)
                        for lig in ligs:
                            cps = [rev_cmap.get(g) for g in lig.Component]
                            if all(cp is not None and 0 < cp < 127 for cp in cps):
                                full = first_char + "".join(chr(cp) for cp in cps)
                                lig_map[full] = lig.LigGlyph

    missing = [n for n in ICONS if n not in lig_map]
    if missing:
        print("以下连字在完整字体中不存在:", missing)
        sys.exit(1)

    # 2) 子集：只保留字母与目标图标字形，丢弃原有 GSUB/GPOS
    used_letters = sorted(set("".join(ICONS)))
    letter_glyphs = [LETTER_GLYPH.get(c, c) for c in used_letters]
    targets = [lig_map[n] for n in ICONS]

    opts = subset.Options()
    opts.glyph_names = True
    opts.layout_features = []
    opts.drop_tables += ["GSUB", "GPOS", "GDEF", "meta", "DSIG"]
    opts.desubroutinize = True
    opts.recalc_bounds = True
    opts.recalc_timestamp = False
    opts.notdef_outline = True
    opts.hinting = False

    ss = subset.Subsetter(options=opts)
    ss.populate(unicodes=[ord(c) for c in used_letters],
                glyphs=letter_glyphs + targets)
    ss.subset(font)

    # 3) 重建最小 'liga' 连字表
    fea_lines = ["feature liga {"]
    for name in ICONS:
        comps = [LETTER_GLYPH.get(c, c) for c in name]
        fea_lines.append("  sub {} by {};".format(" ".join(comps), lig_map[name]))
    fea_lines.append("} liga;")
    addOpenTypeFeaturesFromString(font, "\n".join(fea_lines) + "\n")

    font.flavor = "woff2"
    font.save(OUT)
    print("已生成:", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
