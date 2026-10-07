/**
 * Thai → Latin letters for names (owner 2026-10-07: "karaoke" spelling so foreign staff can read and say them).
 * Not strict RTGS — the everyday spelling Thais use for names: จ = j (ใจ → jai), แ + final = a (แสง → Sang),
 * tone marks dropped. Rule-based, so it is a good first guess, not always the family's own spelling — screens that
 * store a name let staff correct it (e.g. Branch.nameEn). Common English-style nicknames (แอน = Ann) come from a list.
 */

// ---- known words (checked first) ----

/** Thai place names used for branches / provinces — the standard English spellings */
export const PLACES: Record<string, string> = {
  "กรุงเทพ": "Bangkok", "กรุงเทพฯ": "Bangkok", "กรุงเทพมหานคร": "Bangkok", "กทม.": "Bangkok", "ทองหล่อ": "Thonglor", "อารีย์": "Ari", "สุขุมวิท": "Sukhumvit", "สีลม": "Silom",
  "บางนา": "Bangna", "พาราไดซ์": "Paradise", "วิภาวดี": "Vibhavadi", "ศรีราชา": "Sriracha", "พัทยา": "Pattaya", "ชลบุรี": "Chonburi", "สัตหีบ": "Sattahip", "บ้านบึง": "Ban Bueng",
  "สาทร": "Sathorn", "สยาม": "Siam", "อโศก": "Asok", "พร้อมพงษ์": "Phrom Phong", "เอกมัย": "Ekkamai", "อ่อนนุช": "On Nut", "ลาดพร้าว": "Lat Phrao", "รัชดา": "Ratchada",
  "พระราม 9": "Rama 9", "พระราม9": "Rama 9", "บางกะปิ": "Bang Kapi", "รามอินทรา": "Ram Inthra", "บางใหญ่": "Bang Yai", "บางบัวทอง": "Bang Bua Thong", "นนทบุรี": "Nonthaburi",
  "ปากเกร็ด": "Pak Kret", "แจ้งวัฒนะ": "Chaeng Watthana", "งามวงศ์วาน": "Ngamwongwan", "ปทุมธานี": "Pathum Thani", "รังสิต": "Rangsit", "สมุทรปราการ": "Samut Prakan",
  "บางพลี": "Bang Phli", "ศรีนครินทร์": "Srinakarin", "พัฒนาการ": "Phatthanakan", "ทาวน์อินทาวน์": "Town in Town", "ปิ่นเกล้า": "Pinklao", "บางแค": "Bang Khae",
  "เชียงใหม่": "Chiang Mai", "เชียงราย": "Chiang Rai", "ภูเก็ต": "Phuket", "ขอนแก่น": "Khon Kaen", "โคราช": "Korat", "นครราชสีมา": "Nakhon Ratchasima", "หาดใหญ่": "Hat Yai",
  "อุดรธานี": "Udon Thani", "ระยอง": "Rayong", "หัวหิน": "Hua Hin", "อยุธยา": "Ayutthaya", "นครปฐม": "Nakhon Pathom", "สระบุรี": "Saraburi", "ฉะเชิงเทรา": "Chachoengsao",
  "บางแสน": "Bang Saen", "อมตะ": "Amata", "เมืองทองธานี": "Muang Thong Thani", "ดอนเมือง": "Don Mueang", "มีนบุรี": "Min Buri", "ประเวศ": "Prawet", "บางรัก": "Bang Rak",
}

/** Nicknames that come from English words — spelt the English way */
export const NICKNAMES: Record<string, string> = {
  "แอน": "Ann", "มิ้นท์": "Mint", "มิ้น": "Mint", "เจ": "J", "บอส": "Boss", "กอล์ฟ": "Golf", "เบล": "Belle", "ปาล์ม": "Palm", "เมย์": "May", "พลอย": "Ploy", "แพร": "Prae",
  "แพรว": "Praew", "พีช": "Peach", "ซอล": "Sol", "ฟ้า": "Fah", "บีม": "Beam", "แบงค์": "Bank", "เบนซ์": "Benz", "ฟิล์ม": "Film", "ไอซ์": "Ice", "เฟิร์น": "Fern", "เอิร์น": "Earn",
  "แนน": "Nan", "จูน": "June", "เจน": "Jane", "เคท": "Kate", "แคท": "Cat", "เอ": "A", "บี": "B", "ซี": "C", "ดี": "Dee", "โบ": "Bo", "แบม": "Bam", "พิงค์": "Pink", "ป๊อป": "Pop",
  "เกม": "Game", "บอล": "Ball", "อาร์ม": "Arm", "นิว": "New", "ไนซ์": "Nice", "ปิงปอง": "Ping Pong", "มายด์": "Mind", "มีน": "Meen", "ข้าวปั้น": "Khaopan", "ต้า": "Ta", "โจ": "Jo",
  "ได": "Dai", "นุ่น": "Noon", "แพท": "Pat", "อาย": "Eye", "ฝน": "Fon", "น้ำ": "Nam", "นก": "Nok", "ต้น": "Ton", "เบียร์": "Beer", "ไวน์": "Wine", "ไข่มุก": "Khaimuk", "ปุณ": "Pun",
}

/** Subjects (owner 2026-10-07): full and short English names + Japanese — used in names too (คลาส "คณิต ป.5" → "Math P.5") */
export const SUBJECTS: Record<string, { en: string; short: string; ja: string }> = {
  "คณิต": { en: "Math", short: "Math", ja: "数学" }, "คณิตศาสตร์": { en: "Math", short: "Math", ja: "数学" },
  "อังกฤษ": { en: "English", short: "Eng", ja: "英語" }, "ภาษาอังกฤษ": { en: "English", short: "Eng", ja: "英語" },
  "วิทย์": { en: "Science", short: "Sci", ja: "理科" }, "วิทยาศาสตร์": { en: "Science", short: "Sci", ja: "理科" },
  "ญี่ปุ่น": { en: "Japanese", short: "Jpn", ja: "日本語" }, "ภาษาญี่ปุ่น": { en: "Japanese", short: "Jpn", ja: "日本語" },
  "จีน": { en: "Chinese", short: "Chi", ja: "中国語" }, "ภาษาจีน": { en: "Chinese", short: "Chi", ja: "中国語" },
  "ไทย": { en: "Thai", short: "Thai", ja: "タイ語" }, "ภาษาไทย": { en: "Thai", short: "Thai", ja: "タイ語" },
  "ฟิสิกส์": { en: "Physics", short: "Phys", ja: "物理" }, "เคมี": { en: "Chemistry", short: "Chem", ja: "化学" }, "ชีวะ": { en: "Biology", short: "Bio", ja: "生物" }, "ชีววิทยา": { en: "Biology", short: "Bio", ja: "生物" },
  "สังคม": { en: "Social Studies", short: "Soc", ja: "社会" },
}

/** everyday words inside names (rooms, classes) */
const WORDS: Record<string, string> = {
  "ห้อง": "Room", "เดี่ยว": "Private", "กลุ่ม": "Group", "คอร์ส": "Course", "พิเศษ": "Special", "เตรียมสอบ": "Exam prep",
  "รายเดือน": "Monthly", "รายชั่วโมง": "Hourly", "รายสัปดาห์": "Weekly", "ชม.": "hrs", "ชั่วโมง": "hrs", "เดือน": "months", "สัปดาห์": "weeks",
  "ด.ช.": "Master", "ด.ญ.": "Miss", "นาย": "Mr.", "นาง": "Mrs.", "นางสาว": "Ms.", "น.ส.": "Ms.",
}

/** Prefixes around a name */
const PREFIXES: [RegExp, (rest: string) => string][] = [
  [/^ครอบครัว\s*/, (r) => `${r} Family`],
  [/^คุณแม่\s*/, (r) => `Mom ${r}`],
  [/^คุณพ่อ\s*/, (r) => `Dad ${r}`],
  [/^คุณ\s*/, (r) => `K.${r}`],
  [/^น้อง\s*/, (r) => `N'${r}`],
  [/^ครู\s*/, (r) => `T'${r}`],
]

// ---- rule-based romanizer ----

const INITIAL: Record<string, string> = {
  ก: "k", ข: "kh", ฃ: "kh", ค: "kh", ฅ: "kh", ฆ: "kh", ง: "ng", จ: "j", ฉ: "ch", ช: "ch", ซ: "s", ฌ: "ch", ญ: "y", ฎ: "d", ฏ: "t", ฐ: "th", ฑ: "th", ฒ: "th",
  ณ: "n", ด: "d", ต: "t", ถ: "th", ท: "th", ธ: "th", น: "n", บ: "b", ป: "p", ผ: "ph", ฝ: "f", พ: "ph", ฟ: "f", ภ: "ph", ม: "m", ย: "y", ร: "r", ล: "l", ว: "w",
  ศ: "s", ษ: "s", ส: "s", ห: "h", ฬ: "l", อ: "", ฮ: "h",
}
const FINAL: Record<string, string> = {
  ก: "k", ข: "k", ค: "k", ฆ: "k", ง: "ng", จ: "t", ช: "t", ซ: "t", ฌ: "t", ญ: "n", ฎ: "t", ฏ: "t", ฐ: "t", ฑ: "t", ฒ: "t", ณ: "n", ด: "t", ต: "t", ถ: "t", ท: "t", ธ: "t",
  น: "n", บ: "p", ป: "p", พ: "p", ฟ: "p", ภ: "p", ม: "m", ย: "i", ร: "n", ล: "n", ว: "o", ศ: "t", ษ: "t", ส: "t", ฬ: "n",
}
const CONS = /[ก-ฮ]/
const TONE = /[่้๊๋]/g
const CLUSTER2 = /[รลว]/
const isCons = (c: string | undefined) => !!c && CONS.test(c)

/** one Thai word (no spaces) → Latin, lower case */
function romanizeWord(input: string): string {
  // drop tone marks; drop a consonant silenced by ์ (and the ์), and ๆ
  let s = input.replace(TONE, "").replace(/[ทตด]ร์/g, "").replace(/[ก-ฮ][ิุ]?์/g, "").replace(/ๆ/g, "")
  for (const [th, en] of SPECIAL) s = s.split(th).join(en)
  // ฤ
  s = s.replace(/ฤ/g, "รึ")
  let out = ""
  let i = 0
  while (i < s.length) {
    let lead = ""
    if ("เแโใไ".includes(s[i])) { lead = s[i]; i++ }
    if (!isCons(s[i])) { // stray vowel / non-Thai
      out += lead ? ({ เ: "e", แ: "ae", โ: "o", ใ: "ai", ไ: "ai" } as Record<string, string>)[lead] : s[i] ?? ""
      if (!lead) i++
      continue
    }
    // initial consonant (+ cluster: ห leading, or second consonant ร ล ว)
    const init = s[i]; i++
    let initSound = INITIAL[init] ?? ""
    if (init === "ห" && isCons(s[i]) && "งญนมยรลว".includes(s[i])) { initSound = INITIAL[s[i]]; i++ }
    else if (init === "อ" && s[i] === "ย") { initSound = "y"; i++ }
    else if (isCons(s[i]) && CLUSTER2.test(s[i]) && "กขคปผพตทบดฟ".includes(init) && (/[ัิีึืุู็ะาำอ]/.test(s[i + 1] ?? "") || (lead && isCons(s[i + 1]) ))) {
      if (s[i] === "ร" && init === "ท") initSound = "s" // ทร = s (ทราย)
      else initSound += s[i] === "ว" ? "w" : INITIAL[s[i]]
      i++
    }
    // vowel
    let v = ""
    let haveVowel = false
    let rr = false
    if (s.slice(i, i + 2) === "รร") { i += 2; v = "a"; haveVowel = true; rr = true }
    const take = (re: RegExp) => { const m = s.slice(i).match(re); if (m) { i += m[0].length; return m[0] } return null }
    if (lead === "เ") {
      if (take(/^ีย/)) v = "ia"
      else if (take(/^ือ/)) v = "uea"
      else if (take(/^ิ/)) v = "oe"
      else if (take(/^า/)) v = "ao"
      else if (take(/^อ/)) v = "oe"
      else if (take(/^็/)) v = "e"
      else { take(/^ะ/); v = "e" }
      haveVowel = true
    } else if (lead === "แ") {
      take(/^็/); take(/^ะ/)
      v = "ae"; haveVowel = true
    } else if (lead === "โ") { take(/^ะ/); v = "o"; haveVowel = true }
    else if (lead === "ใ" || lead === "ไ") { v = "ai"; haveVowel = true }
    else if (!rr) {
      const m = take(/^(ัว|ั|ิ|ี|ึ|ื|ุ|ู|็|า|ำ|ะ|อ(?![ัิีึืุู็่้๊๋ะาำ])|ว(?=[ก-ฮ](?![ัิีึืุู็ะาำ])))/)
      if (m) {
        haveVowel = true
        v = ({ "ัว": "ua", "ั": "a", "ิ": "i", "ี": "i", "ึ": "ue", "ื": "ue", "ุ": "u", "ู": "u", "็": "o", "า": "a", "ำ": "am", "ะ": "a", "อ": "o", "ว": "ua" } as Record<string, string>)[m] ?? ""
        if (m === "ื") take(/^อ/)
        if (m === "ั" && s[i] === "ว") { v = "ua"; i++ }
      }
    }
    // final consonant: a consonant not starting the next syllable
    let fin = ""
    const next = s[i]
    // the consonant after the vowel ends this syllable when what follows it can start a new one (or nothing follows)
    if (isCons(next) && !(next === "อ" && haveVowel) && closes(s, i)) { fin = FINAL[next] ?? ""; i++ }
    if (rr && !fin) fin = "n" // วรรณ = wan, สรร = san
    if (!haveVowel) v = fin ? "o" : "a" // implicit vowel: ต้น = ton, ณ = na
    // vowel + final combinations
    if (fin === "i") { out += initSound + (v === "a" || v === "ai" ? "ai" : v === "o" ? "oi" : v === "u" ? "ui" : v === "oe" ? "oei" : v === "ua" ? "uai" : v + "i"); continue }
    if (fin === "o") { out += initSound + (v === "a" ? "ao" : v === "i" ? "io" : v === "e" ? "eo" : v === "ae" ? "aew" : v === "ia" ? "iao" : v + "o"); continue }
    if (lead === "แ" && fin) v = "a" // owner's spelling: แสง → Sang
    out += initSound + v + fin
  }
  return out
}

/** spellings the rules can't guess */
const SPECIAL: [string, string][] = [["ศรี", "sri"], ["พรหม", "phrom"], ["พระ", "phra"], ["ประ", "pra"], ["กษัตริย์", "kasat"]]

/** does the consonant at i end the syllable before it? (vs. start the next one) */
function closes(s: string, i: number): boolean {
  const j = i + 1
  if (j >= s.length) return true // last letter
  const c = s[j]
  if ("เแโใไ".includes(c)) return true // a new syllable starts with its leading vowel
  if (/[ัิีึืุู็าำะ]/.test(c)) return false // a vowel sign belongs to this consonant → it starts a syllable
  if (c === "อ" && (j + 1 >= s.length || isCons(s[j + 1]))) return false // ทอง: อ is the vowel of this consonant
  if (!isCons(c)) return true
  return startsSyllable(s, j)
}
/** can the consonant at j start a syllable (a vowel follows, or it has a final of its own)? */
function startsSyllable(s: string, j: number): boolean {
  const n = s[j + 1]
  if (n === undefined) return false
  if (/[ัิีึืุู็าำะ]/.test(n) || "เแโใไ".includes(n)) return true
  if (n === "อ") return true
  if (isCons(n)) return j + 2 >= s.length ? true : closes(s, j + 1) || CLUSTER2.test(n)
  return false
}

const cap = (w: string) => w.replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase())

/** a Thai name (person, family, place) → Latin letters; Latin text is returned as is */
export function romanizeName(name: string): string {
  const t = name.trim()
  if (!/[ก-๙]/.test(t)) return t
  for (const [re, wrap] of PREFIXES) if (re.test(t)) return wrap(romanizeName(t.replace(re, "")))
  const title = t.match(/^(ด\.ช\.|ด\.ญ\.|น\.ส\.|นางสาว|นาย|นาง)\s*(?=[ก-๙])/)
  if (title && t.length > title[0].length) return `${WORDS[title[1]]} ${romanizeName(t.slice(title[0].length))}`
  if (PLACES[t]) return PLACES[t]
  if (NICKNAMES[t]) return NICKNAMES[t]
  if (SUBJECTS[t]) return SUBJECTS[t].en
  return t.split(/(\s+|·|,|\/|\(|\)|-)/).map((part) => {
    if (!/[ก-๙]/.test(part)) return part
    if (PLACES[part]) return PLACES[part]
    if (NICKNAMES[part]) return NICKNAMES[part]
    if (SUBJECTS[part]) return SUBJECTS[part].en
    if (WORDS[part]) return WORDS[part]
    // keep grade-like tokens readable: ป.6 → P.6, ม.3 → M.3, อ.2 → K.2
    const g = part.match(/^([ปมอ])\.(\d)$/)
    if (g) return `${{ ป: "P", ม: "M", อ: "K" }[g[1] as "ป" | "ม" | "อ"]}.${g[2]}`
    return cap(romanizeWord(part))
  }).join("")
}

/** branch names: the English name set in Settings, else the standard place spelling, else romanized */
export const branchNameEn = (b: { name: string; nameEn?: string }) => b.nameEn?.trim() || romanizeName(b.name)
