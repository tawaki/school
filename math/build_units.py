# SPDX-License-Identifier: GPL-3.0-or-later
"""src/units_raw.json（均一的單元與小節）-> units.json（每個單元可以出哪些題型）

對應規則依小節名稱（有些要看單元名稱或年級）判斷；題型 id 定義在 skills.js。
沒有對應到題型的單元（例如比長短、做造型、繪製圖形）在網頁上顯示「這個單元不出題」。
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
PRESS_NAME = {"kangxuan": "康軒", "nanyi": "南一", "hanlin": "翰林"}
CN = {c: i + 1 for i, c in enumerate("一二三四五六七八九十")}

# (小節 regex, 單元 regex 或 None, 年級範圍 或 None, 題型)
# 同一小節可以對到好幾條規則，全部合起來。
R = [
    # ---- 數與位值 ----
    (r"認識 ?1～5|認識 ?6～10|1～5 的數|6～10 的數|點數與對應", None, None, ["v_count:10", "count_on:10"]),
    (r"表示數量", r"10|數到 10", None, ["v_count:10"]),
    (r"表示數量", r"30|數到 30", None, ["v_count:30"]),
    (r"表示數量", r"50|100", None, ["v_count:50"]),
    (r"認識 0|0 的認識", None, (1, 1), ["count_on:10"]),
    (r"數到 (20|30)(?!\d)|11～20|21～30", None, None, ["v_count:30", "count_on:30"]),
    (r"排數字|排在第幾個|第幾個|序數|數的順序|排順序", None, (1, 1), ["count_on:{max}"]),
    (r"比多少", None, (1, 1), ["compare_num:{max}", "word_diff:10"]),
    (r"比大小|大小比較|數的比較", r"的數|數到|以內", None, ["compare_num:{max}"]),
    (r"數到 (50|100)(?!\d)|往上數|往下數|百數表|認識 100 以內", None, None, ["count_on:100"]),
    (r"2 個、5 個、10 個一數|5 個、10 個一數", None, None, ["skip_count:2,5,10"]),
    (r"個位和十位|十位和個位", None, None, ["v_blocks:100", "place_value:100"]),
    (r"數到 (200|300)(?!\d)|認識 300", None, None, ["count_on:1000", "place_value:1000", "v_blocks:1000"]),
    (r"幾個百、幾個十、幾個一|認識百位", None, None, ["place_value:1000", "v_blocks:1000"]),
    (r"數到 1000(?!\d)|認識 1000 以內", None, None, ["count_on:1000", "place_value:1000"]),
    (r"數到 10000|10000 以內的數|千位|位值換算", None, None, ["place_value:10000", "count_on:10000"]),
    (r"整數數線|^\d-\d 認識數線|^\d-\d 數線", None, None, ["v_numline:1,10,100"]),
    (r"十萬以內|一億以內|億以內的數", None, None, ["place_value:100000000", "bignum"]),
    (r"大數的加減|大數的大小比較與加減", None, None, ["add:big", "sub:big", "compare_num:100000000"]),
    (r"億以上|十進位結構", None, None, ["bignum:big", "dec_struct"]),
    (r"大數的計算|大數的乘與除", None, None, ["mul_tens", "div_tens"]),
    (r"奇數|偶數|奇偶", None, None, ["odd_even"]),
    # ---- 錢 ----
    (r"錢幣|付錢|有多少元|幾元|買東西|\d+ 元", None, (1, 1), ["v_coins:100"]),
    (r"錢幣|付錢", None, (2, 2), ["v_coins:1000"]),
    (r"錢幣", None, (3, 3), ["v_coins:10000"]),
    # ---- 加減 ----
    (r"合起來|加法算式|0 的加法|加加看|加法練習|10 以內的加法|4＋5|加一加", r"10 以內的加法|加一加", None, ["add:10"]),
    (r"剩下|減法算式|0 的減法|減減看|減法練習|10 以內的減法|減法心算", r"10 以內的減法|減一減", None, ["sub:10"]),
    (r"加加減減|加一加，減一減|加、減法應用|多多少", r"10 以內|減一減", None, ["add:10", "sub:10", "word_diff:10"]),
    (r"分一分|合一合|分分看|合起來|分與合", r"分與合", None, ["split:10"]),
    (r"基本加法|熟練加法心算|7＋8|5＋6|加法算式的規律", None, (1, 1), ["add:18"]),
    (r"基本減法|熟練減法心算|減法算式的規律|減法心算卡|比比看|用加法計算或減法計算|加加減減", r"(18|20) 以內的減法", None, ["sub:18"]),
    (r"加法計算|二位數的加法|兩位數的加法|加法和減法的關係|加一加，減一減", r"二位數的加減|兩位數的加減", (1, 1), ["add:2d"]),
    (r"減法計算|二位數的減法|兩位數的減法|加法和減法的關係|加一加，減一減", r"二位數的加減|兩位數的加減", (1, 1), ["sub:2d"]),
    (r"加法直式|加法的直式|二位數的加法", None, (2, 2), ["add:2d"]),
    (r"減法直式|減法的直式|二位數的減法", None, (2, 2), ["sub:2d"]),
    (r"加加減減|加、減法的應用", r"二位數", (2, 2), ["add:2d", "sub:2d"]),
    (r"等於、大於和小於|大於、小於和等於", None, None, ["cmp_expr"]),
    (r"加減關係|加法和減法的關係|驗算|解題", r"加減", (2, 2), ["inverse_add:100"]),
    (r"加減應用問題|加減應用", r"加減關係|加減的關係|加減應用", (2, 2), ["word_diff:100"]),
    (r"兩步驟的加|兩步驟的減|加法兩步驟|減法兩步驟|加減兩步驟", None, None, ["twostep_as:100"]),
    (r"三位數的加法|三位數加法", None, (2, 2), ["add:3d"]),
    (r"三位數的減法|三位數減法", None, (2, 2), ["sub:3d"]),
    (r"加減應用|比較與加減", r"三位數|加加減減", (2, 2), ["add:3d", "sub:3d"]),
    (r"估算", r"加減|加加減減", None, ["add_est"]),
    (r"三、四位數的加法|10000 以內的加法", None, None, ["add:4d"]),
    (r"三位數的減法|四位數的減法|三、四位數的減法|10000 以內的減法", None, (3, 3), ["sub:4d"]),
    (r"加減應用|加與減", r"四位數|10000", (3, 3), ["add:4d", "sub:4d"]),
    # ---- 乘法 ----
    (r"2 的乘法|2 和 5 的乘法|5 的乘法|4 的乘法|8 的乘法", None, None, ["mul:2,5,4,8"]),
    (r"「倍」的問題|幾的幾倍", None, (2, 2), ["times_word:2,5,4,8"]),
    (r"3 的乘法|6 的乘法|7 的乘法|9 的乘法", None, None, ["mul:3,6,9,7"]),
    (r"乘法的應用|擬題活動", r"3、6|乘法 \(二\)", None, ["times_word:3,6,9,7", "mul:2,3,4,5,6,7,8,9"]),
    (r"乘法的應用", r"2、5|乘法 \(一\)", None, ["times_word:2,5,4,8"]),
    (r"10 的乘法|1、0 的乘法|0 和 ?1 的乘法|10、1 和 0 的乘法|十十乘法表", None, None, ["mul:0,1,10"]),
    (r"乘法的關係", None, (2, 2), ["mul_rel", "mul:2,3,4,5,6,7,8,9"]),
    (r"十幾乘以 2 或 3", None, None, ["mul21:teen"]),
    (r"先乘再加|先乘再減|先加再乘|先減再乘|乘、加|乘、減|加、乘|減、乘|乘加|乘減|加乘|減乘", None, (2, 2), ["muladd"]),
    (r"分裝|平分|分裝活動|平分活動|認識平分", r"分分看|分東西|分裝與平分", None, ["share"]),
    (r"二位數乘以一位數", None, None, ["mul21"]),
    (r"三位數乘以一位數", None, None, ["mul31"]),
    (r"乘法估算|乘法的估算", None, None, ["mul_est"]),
    (r"連乘|兩步驟的乘法|乘法兩步驟", None, None, ["mulchain"]),
    (r"倍的計算", None, None, ["times_word", "mulchain"]),
    (r"四位數×一位數|四位數乘以一位數", None, None, ["mul41"]),
    (r"一、二位數×二位數|一位數、二位數乘以二位數|乘以一、二位數", None, None, ["mul22"]),
    (r"三、四位數×二位數|三、四位數乘以二位數", None, None, ["mul32"]),
    (r"乘以三位數|三、四位數 × 三位數|多位數的乘法|1-1 乘數是一位數", None, None, ["mul33"]),
    (r"乘法算式的規律|末幾位為 0 的乘法|末位是0的乘法", None, None, ["mul_tens"]),
    # ---- 除法 ----
    (r"除法算式（整除）|認識除法|分裝與除|平分與除|0 和 1 的除法", None, None, ["div", "share"]),
    (r"認識餘數|除法應用|餘數的應用", None, None, ["divr", "share:rem"]),
    (r"除法直式|直式除法|除法與直式", None, (3, 3), ["divr", "div21"]),
    (r"二位數除以一位數", None, None, ["div21"]),
    (r"三位數除以一位數|除法的估算", None, None, ["div31"]),
    (r"加與除|減與除|加、除|減、除|加減與除法", None, None, ["adddiv"]),
    (r"乘與除的關係|乘除關係|乘法和除法的關係|未知|驗算", r"乘|除", (3, 3), ["inverse_mul"]),
    (r"乘與除的應用", None, None, ["inverse_mul", "share:rem"]),
    (r"四位數 ÷ 一位數|四位數除以一位數|除以一位數", None, (4, 4), ["div41"]),
    (r"二位數 ÷ 二位數|三位數 ÷ 二位數|二位數除以二位數|三位數除以二位數|除以二位數", None, (4, 4), ["div22"]),
    (r"四位數÷二位數|除以三位數|三、四位數 ÷ 三位數|多位數的除法", None, None, ["div42"]),
    (r"多個0的除法|末幾位為 0 的除法|末位是0的除法", None, None, ["div_tens"]),
    # ---- 四則 ----
    (r"併式|四則混合|四則計算|先乘除後加減|由左而右|有括號|列式與逐步求解|加與減|乘除與加減|乘與除|四則運算的性質", r"四則|併式", (4, 4), ["order_ops"]),
    (r"連除", None, None, ["divchain"]),
    (r"多步驟|三步驟", None, None, ["order_ops"]),
    (r"分配律|簡化計算|和差積商不變|和、差、積、商不變", None, None, ["simplify"]),
    (r"平均", None, None, ["avg"]),
    # ---- 概數、規律 ----
    (r"無條件|四捨五入|生活中的概數|概數的應用|應用概數", None, None, ["round:int"]),
    (r"應用概數做估算|概數的應用", None, None, ["add_est", "mul_est"]),
    (r"小數取概數|小數的概數", None, None, ["round:dec"]),
    (r"數字的規律|數的規律|數形規律|數形的規律|數量關係的規律|數形規則|規律性問題", None, None, ["seq"]),
    (r"圖形和數形的規律", None, None, ["seq:geo"]),
    # ---- 分數 ----
    (r"幾分之一|二分之一和四分之一|等分|^\d+-\d+ 平分|一樣大", r"分數", (2, 2), ["v_frac:unit", "frac_unit_cmp"]),
    (r"比大小|大小比較", r"分數", (2, 2), ["frac_unit_cmp"]),
    (r"幾分之幾", None, (3, 3), ["v_frac:proper"]),
    (r"分數數詞序列|單位分數的累加", None, None, ["frac_count"]),
    (r"4 個 1/3", None, None, ["frac_count:any"]),
    (r"分數的大小比較|分數比大小", None, (3, 3), ["frac_cmp:same", "frac_cmp:num"]),
    (r"和 1 一樣大|分數與 1", None, None, ["frac_one"]),
    (r"分數的加法|分數的減法|同分母分數的加減|分數的加減應用", None, (3, 3), ["frac_addsub"]),
    (r"真分數、假分數|假分數和帶分數|假分數與帶分數", None, None, ["v_frac:improper", "improper"]),
    (r"分數的大小比較|比大小", r"假分數|帶分數|^分數$", (4, 4), ["frac_cmp:mixed"]),
    (r"分數的數線|分數數線", None, None, ["v_numline:frac"]),
    (r"同分母分數的加|同分母分數的減|同分母分數的大小比較|分數的應用", None, (4, 4), ["frac_addsub:mixed"]),
    (r"同分母分數的大小比較", None, None, ["frac_cmp:same"]),
    (r"分數的整數倍", None, None, ["frac_times_int"]),
    (r"等值分數|找出等值分數", None, None, ["frac_equiv"]),
    (r"異分母分數的比較|簡單異分母", None, None, ["frac_unlike_simple"]),
    (r"分數和小數的互換|分數與小數|分數和小數互換", None, (4, 4), ["frac_dec:simple"]),
    (r"擴分", None, None, ["frac_equiv"]),
    (r"約分|最簡分數", None, None, ["frac_reduce"]),
    (r"通分", None, None, ["frac_common_cmp"]),
    (r"異分母分數的加法|異分母分數的減法|異分母分數的加減|分數的應用", None, (5, 5), ["frac_unlike_addsub"]),
    (r"整數相除的結果", None, None, ["div_as_frac"]),
    (r"整數乘以幾分之一|整數 × 分數|整數的分數倍|乘以 1/2", None, None, ["int_times_frac"]),
    (r"分數 × 分數|分數的分數倍|被乘數、乘數與積|被乘數、乘數和積", r"分數", None, ["frac_times_frac"]),
    (r"分數 ÷ 整數|分數除以整數", None, None, ["frac_div_int"]),
    (r"分數化為小數|小數化為分數|分數和小數互換", None, (5, 5), ["frac_dec"]),
    (r"同分母分數的除法|異分母分數的除法|分數除法的應用|被除數、除數和商|被除數、除數與商", r"分數", None, ["frac_div_frac"]),
    # ---- 小數 ----
    (r"認識一位小數|認識十分位|認識小數", None, (3, 3), ["dec_read:1", "v_numline:dec"]),
    (r"小數的大小比較", None, (3, 3), ["dec_cmp:1"]),
    (r"小數的加減|一位小數的加法|一位小數的減法", None, (3, 3), ["dec_addsub:1"]),
    (r"1毫米＝0.1公分", None, None, ["conv:cm_mm.d"]),
    (r"認識二位小數|百分位", None, None, ["dec_read:2"]),
    (r"小數的大小比較|長度與小數的大小比較", None, (4, 4), ["dec_cmp:2"]),
    (r"小數的加減|小數的加法與減法", None, (4, 4), ["dec_addsub:2"]),
    (r"長度與小數", None, None, ["conv:m_cm.d"]),
    (r"小數的數線|小數數線", None, None, ["v_numline:dec"]),
    (r"一位小數×整數|一位小數乘以|一位小數乘以整數|乘數是一位數", r"小數", (4, 4), ["dec_mul_int:1"]),
    (r"二位小數×整數|二位小數乘以|一、二位小數乘以二位整數|小數計算的應用|小數乘法的應用", None, (4, 4), ["dec_mul_int:2"]),
    (r"認識多位小數|多位小數$", None, None, ["dec_read:multi"]),
    (r"小數的大小比較", None, (5, 5), ["dec_cmp:multi"]),
    (r"多位小數的加減", None, None, ["dec_addsub:multi"]),
    (r"三位小數的整數倍|多位小數乘以整數", None, None, ["dec_mul_int:multi"]),
    (r"整數乘以小數|整數的小數倍", None, None, ["int_mul_dec"]),
    (r"小數乘以小數|小數的小數倍", None, None, ["dec_mul_dec"]),
    (r"^4-4 關係|被乘數、乘數和積的關係", r"小數", None, ["dec_mul_dec"]),
    (r"整數除以整數|商是小數", None, None, ["dec_div_int:int"]),
    (r"小數除以整數|小數、整數除以整數", None, None, ["dec_div_int"]),
    (r"整數÷小數|小數÷小數|整數除以小數|小數除以小數|除以一位小數|除以二位小數|小數除法的應用|除法與概數", None, None, ["dec_div_dec"]),
    (r"被除數、除數和商的關係", r"小數", None, ["dec_div_dec"]),
    (r"乘、除以 10|十進位", None, (5, 5), ["dec10"]),
    (r"小數四則|小數的四則", None, None, ["dec_addsub:multi", "dec_mul_dec", "dec_div_dec"]),
    (r"分數四則|分數的四則|小數與分數的混合", None, None, ["frac_unlike_addsub", "frac_times_frac", "frac_div_frac"]),
    (r"數的混合計算|數的簡化計算|小數與分數的簡化計算", None, None, ["simplify"]),
    # ---- 因數倍數 ----
    (r"^\d+-\d+ 整除", None, None, ["divisible"]),
    (r"^\d+-\d+ (認識)?因數$|倍數與因數的關係", None, None, ["factors"]),
    (r"公因數", None, None, ["gcd"]),
    (r"^\d+-\d+ (認識)?倍數$|倍數與因數的關係", None, None, ["multiples"]),
    (r"判別 2、5、10|找 2、5 和 10 的倍數", None, None, ["mult_rule:2,5,10"]),
    (r"公倍數", None, None, ["lcm"]),
    (r"質數|合數", None, None, ["prime"]),
    (r"質因數", None, None, ["prime_fact"]),
    (r"互質|短除法", None, None, ["gcd", "lcm"]),
    (r"解題與應用|應用與解題", r"公因數|公倍數|最大公因數", None, ["gcd", "lcm"]),
    # ---- 比、百分率、速率 ----
    (r"認識比率", None, None, ["rate"]),
    (r"認識百分率|百分率的互換|小數、分數與百分率", None, None, ["pct"]),
    (r"百分率的應用", None, None, ["pct_of"]),
    (r"比與比值|相等的比|比的應用|認識比值|最簡整數比|^\d-\d 比$|^\d-\d 比值$|比和相等的比", None, (6, 6), ["ratio"]),
    (r"基準量與比較量$|基準量和比較量$|認識基準量", None, None, ["base_cmp"]),
    (r"兩量之和|兩量之差|兩量和|兩量差|求兩量|從兩量", None, None, ["base_cmp:sum"]),
    (r"速率$|秒速|距離、時間和速率|距離、速率與時間|平均速率", None, None, ["speed"]),
    (r"速率單位的換算|秒速、分速、時速的換算", None, None, ["speed_conv"]),
    (r"相離|相遇|追趕|流水", None, None, ["speed_word"]),
    (r"速率的應用", None, None, ["speed", "speed_word"]),
    (r"和差問題", None, None, ["word:sumdiff"]),
    (r"年齡問題", None, None, ["word:age"]),
    (r"雞兔問題", None, None, ["word:cr"]),
    (r"組合問題|搭配問題|選擇與組合", None, None, ["word:combo"]),
    (r"間隔問題", None, None, ["word:tree"]),
    # ---- 量 ----
    (r"認識公分|認識 1 公分|量長度|量一量|長度的測量|^\d-\d 個別單位$", r"公分|量長度", (2, 2), ["v_ruler:cm"]),
    (r"公尺和公分的換算|公尺與公分|公尺和公分的關係|長度的關係", None, None, ["conv:m_cm"]),
    (r"長度的計算|長度的加減|長度的比較與計算", r"公尺", (2, 2), ["meas_addsub:m_cm"]),
    (r"認識毫米|毫米的實測", None, None, ["v_ruler:mm"]),
    (r"公分、毫米的關係|長度的換算與比較|長度的計算|公分、毫米的計算|長度的加減", r"毫米", (3, 3), ["conv:cm_mm", "meas_addsub:cm_mm"]),
    (r"公里|長度的換算|長度的計算", r"公里|^長度$", (4, 4), ["conv:km_m", "meas_addsub:km_m"]),
    (r"公升|毫升|容量的換算|容量的加減|容量的計算", r"公升", None, ["conv:l_ml", "meas_addsub:l_ml"]),
    (r"公斤|公克|重量的換算|重量的加減|重量的計算", r"公斤", None, ["conv:kg_g", "meas_addsub:kg_g"]),
    (r"公里和公尺", r"大單位", None, ["conv:km_m.d"]),
    (r"公噸", None, None, ["conv:t_kg"]),
    (r"公畝|公頃|平方公里", None, None, ["conv:area"]),
    (r"平方公尺", None, (4, 4), ["conv:area", "rect"]),
    (r"周長|面積", r"周長與面積", (4, 4), ["rect"]),
    (r"平方公分|數格子|切割|拼湊|面積的估算|估估看面積", None, (3, 3), ["v_area"]),
    (r"平行四邊形的面積|三角形的面積|梯形的面積|面積公式的應用|面積的變化", None, None, ["area_shapes"]),
    (r"長方體與正方體的體積|體積的公式|^\d-\d 體積$|複合形體的體積", None, (5, 5), ["volume"]),
    (r"立方公尺", None, None, ["conv:vol", "volume"]),
    (r"容積|容量和容積|容量的關係", None, None, ["conv:vol"]),
    (r"生活中的容量單位", None, None, ["conv:l_ml"]),
    (r"認識體積|認識立方公分|立體堆疊|體積有多大", None, (4, 4), ["v_cubes"]),
    (r"複合形體的體積", None, (4, 4), ["v_cubes"]),
    (r"複合形體的體積", None, (6, 6), ["volume:prism"]),
    (r"表面積", None, None, ["surface"]),
    (r"柱體的體積|角柱與圓柱的體積|柱體體積", None, None, ["volume:prism"]),
    (r"圓周率|圓周長|扇形周長|弧長", None, None, ["circle:circ"]),
    (r"圓面積|扇形面積|扇形的周長和面積", None, None, ["circle:area", "circle"]),
    (r"認識圓|圓心、圓周|生活中的圓", None, (3, 3), ["circle:rd"]),
    (r"扇形|圓心角|幾分之幾圓|1/2 圓", None, (5, 5), ["sector"]),
    # ---- 圖形 ----
    (r"認識平面圖形|認識形狀|認識三角形、正方形|做圖形|排圖形|拼圖形|分分看", r"形狀|方盒|圖形", (1, 1), ["v_shape:basic"]),
    (r"正三角形、正方形和長方形|正三角形、正方形|邊、角和頂點|周界", None, (2, 2), ["v_shape:basic"]),
    (r"周長", r"圖形", (2, 2), ["rect:perim"]),
    (r"正方體和長方體|正方體與長方體|認識正方體", None, (2, 2), ["solid_parts:box"]),
    (r"正方形和長方形|正方形與長方形", r"角", (3, 3), ["v_shape:basic"]),
    (r"構成要素|展開圖", r"正方體和長方體", (5, 5), ["solid_parts:box"]),
    (r"四邊形的性質", None, (5, 5), ["v_shape:quad"]),
    (r"認識多邊形|^\d-\d 多邊形$|正多邊形", None, (5, 5), ["poly_sum"]),
    (r"直角、銳角和鈍角|認識直角|角的大小比較|比較角的大小|認識角", None, (3, 3), ["v_angle"]),
    (r"量角器|量角|畫角|角度的估測", None, (4, 4), ["v_angle:deg"]),
    (r"旋轉角|角的合成|角度的計算|直角、銳角和鈍角的角度", None, (4, 4), ["angle_calc"]),
    (r"三角形的分類|以邊分類|以角分類|從邊和角來分類|^\d-\d 三角形$", None, (4, 4), ["v_shape:tri"]),
    (r"四邊形家族|認識各類四邊形|認識四邊形", None, (4, 4), ["v_shape:quad"]),
    (r"內角和", None, None, ["tri_angle", "poly_sum"]),
    (r"邊長關係|邊長的性質", None, None, ["tri_side"]),
    (r"角柱|角錐|柱體和錐體|構成要素|圓柱與圓錐|角錐與圓錐", r"柱體|錐體|立體形體", (5, 5), ["solid_parts"]),
    (r"比例尺|放大圖|縮圖|縮小圖", None, None, ["scale"]),
    # ---- 時間 ----
    (r"幾點鐘|幾點半|認識時鐘|時間的前後", None, (1, 1), ["v_clock:half"]),
    (r"日曆|月曆|年曆|日期的先後", None, (1, 1), ["v_calendar"]),
    (r"幾時幾分|報讀時刻|認識鐘面|數字鐘", None, (2, 2), ["v_clock:5"]),
    (r"經過幾小時|經過的時間|會是幾時幾分", None, (2, 2), ["time_after:h", "time_between:h"]),
    (r"年、月、日|年和月|共有多少天|共幾天|天數和日期|是幾月幾日|月和星期|1 星期", r"年", (2, 2), ["days_month", "calendar_calc"]),
    (r"年和月的換算|年和月$", None, (2, 2), ["conv:yr_mo"]),
    (r"1 星期|月和星期", None, (2, 2), ["conv:wk_d"]),
    (r"24 小時|24 時制|日、時|1 日是", None, (3, 3), ["conv:d_h", "time_24h"]),
    (r"時、分和秒|分、秒|60 分鐘|60 秒", None, (3, 3), ["conv:h_min", "conv:min_s"]),
    (r"時分的加減|時間的計算", None, (3, 3), ["meas_addsub:h_min", "time_after:hm"]),
    (r"時間單位的換算|時間的換算|12時制與24時制|日、小時的換算|小時、分鐘、秒", None, (4, 4), ["conv:h_min", "conv:d_h", "time_24h"]),
    (r"時間量的加減|時刻與時間量|一段時間之前或之後", None, (4, 4), ["meas_addsub:h_min", "time_after:24"]),
    (r"兩時刻間|跨午|跨日", None, (4, 4), ["time_between:24"]),
    (r"時間的乘法|時間的除法|時間的應用|時間的單位換算", None, (5, 5), ["time_muldiv"]),
    # ---- 統計 ----
    (r"長條圖", None, None, ["v_bar"]),
    (r"折線圖", None, None, ["v_bar:line"]),
    (r"生活中的統計圖|報讀生活中的統計圖|複雜的統計圖|統計圖的應用", None, None, ["v_bar", "v_bar:line"]),
    (r"圓形圖|圓形百分圖", None, None, ["v_pie"]),
    (r"做紀錄和統計表|完成和報讀統計表|^\d-\d 報讀$|^\d-\d 記錄$", None, (1, 1), ["v_table:1"]),
    (r"一維表格|生活中的表格", None, (3, 3), ["v_table:1"]),
    (r"二維表格|製作統計表|製作表格|分類與製作表格", None, (3, 3), ["v_table:2"]),
]


def unit_max(title, g):
    t = title.replace(",", "")
    if "億" in t:
        return 100000000
    m = re.search(r"(\d+)\s*以內|數到\s*(\d+)", t)
    if m:
        return int(m.group(1) or m.group(2))
    return {1: 100, 2: 1000, 3: 10000}.get(g, 100)


def main():
    raw = json.loads((HERE / "src" / "units_raw.json").read_text(encoding="utf-8"))
    out = {"source": raw["source"], "fetched": raw["fetched"], "presses": {}}
    unmatched, empty = [], []
    for press, vols in raw["presses"].items():
        pv = []
        for vk, units in vols.items():
            g, sem = int(vk[0]), vk[1]
            lst = []
            for u in units:
                num = re.match(r"第(.+?)單元\s*(.*)$", u["title"])
                n = num.group(1)
                n = CN[n] if len(n) == 1 else 10 + CN.get(n[1], 0) if n.startswith("十") else CN[n[0]] * 10 + CN.get(n[2:], 0)
                name = num.group(2).strip()
                refs = []
                for sec in u["sections"]:
                    sec_t = re.sub(r"\s+", " ", sec).strip()
                    hit = False
                    for sr, ur, gr, skills in R:
                        if not re.search(sr, sec_t):
                            continue
                        if ur and not re.search(ur, name):
                            continue
                        if gr and not gr[0] <= g <= gr[1]:
                            continue
                        hit = True
                        for s in skills:
                            s = s.replace("{max}", str(unit_max(name, g)))
                            if s not in refs:
                                refs.append(s)
                    if not hit:
                        unmatched.append(f"{PRESS_NAME[press]} {vk} {n:>2} {name} | {sec_t}")
                if not refs:
                    empty.append(f"{PRESS_NAME[press]} {vk} {n:>2} {name}")
                lst.append({"n": n, "title": name, "sections": [re.sub(r"\s+", " ", s).strip() for s in u["sections"]], "skills": refs})
            lst.sort(key=lambda x: x["n"])
            pv.append({"grade": g, "sem": sem, "units": lst})
        out["presses"][press] = {"name": PRESS_NAME[press], "volumes": pv}
    (HERE / "units.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (HERE / "src" / "unmatched.txt").write_text("\n".join(unmatched) + "\n", encoding="utf-8")
    print(f"沒有對應題型的小節：{len(unmatched)}（src/unmatched.txt）")
    print(f"整個單元都不出題：{len(empty)}")
    for e in empty:
        print("  ", e)


if __name__ == "__main__":
    main()
