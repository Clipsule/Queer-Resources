"""Patch index.html: replace old inline script block with <script src="app.js">.

用法: python _patch_html.py
在项目根目录运行即可。找不到标记时仅警告而非报错退出。
"""
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
HTML_PATH = SCRIPT_DIR / "index.html"


def main() -> int:
    if not HTML_PATH.exists():
        print(f"❌ index.html not found at {HTML_PATH}", file=sys.stderr)
        return 1

    t = HTML_PATH.read_text(encoding="utf-8")

    # 1. 移除旧的硬编码条目区域（如果存在）
    start = t.find("<!-- ITEM 1: MtF.wiki -->")
    end = t.find("<!-- Empty State")
    if start >= 0 and end >= 0:
        t = t[:start] + t[end:]
        print("   ✅ removed old inline entries block")
    else:
        print("   ⚠️  old inline entry markers not found (ok if already patched)")

    # 2. 移除旧的 INLINE LOGIC script 块
    old_start = t.find("<!-- ================= INLINE LOGIC")
    if old_start >= 0:
        # 找下一个 <script 或 </body>
        next_script = t.find("<script", old_start + 1)
        body_end = t.rfind("</body>")
        if next_script >= 0 and (body_end < 0 or next_script < body_end):
            t = t[:old_start] + t[next_script:]
            print("   ✅ removed old inline script block")
        else:
            # 没有内联 script → 什么都不做
            print("   ⚠️  old inline script block not found (ok)")
    else:
        print("   ⚠️  old inline script marker not found (ok if already patched)")

    # 3. 确保 </body> 之前有 <script src="app.js"></script>
    body_end = t.rfind("</body>")
    if body_end < 0:
        print("❌ </body> not found in index.html", file=sys.stderr)
        return 1

    # 检查是否已存在
    if '<script src="app.js"></script>' in t:
        print("   ℹ️  <script src=\"app.js\"> already present")
    else:
        t = t[:body_end] + '<script src="app.js"></script>\n' + t[body_end:]
        print("   ✅ inserted <script src=\"app.js\"> before </body>")

    HTML_PATH.write_text(t, encoding="utf-8")
    print(f"✅ patched html, length {len(t)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
