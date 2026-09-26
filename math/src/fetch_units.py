# SPDX-License-Identifier: GPL-3.0-or-later
"""抓均一教育平台「類康軒／類南一／類翰林版」一到六年級數學的單元與小節 -> src/units_raw.json

每個網頁是一個年級（上、下兩冊），單元標題的格式是「【二上】第一單元 200 以內的數」。
"""
import json
import re
import time
import urllib.request
from pathlib import Path

PRESSES = {"kangxuan": "k", "nanyi": "n", "hanlin": "h"}
URL = "https://www.junyiacademy.org/course-compare/math-{g}/{p}-m{g}a"
OUT = Path(__file__).with_name("units_raw.json")
CN = "一二三四五六"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    queries = json.loads(m.group(1))["props"]["pageProps"]["dehydratedState"]["queries"]
    return next(q["state"]["data"] for q in queries if q["queryKey"][0] == "topicWithContentChildren")


def main():
    out = {"source": "均一教育平台 課程對照 https://www.junyiacademy.org/course-compare/", "fetched": time.strftime("%Y-%m-%d"), "presses": {}}
    for press, p in PRESSES.items():
        vols = {}
        for g in range(1, 7):
            data = fetch(URL.format(g=g, p=p))
            for ch in data["children"]:
                m = re.match(r"【([一二三四五六])([上下])】\s*(.+)$", ch["title"])
                if not m:
                    print("略過（不是單元）:", press, g, ch["title"])
                    continue
                assert CN.index(m.group(1)) + 1 == g, ch["title"]
                vols.setdefault(f"{g}{m.group(2)}", []).append({
                    "id": ch["id"],
                    "title": m.group(3).strip(),
                    "sections": [c["title"] for c in ch.get("children", [])],
                })
            print(press, g, "ok")
            time.sleep(1)
        out["presses"][press] = vols
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("->", OUT)


if __name__ == "__main__":
    main()
