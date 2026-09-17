#!/usr/bin/env python3
"""Build lessons.json + dictation_pool.json for the 國語生字練習 page (康軒版 一到六年級).

Sources
  vocab_raw.jsonl (fetch_vocab.py): 生字/語詞 of grades 1-6, all presses, years 114_1 114_2 115_1,
      with descriptions ("如：「…」" words, "[例]" sentences).
  src/concised_rows.json (src/xlsx2json.py of 教育部《國語辭典簡編本》): 注音 and "[例]" sentences.

lessons.json: volumes 一上 … 六下 (康軒, newest year on 教育雲: 上=115_1, 下=114_2), each lesson with 生字 and
  the 注音 taught in that lesson (best guess, see char_reading), plus first[字] = global lesson index where the
  character is first taught.
dictation_pool.json items = [text, kind, quality, 注音, level, grade]
  kind w=詞語 s=短句; quality 3 課本語詞 2 課本例句/字典例詞 1 辭典例句;
  level = global lesson index after which every character is known; grade = textbook grade of the source (0 = 辭典).
"""
import json, re

PRESS = "康軒版"
VOLUMES = [(g, sem, "115_1" if sem == "上" else "114_2") for g in range(1, 7) for sem in ("上", "下")]
PUNCT = "，。！？、"
# 一到十、百：一年級首冊（注音符號）就教，教育雲的課次清單沒有列（2026-09-17 使用者確認算學過）
EXTRA_KNOWN = "一二三四五六七八九十百"

raw = [json.loads(line) for line in open("vocab_raw.jsonl")]

# ---------- 課次與每個字第一次教的位置 ----------
volumes, first, order = [], {c: -1 for c in EXTRA_KNOWN}, 0
for grade, sem, year in VOLUMES:
    lessons = []
    for lesson in (l for l in raw if l["press"] == PRESS and l["grade"] == grade and l["year"] == year):
        rows = lesson["rows"]
        chars = [w for k, w, _ in rows if k == "生字"]
        for c in chars:
            first.setdefault(c, order)
        lessons.append({"id": lesson["id"], "title": lesson["title"], "i": order, "生字": chars,
                        "語詞": [w for k, w, _ in rows if k == "語詞"]})
        order += 1
    volumes.append({"grade": grade, "sem": sem, "year": year, "lessons": lessons})


def level(text):
    lv = -1
    for c in text:
        if c in PUNCT:
            continue
        if c not in first:
            return None
        lv = max(lv, first[c])
    return lv


# ---------- 候選詞句 ----------
items = {}  # text -> [kind, quality, grade]


def add(text, kind, q, grade):
    text = text.strip()
    if not text or level(text) is None:
        return
    old = items.get(text)
    if old is None or (q, -grade) > (old[1], -old[2]):
        items[text] = [kind, q, grade]


# 分句若以連接詞開頭或含前半句的關聯詞，單獨念出來不完整
DANGLING = re.compile(r"^(就|但|而|卻|也|才|還|又|並|所以|因此|可是|然後|只好|於是)|雖|因為|如果|只要|即使|不但|除了|為了|當|等到|每當|一邊|(後|時|中|來|因.*)$")


def sentences(desc):
    """[例] 裡的整句（4-14 字），以及長句中用逗號切出的分句（5-10 字）。"""
    for block in re.findall(r"\[例\]([^\[]*)", desc):
        for s in re.findall(r"[^。！？]+[。！？]", block):
            s = s.strip("｜| ")
            if "「" in s or "『" in s or "、" in s:
                continue
            n = sum(c not in PUNCT for c in s)
            if 4 <= n <= 14:
                yield s
            for clause in re.split(r"[，、；：。！？]", s):
                if 5 <= len(clause) <= 10 and len(clause) < n and not DANGLING.search(clause):
                    yield clause


for lesson in raw:
    g = lesson["grade"]
    for kind, word, desc in lesson["rows"]:
        if kind == "語詞" and 2 <= len(word) <= 5:
            add(word, "w", 3, g)
        if kind == "生字":
            for w in re.findall(r"「([^」]{2,5})」", desc):
                add(w, "w", 2, g)
        for s in sentences(desc):
            add(s, "s", 2, g)

concised = json.load(open("src/concised_rows.json"))[1:]
for row in concised:
    if len(row) > 13:
        for s in sentences(row[13]):
            add(s, "s", 1, 0)

# ---------- 注音：用《國語辭典簡編本》詞條做最少段數切詞，詞內用詞條讀音 ----------
readings = {}  # 詞 -> (多音排序, [每字注音])
for row in concised:
    word, rank, zy = row[0].strip(), row[5].strip() or "0", row[6]
    syl = [x.strip() for x in zy.split("　") if x.strip()]
    if len(syl) != len(word):
        continue
    if word not in readings or int(rank) < int(readings[word][0]):
        readings[word] = (rank, syl)

# 單字單獨成段時的常用讀音（辭典單字的第一讀音不是句子裡最常見的那個）
SINGLE = {"了": "˙ㄌㄜ", "著": "˙ㄓㄜ", "得": "˙ㄉㄜ", "的": "˙ㄉㄜ", "們": "˙ㄇㄣ",
          "呢": "˙ㄋㄜ", "吧": "˙ㄅㄚ", "嗎": "˙ㄇㄚ", "啊": "˙ㄚ",
          "沒": "ㄇㄟˊ", "還": "ㄏㄞˊ", "都": "ㄉㄡ", "給": "ㄍㄟˇ", "那": "ㄋㄚˋ"}
MAXLEN = max(map(len, readings))


def zhuyin(text):
    s = "".join(c for c in text if c not in PUNCT)
    n = len(s)
    best = [(0, 0)] + [(10 ** 9, 0)] * n  # (段數, 上一個切點)
    for i in range(1, n + 1):
        for L in range(1, min(MAXLEN, i) + 1):
            w = s[i - L:i]
            if w in readings and best[i - L][0] + 1 < best[i][0]:
                best[i] = (best[i - L][0] + 1, i - L)
    if best[n][0] >= 10 ** 9:
        return None
    segs, i = [], n
    while i > 0:
        j = best[i][1]
        segs.append(s[j:i])
        i = j
    out = []
    for w in reversed(segs):
        pos = len(out)
        if len(w) == 1 and w in SINGLE:
            out.append(SINGLE[w])
        elif w == "長" and s[pos + 1:pos + 2] in ("得", "大", "高"):
            out.append("ㄓㄤˇ")  # 長得、長大、長高
        elif w == "地" and pos >= 2 and s[pos - 1] == s[pos - 2]:
            out.append("˙ㄉㄜ")  # 慢慢地
        else:
            out.extend(readings[w][1])
    return " ".join(out)


pool = []
for t, (k, q, g) in sorted(items.items(), key=lambda x: (level(x[0]), x[1][0], -x[1][1], x[0])):
    zy = zhuyin(t)
    if zy:
        pool.append([t, k, q, zy, level(t), g])

# ---------- 生字表的注音：盡量取「這一課教的讀音」 ----------
# 課本原文沒有公開資料，依序用：本課語詞 → 課名 → 虛詞常用讀音 → 字典釋義第一個例詞 → 辭典單字第一讀音。
# char_zhuyin_src.json 記錄每個字用了哪一種來源，方便核對課本。
examples = {}  # (課 id, 生字) -> 「如：」例詞
for lesson in raw:
    for kind, word, desc in lesson["rows"]:
        if kind == "生字":
            examples[(lesson["id"], word)] = re.findall(r"「([^」]{2,5})」", desc)


def reading_in(ch, words):
    for w in words:
        w = "".join(c for c in w if c not in PUNCT)
        if ch in w and all(c in readings for c in w):
            zy = zhuyin(w)
            if zy:
                return zy.split(" ")[w.index(ch)], w
    return None


def char_reading(ch, lesson):
    title = lesson["title"].split("：", 1)[-1]
    found = reading_in(ch, lesson["語詞"])
    if found:
        return found[0], "語詞：" + found[1]
    found = reading_in(ch, [title])
    if found:
        return found[0], "課名：" + found[1]
    if ch in SINGLE:
        return SINGLE[ch], "虛詞"
    found = reading_in(ch, examples.get((lesson["id"], ch), []))
    if found:
        return found[0], "字典例詞：" + found[1]
    return (readings[ch][1][0] if ch in readings else ""), "單字第一讀音"


char_src = {}
for vol in volumes:
    for lesson in vol["lessons"]:
        got = [char_reading(ch, lesson) for ch in lesson["生字"]]
        lesson["注音"] = [r for r, _ in got]
        char_src[lesson["title"] + " " + lesson["id"]] = {ch: src for ch, (_, src) in zip(lesson["生字"], got)}
        del lesson["語詞"]
json.dump(char_src, open("char_zhuyin_src.json", "w"), ensure_ascii=False, indent=1)

SOURCE = "教育部 教育雲 生字詞彙表；教育部《國語辭典簡編本》(CC BY-ND 3.0 TW)"
json.dump({"source": SOURCE, "press": PRESS, "extra_known": EXTRA_KNOWN, "volumes": volumes,
           "first": first}, open("lessons.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"source": SOURCE, "items": pool}, open("dictation_pool.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(order, "lessons;", len(first), "chars;", sum(p[1] == "w" for p in pool), "words;",
      sum(p[1] == "s" for p in pool), "sentences")
