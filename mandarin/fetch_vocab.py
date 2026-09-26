#!/usr/bin/env python3
"""Harvest 生字/語詞 with descriptions from all grades/presses of 教育雲 生字詞彙表.

Output: vocab_raw.jsonl (the last six school years), one lesson per line {year, grade, press, id, title, rows:[[kind, word, desc]]}.
Resumable: lessons already in the file are skipped. Uses curl (Python ssl rejects the site cert).
"""
import html, json, os, re, subprocess, threading, time, urllib.parse
from concurrent.futures import ThreadPoolExecutor

PRESSES = ["康軒版", "南一版", "翰林版"]
OUT = "vocab_raw.jsonl"


def get(url):
    return subprocess.run(["curl", "-s", "-A", "Mozilla/5.0", url], capture_output=True, text=True,
                          encoding="utf-8").stdout


# 最近六個學年度（現在的六年級從一年級起用過的課本），例如 110_1 … 115_1
listed = sorted(set(re.findall(r'class="semesterLink" value="(\d+_[12])"',
                               get("https://pedia.cloud.edu.tw/Bookmark/Textword?category=%E5%9C%8B%E8%AA%9E"))))
newest = max(int(y.split("_")[0]) for y in listed)
YEARS = [y for y in listed if int(y.split("_")[0]) > newest - 6]
print("years:", YEARS, flush=True)


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def lesson_rows(tid):
    for _ in range(3):  # 偶爾會拿到空頁，重試
        page = get(f"https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={tid}")
        rows = re.findall(
            r'<td class="type[^"]*">\s*<span>([^<]+)</span>\s*</td>\s*'
            r'<td class="word_class[^"]*">(?:<a[^>]*>)?([^<]+)(?:</a>)?</td>\s*'
            r'<td class="desc">(.*?)</td>', page, re.S)
        if rows:
            return rows
        time.sleep(2)
    return rows


def lesson_list(year, grade, press):
    q = urllib.parse.urlencode({"category": "國語", "year": year, "degree": grade, "press": press})
    for _ in range(3):
        index = get("https://pedia.cloud.edu.tw/Bookmark/Textword?" + q)
        ids = re.findall(r'<td class="textname[^"]*" id="(\d+)">\s*<strong>([^<]+)</strong>', index)
        if ids:
            break
        time.sleep(2)
    print(year, grade, press, len(ids), flush=True)
    return [(year, grade, press, tid, title) for tid, title in ids]


done = set()
if os.path.exists(OUT):
    done = {json.loads(l)["id"] for l in open(OUT, encoding="utf-8")}
lock = threading.Lock()


def fetch(job):
    year, grade, press, tid, title = job
    rows = lesson_rows(tid)
    line = json.dumps({"year": year, "grade": grade, "press": press, "id": tid, "title": html.unescape(title),
                       "rows": [[k.strip(), html.unescape(w.strip()), text(d)] for k, w, d in rows]},
                      ensure_ascii=False) + "\n"
    with lock:
        f.write(line)
        f.flush()
    time.sleep(0.8)


# 同時 4 個連線：網站每頁要 3-4 秒，一次一頁要抓一個多小時
with ThreadPoolExecutor(4) as ex, open(OUT, "a", encoding="utf-8", newline="\n") as f:
    combos = [(y, g, p) for y in YEARS for g in range(1, 7) for p in PRESSES]
    jobs = [j for js in ex.map(lambda c: lesson_list(*c), combos) for j in js if j[3] not in done]
    print(len(jobs), "lessons to fetch", flush=True)
    list(ex.map(fetch, jobs))
