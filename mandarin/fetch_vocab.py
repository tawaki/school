#!/usr/bin/env python3
"""Harvest 生字/語詞 with descriptions from all grades/presses of 教育雲 生字詞彙表.

Output: vocab_raw.jsonl, one lesson per line {year, grade, press, id, title, rows:[[kind, word, desc]]}.
Resumable: lessons already in the file are skipped. Uses curl (Python ssl rejects the site cert).
"""
import html, json, os, re, subprocess, time, urllib.parse

YEARS = ["114_1", "114_2", "115_1"]
PRESSES = ["康軒版", "南一版", "翰林版"]
OUT = "vocab_raw.jsonl"


def get(url):
    return subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", url], capture_output=True, text=True).stdout


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


done = set()
if os.path.exists(OUT):
    done = {json.loads(l)["id"] for l in open(OUT)}
with open(OUT, "a") as f:
    for year in YEARS:
        for grade in range(1, 7):
            for press in PRESSES:
                q = urllib.parse.urlencode({"category": "國語", "year": year, "degree": grade, "press": press})
                index = get("https://pedia.cloud.edu.tw/Bookmark/Textword?" + q)
                ids = re.findall(r'<td class="textname[^"]*" id="(\d+)">\s*<strong>([^<]+)</strong>', index)
                print(year, grade, press, len(ids), flush=True)
                for tid, title in ids:
                    if tid in done:
                        continue
                    page = get(f"https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={tid}")
                    rows = re.findall(
                        r'<td class="type[^"]*">\s*<span>([^<]+)</span>\s*</td>\s*'
                        r'<td class="word_class[^"]*">(?:<a[^>]*>)?([^<]+)(?:</a>)?</td>\s*'
                        r'<td class="desc">(.*?)</td>', page, re.S)
                    f.write(json.dumps({"year": year, "grade": grade, "press": press, "id": tid,
                                        "title": html.unescape(title),
                                        "rows": [[k.strip(), html.unescape(w.strip()), text(d)] for k, w, d in rows]},
                                       ensure_ascii=False) + "\n")
                    f.flush()
                    done.add(tid)
                    time.sleep(0.8)
