#!/usr/bin/env python3
"""Build dictation_pool.json: candidate words / short sentences for 聽寫出題.

Sources
  vocab_raw.jsonl (fetch_vocab.py): textbook 語詞 of grades 1-6, all presses;
      "如：「…」" words in 生字 descriptions; "[例]" sentences in 語詞 descriptions.
  src/concised_rows.json (src/xlsx2json.py of 教育部《國語辭典簡編本》): "[例]" sentences.
Only items whose Han characters all belong to the 生字 of kh_g1_114_1 + kh_g1_114_2 + kh_g2_115_1
are kept; the page further restricts to lessons up to the selected one.
Item = [text, kind, quality, 注音(以空白分隔、對應每個漢字)]; kind w=詞語 s=短句; quality 3 課本語詞(1-2年級) 2 課本 1 辭典.
"""
import json, re

LESSON_FILES = ["kh_g1_114_1.json", "kh_g1_114_2.json", "kh_g2_115_1.json"]
PUNCT = "，。！？、"
# 一到十、百：一年級首冊（注音符號）就教，教育雲的課次清單沒有列（2026-09-17 使用者確認算學過）
EXTRA_KNOWN = "一二三四五六七八九十百"
known = {c for f in LESSON_FILES for l in json.load(open(f))["lessons"] for c in l["生字"]} | set(EXTRA_KNOWN)


def ok(t):
    return all(c in known or c in PUNCT for c in t)


items = {}


def add(text, kind, q):
    text = text.strip()
    if not text or not ok(text):
        return
    if text not in items or items[text][1] < q:
        items[text] = (kind, q)


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


for line in open("vocab_raw.jsonl"):
    lesson = json.loads(line)
    for kind, word, desc in lesson["rows"]:
        if kind == "語詞" and 2 <= len(word) <= 5:
            add(word, "w", 3 if lesson["grade"] <= 2 else 2)
        if kind == "生字":
            for w in re.findall(r"「([^」]{2,5})」", desc):
                add(w, "w", 2)
        for s in sentences(desc):
            add(s, "s", 2)

for row in json.load(open("src/concised_rows.json"))[1:]:
    if len(row) > 13:
        for s in sentences(row[13]):
            add(s, "s", 1)

# ---------- 注音：用《國語辭典簡編本》詞條做最少段數切詞，詞內用詞條讀音 ----------
readings = {}  # 詞 -> (多音排序, [每字注音])
for row in json.load(open("src/concised_rows.json"))[1:]:
    word, order, zy = row[0].strip(), row[5].strip() or "0", row[6]
    syl = [x.strip() for x in zy.split("\u3000") if x.strip()]
    if len(syl) != len(word):
        continue
    if word not in readings or int(order) < int(readings[word][0]):
        readings[word] = (order, syl)

# 單字單獨成段時的常用讀音（辭典單字的第一讀音不是句子裡最常見的那個）
SINGLE = {"了": "˙ㄌㄜ", "著": "˙ㄓㄜ", "得": "˙ㄉㄜ", "的": "˙ㄉㄜ", "們": "˙ㄇㄣ",
          "呢": "˙ㄋㄜ", "吧": "˙ㄅㄚ", "嗎": "˙ㄇㄚ", "啊": "˙ㄚ",
          "沒": "ㄇㄟˊ", "還": "ㄏㄞˊ", "都": "ㄉㄡ", "給": "ㄍㄟˇ", "那": "ㄋㄚˋ"}
MAXLEN = max(map(len, readings))


def zhuyin(text):
    h = [c for c in text if c not in PUNCT]
    s = "".join(h)
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


out = []
for t, (k, q) in sorted(items.items(), key=lambda x: (x[1][0], -x[1][1], x[0])):
    zy = zhuyin(t)
    if zy:
        out.append([t, k, q, zy])
# ---------- 生字表的注音：盡量取「這一課教的讀音」 ----------
# 課本原文沒有公開資料，依序用：本課語詞 → 課名 → 虛詞常用讀音 → 字典釋義第一個例詞 → 辭典單字第一讀音。
# char_zhuyin_src.json 記錄每個字用了哪一種來源，方便核對課本。
examples = {}  # (課 id, 生字) -> 「如：」例詞
for line in open("vocab_raw.jsonl"):
    lesson = json.loads(line)
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


char_zy, char_src = {}, {}
for f in LESSON_FILES:
    for lesson in json.load(open(f))["lessons"]:
        got = {ch: char_reading(ch, lesson) for ch in lesson["生字"]}
        char_zy[lesson["id"]] = {ch: r for ch, (r, _) in got.items()}
        char_src[lesson["id"]] = {ch: src for ch, (_, src) in got.items()}
json.dump(char_src, open("char_zhuyin_src.json", "w"), ensure_ascii=False, indent=1)
json.dump(char_zy, open("char_zhuyin.json", "w"), ensure_ascii=False, separators=(",", ":"))

json.dump({"source": "教育部 教育雲 生字詞彙表；教育部《國語辭典簡編本》(CC BY-ND 3.0 TW)",
           "extra_known": EXTRA_KNOWN, "items": out}, open("dictation_pool.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(known), "known chars;", sum(o[1] == "w" for o in out), "words;",
      sum(o[1] == "s" for o in out), "sentences")
