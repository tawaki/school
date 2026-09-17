#!/usr/bin/env python3
"""Fetch per-lesson 生字/認讀字/語詞 from 教育部 教育雲 生字詞彙表 (pedia.cloud.edu.tw).

Usage: python3 fetch_pedia.py 115_1 2 康軒版   -> kh_g2_115_1.json style output
Uses curl because Python's ssl rejects the site's certificate chain.
"""
import html, json, re, subprocess, sys, time, urllib.parse

year, grade, press = sys.argv[1], sys.argv[2], sys.argv[3]
out = sys.argv[4] if len(sys.argv) > 4 else f"g{grade}_{year}_{press}.json"


def get(url):
    return subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", url],
                          capture_output=True, text=True).stdout


q = urllib.parse.urlencode({"category": "國語", "year": year, "degree": grade, "press": press})
index = get("https://pedia.cloud.edu.tw/Bookmark/Textword?" + q)
ids = re.findall(r'<td class="textname[^"]*" id="(\d+)">\s*<strong>([^<]+)</strong>', index)

lessons = []
for tid, title in ids:
    page = get(f"https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={tid}")
    rows = re.findall(
        r'<td class="type[^"]*">\s*<span>([^<]+)</span>\s*</td>\s*'
        r'<td class="word_class[^"]*">(?:<a[^>]*>)?([^<]+)(?:</a>)?</td>\s*'
        r'<td class="desc">(.*?)</td>', page, re.S)
    lesson = {"id": tid, "title": html.unescape(title), "生字": [], "認讀字": [], "語詞": []}
    for kind, word, _desc in rows:
        lesson.setdefault(kind.strip(), []).append(html.unescape(word.strip()))
    lessons.append(lesson)
    time.sleep(0.8)

json.dump({"source": "教育部 教育雲 生字詞彙表 (pedia.cloud.edu.tw)", "year": year,
           "grade": int(grade), "press": press, "lessons": lessons},
          open(out, "w"), ensure_ascii=False, indent=1)
print(f"{len(lessons)} lessons -> {out}")
