# 國語生字練習（康軒、南一、翰林版 一到六年級）

網頁：<https://tawaki.github.io/school/mandarin/>

- 生字表：選版本、年級、學期、課次（可多選），顯示生字與注音。
  學校各年級用的版本不同時，勾「各年級版本不同」分別設定；網址也可以用 `?p=康軒,康軒,南一,南一,南一,南一` 指定。
- 聽寫出題：從一年級到所選課次學過的生字（依所選版本的課次順序）組成不重複的詞語／短句，每題至少包含一個所選課次的新字，附注音給家長念。

## 資料來源
- 教育部 教育雲「生字詞彙表」<https://pedia.cloud.edu.tw/>：各課生字、語詞、例句。
- 教育部《國語辭典簡編本》、《成語典》，採「創用CC 姓名標示-禁止改作 3.0 臺灣」授權：注音、例句、成語。

資料由教育部整理，不是課本原件；注音是依詞語推得，破音字可能與課本不同。
課本每隔幾年會改版。教育雲有各學年度的資料，這裡收最近六個學年度：把所選的年級當成孩子今年讀的年級，往回推每一冊是哪一年讀的（例如今年三年級：一年級用前兩年、二年級用去年的課本），那一年還沒有資料就用最接近的前一年。

## 重建資料
```
python3 fetch_vocab.py                                   # 最近六個學年度、一到六年級各版本生字、語詞 -> vocab_raw.jsonl
python3 src/xlsx2json.py <dict_concised_*.xlsx> src/concised_rows.json
python3 src/xlsx2json.py <dict_idioms_*.xlsx> src/idioms_rows.json
python3 build_dictation.py                               # -> data/<版本>/lessons.json, data/pool_00.json … pool_11.json（題庫各版本共用，一冊一檔）
```
簡編本、成語典 xlsx 從 <https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html> 下載。

版本資料夾：`data/kangxuan`（康軒）、`data/nanyi`（南一）、`data/hanlin`（翰林）。
