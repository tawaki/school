# 國語生字練習（康軒版 一到六年級）

網頁：<https://tawaki.github.io/school/mandarin/>

- 生字表：選年級、學期、課次（可多選），顯示生字與注音。
- 聽寫出題：從一年級到所選課次學過的生字組成不重複的詞語／短句，每題至少包含一個所選課次的新字，附注音給家長念。

## 資料來源
- 教育部 教育雲「生字詞彙表」<https://pedia.cloud.edu.tw/>：各課生字、語詞、例句。
- 教育部《國語辭典簡編本》，採「創用CC 姓名標示-禁止改作 3.0 臺灣」授權：注音、例句。

資料由教育部整理，不是課本原件；注音是依詞語推得，破音字可能與課本不同。
各冊用教育雲上最新的康軒版：上學期 115 學年度、下學期 114 學年度。

## 重建資料
```
python3 fetch_vocab.py                                   # 一到六年級各版本生字、語詞 -> vocab_raw.jsonl
python3 src/xlsx2json.py <dict_concised_*.xlsx> src/concised_rows.json
python3 build_dictation.py                               # -> lessons.json, dictation_pool.json
```
簡編本 xlsx 從 <https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/dict_concised_download.html> 下載。
