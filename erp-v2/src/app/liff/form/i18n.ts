// Parent form copy in TH / EN / JP (owner 2026-09-29). Default language comes from Settings → System; the parent
// can switch on the form. Stored values stay language-neutral (codes) or Thai (what staff read in the ERP).

import type { FormLang, FormType, LeadSource } from "@/domain/types"
import { normalizeRelation } from "@/domain/rules/people"

export const LANGS: { key: FormLang; label: string }[] = [{ key: "th", label: "TH" }, { key: "en", label: "EN" }, { key: "ja", label: "JP" }]

const th = {
  formTitle: (t: FormType): string => (t === "test" ? "แบบฟอร์มสอบวัดระดับ" : "แบบฟอร์มทดลองเรียน"),
  hello: (name: string) => `สวัสดีค่ะ คุณ${name}`,
  errRequired: "จำเป็นต้องกรอก", errPhoneChars: "ใส่ได้เฉพาะตัวเลข (ใช้ - หรือเว้นวรรคได้)", errPhoneLong: "ตัวเลขเกิน — เบอร์โทรมี 9–10 หลัก", errPhoneShort: "ตัวเลขไม่ครบ — ต้องมี 9–10 หลัก", errPhoneZero: "เบอร์โทรต้องขึ้นต้นด้วย 0", errEmail: "อีเมลไม่ถูกต้อง เช่น name@example.com", errPdpa: "จำเป็นต้องเลือก 1 ข้อ", errGrade: "จำเป็นต้องเลือกระดับชั้น", errTime: "จำเป็นต้องเลือกวัน-เวลาให้ครบทุกวิชา",
  missing: "ยังขาด:", secN: (n: number, total: number) => `ส่วนที่ ${n}/${total}`, req: "ต้องกรอก",
  secParent: "ข้อมูลผู้ปกครอง", secSource: "รู้จักเราจากไหน", secBus: "รถรับส่งและที่อยู่", secAddress: "ที่อยู่", secPdpa: "การถ่ายภาพนักเรียน (PDPA)", secTax: "ใบกำกับภาษี", secStudent: "ข้อมูลนักเรียน", secTime: "วิชาและวัน-เวลา",
  steps: ["ผู้ปกครอง", "นักเรียน", "ตรวจสอบ"],
  parentTitle: "ผู้ปกครอง", parentSub: "ข้อมูลสำหรับติดต่อ", addParent: "เพิ่มผู้ปกครอง",
  parentN: (n: number) => `ผู้ปกครองคนที่ ${n}`,
  grpName: "ชื่อ", grpBasic: "ข้อมูลทั่วไป", grpContact: "ติดต่อ", grpFamily: "ครอบครัว", grpStudentName: "ชื่อนักเรียน",
  firstName: "ชื่อจริง", lastName: "นามสกุล", nickname: "ชื่อเล่น", email: "อีเมล",
  relationship: "ความสัมพันธ์", birthDate: "วันเกิด", phone: "เบอร์โทร", addPhone: "เพิ่มเบอร์โทร", makeDefault: "ตั้งเป็นเบอร์หลัก", defaultTag: "เบอร์หลัก",
  primaryParent: "ผู้ติดต่อหลัก", acquisition: "รู้จักเราจากช่องทางไหน", select: "เลือก",
  // owner 2026-11-19: Bus use? (Liclass) · who told you about us (free text) · PDPA photo consent
  busUse: "ใช้รถรับส่งของโรงเรียน", busUseSub: "ติ๊กเมื่อต้องการใช้รถ — แล้วบอกตำแหน่งบ้านด้านล่าง", busLeg: { pickup: "เฉพาะไปรับ", dropoff: "เฉพาะไปส่ง", both: "ทั้งไปรับและไปส่ง" } as Record<"pickup" | "dropoff" | "both", string>,
  referral: "ใครแนะนำให้รู้จักโรงเรียน", referralPh: "พิมพ์ชื่อผู้ปกครองหรือนักเรียนที่แนะนำ เท่าที่จำได้", referralSub: "ไม่บังคับ — แอดมินจะช่วยค้นหาให้",
  pdpaTitle: "การถ่ายภาพนักเรียน (PDPA)", pdpaSub: "โรงเรียนขอถ่ายภาพนักเรียน เพื่อโพสต์ลงโซเชียลหรือใช้ประชาสัมพันธ์",
  pdpa: { allow: "อนุญาตให้นำไปใช้งานได้", blur: "อนุญาต แต่ต้องเบลอหน้า หรือถ่ายจากด้านหลังเท่านั้น จนเดาไม่ได้ว่าเป็นใคร", deny: "ไม่อนุญาตในทุกกรณี" } as Record<"allow" | "blur" | "deny", string>,
  address: "ที่อยู่", addressSub: "ไม่บังคับ", addrPart: { line: "ที่อยู่", area: "แขวง / ตำบล · เขต / อำเภอ" }, addrLinePh: "บ้านเลขที่ หมู่บ้าน/อาคาร ซอย ถนน", addrAreaPh: "เช่น แขวงบางกะปิ เขตห้วยขวาง", province: "จังหวัด", postcode: "รหัสไปรษณีย์",
  tax: "ต้องการใบกำกับภาษี", taxSub: "ไม่บังคับ — ใส่ภายหลังได้", taxName: "ชื่อผู้เสียภาษี / บริษัท", taxId: "เลขประจำตัวผู้เสียภาษี", taxAddress: "ที่อยู่สำหรับใบกำกับภาษี", school: "โรงเรียน", targetSchool: "โรงเรียนที่อยากสอบเข้า", targetSchoolHint: "ถ้ามี — เลือกได้สูงสุด 3 โรงเรียน เรียงจากที่อยากได้มากที่สุด", targetRank: (n: number) => `อันดับ ${n}`, targetAdd: "เพิ่มโรงเรียน", addressNote: "รายละเอียดเพิ่มเติม", addressNotePh: "เช่น หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ ประตูสีเขียว", pin: "ปักหมุดบ้านบนแผนที่", pinSub: "แตะแผนที่เพื่อวางหมุด ลากหมุดเพื่อปรับให้ตรง", locate: "ใช้ตำแหน่งปัจจุบัน", busAddress: "ที่อยู่สำหรับรถรับส่ง", acquisitionSub: "เลือกได้หลายข้อ", lineLinked: (n: string) => `เชื่อม LINE แล้ว · ${n}`, commonTimes: (n: number) => (n > 1 ? `เวลาที่สอบได้ทุกวิชาพร้อมกัน · ${n} วิชา = 2 ชม.` : "เลือกวัน-เวลา · 1 ชม."), noCommon: "ไม่มีเวลาที่ว่างพร้อมกันทุกวิชา — ลองลดวิชา หรือติดต่อสถาบัน",
  studentTitle: "นักเรียน", studentSub: "ข้อมูลน้อง + เลือกวิชาและเวลา", addStudent: "เพิ่มนักเรียน", studentN: (n: number) => `นักเรียนคนที่ ${n}`,
  grade: "ระดับชั้น", note: "หมายเหตุ", notePh: "เช่น จุดที่อยากเน้น หรือสิ่งที่ครูควรรู้", age: (n: number) => `อายุ ${n} ปี`,
  subjects: "วิชาที่สนใจ", subjectsSub: "เลือกได้มากกว่า 1 วิชา",
  schedule: (t: FormType): string => (t === "test" ? "เลือกวัน-เวลาสอบ" : "เลือกวัน-เวลาทดลองเรียน"),
  // owner 2026-11-18: the admin picks the subjects from the chat — the parent only sees them and chooses a time
  subjectsFor: (t: FormType): string => (t === "test" ? "วิชาที่ต้องการเข้า Test" : "วิชาที่ต้องการเข้า Trial"),
  clash: "ชนกับเวลาของอีกวิชา",
  sameDay: "หลายวิชาวันเดียวกันต้องเวลาเดียวกัน (1 วิชา 1 ชม. · 2 วิชาขึ้นไป 2 ชม.)",
  summaryTitle: "ตรวจสอบข้อมูล", summarySub: "ตรวจให้ถูกต้องก่อนส่งให้สถาบัน", family: "ครอบครัว",
  edit: "แก้ไข", done: "เสร็จ", remove: "ลบ", back: "ย้อนกลับ", next: "ถัดไป", cancel: "ยกเลิก", submit: "ส่งฟอร์ม",
  known: "ข้อมูลที่เคยให้ไว้ — แก้ไขได้ถ้ามีอะไรเปลี่ยน",
  sent: (t: FormType) => `ส่ง${t === "test" ? "แบบฟอร์มสอบวัดระดับ" : "แบบฟอร์มทดลองเรียน"}แล้ว`, sentSub: "ขอบคุณค่ะ ทางสถาบันจะยืนยันนัดทาง LINE เร็วๆ นี้",
  opening: "กำลังเปิดฟอร์ม…", previewBadge: "โหมดดูตัวอย่าง — ไม่ส่งข้อมูลจริง",
  required: "ช่องที่มี * ต้องกรอก",
  // owner 2026-10-15: same fields as the admin panel — the extras are optional
  familyName: "ชื่อครอบครัว", familyNamePh: (last: string) => (last ? `ครอบครัว${last}` : "ครอบครัวใจดี"), familyNameSub: "ไม่ใส่ = ใช้นามสกุลผู้ปกครองหลัก",
  nameEn: "ชื่อจริง-นามสกุล (อังกฤษ)", nicknameEn: "ชื่อเล่น (อังกฤษ)", familyNameEn: "ชื่อครอบครัว (อังกฤษ)", optional: "ไม่บังคับ",
  gender: "เพศ", genders: { male: "ชาย", female: "หญิง" }, genderNone: "ไม่ระบุ",
  rel: { guardian: "อื่นๆ", dad: "พ่อ", mom: "แม่", relative: "ญาติ" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "Walk-in", phone: "โทรศัพท์", website: "เว็บไซต์", referral: "คนแนะนำ", other: "อื่นๆ" } as Record<LeadSource, string>,
}

type Dict = typeof th

const en: Dict = {
  formTitle: (t) => (t === "test" ? "Placement test form" : "Trial class form"),
  hello: (name) => `Hello ${name}`,
  errRequired: "This is required", errPhoneChars: "Digits only (you may use - or spaces)", errPhoneLong: "Too many digits — a phone number has 9–10", errPhoneShort: "Too few digits — it needs 9–10", errPhoneZero: "The number must start with 0", errEmail: "Not a valid email, e.g. name@example.com", errPdpa: "Please choose one", errGrade: "Please choose a grade", errTime: "Please choose a time for every subject",
  missing: "Still needed:", secN: (n, total) => `Section ${n}/${total}`, req: "Required",
  secParent: "Parent details", secSource: "How you found us", secBus: "School bus and address", secAddress: "Address", secPdpa: "Photo consent (PDPA)", secTax: "Tax invoice", secStudent: "Student details", secTime: "Subjects and time",
  steps: ["Parent", "Student", "Review"],
  parentTitle: "Parent / Guardian", parentSub: "Contact details", addParent: "Add another parent",
  parentN: (n) => `Parent ${n}`,
  grpName: "Name", grpBasic: "General information", grpContact: "Contact", grpFamily: "Family", grpStudentName: "Student name",
  firstName: "First name", lastName: "Surname", nickname: "Nickname", email: "Email",
  relationship: "Relationship", birthDate: "Date of birth", phone: "Phone", addPhone: "Add phone number", makeDefault: "Set as default", defaultTag: "Default",
  primaryParent: "Main contact", acquisition: "How did you hear about us?", select: "Select",
  busUse: "Use the school bus", busUseSub: "Tick if you want the bus — then tell us where home is below", busLeg: { pickup: "Pick-up only", dropoff: "Drop-off only", both: "Both pick-up and drop-off" },
  referral: "Who told you about us?", referralPh: "Type the parent's or student's name — whatever you remember", referralSub: "Optional — our staff will help find them",
  pdpaTitle: "Photos of students (PDPA)", pdpaSub: "May the school photograph students and post or use the pictures (social media, promotion)?",
  pdpa: { allow: "Allowed", blur: "Allowed, but the face must be blurred or taken from behind so nobody can tell who it is", deny: "Not allowed in any case" },
  address: "Address", addressSub: "Optional", addrPart: { line: "Address", area: "Sub-district · District" }, addrLinePh: "House no., village / building, soi, road", addrAreaPh: "e.g. Bang Kapi, Huai Khwang", province: "Province", postcode: "Post code",
  tax: "I need a tax invoice", taxSub: "Optional — can be added later", taxName: "Taxpayer / company name", taxId: "Tax ID number", taxAddress: "Tax invoice address", school: "School", targetSchool: "Target schools", targetSchoolHint: "If any — up to 3, the one you want most first", targetRank: (n: number) => `Choice ${n}`, targetAdd: "Add a school", addressNote: "Directions", addressNotePh: "e.g. Pruksa village, Soi 2, house on the left, green gate", pin: "Pin your home on the map", pinSub: "Tap the map to drop the pin, drag it to adjust", locate: "Use my location", busAddress: "Address for the school bus", acquisitionSub: "Choose all that apply", lineLinked: (n) => `LINE connected · ${n}`, commonTimes: (n) => (n > 1 ? `Times that fit all ${n} subjects together · 2 h` : "Choose a date & time · 1 h"), noCommon: "No time fits all subjects together — pick fewer subjects or contact us",
  studentTitle: "Student", studentSub: "Your child + subjects and time", addStudent: "Add another student", studentN: (n) => `Student ${n}`,
  grade: "Grade", note: "Note", notePh: "e.g. what to focus on, anything the teacher should know", age: (n) => `Age ${n}`,
  subjects: "Subjects of interest", subjectsSub: "You can choose more than one",
  schedule: (t) => (t === "test" ? "Choose test date & time" : "Choose trial date & time"),
  subjectsFor: (t) => (t === "test" ? "Subjects for the test" : "Subjects for the trial"),
  clash: "Overlaps another subject",
  sameDay: "Several subjects on the same day share one time (1 subject 1 h · 2+ subjects 2 h)",
  summaryTitle: "Review", summarySub: "Please check before sending to the school", family: "Family",
  edit: "Edit", done: "Done", remove: "Remove", back: "Back", next: "Next", cancel: "Cancel", submit: "Submit & send",
  known: "Details you gave us before — edit if anything changed",
  sent: (t) => `Your ${t === "test" ? "test" : "trial"} form has been sent`, sentSub: "Thank you! We will confirm the appointment on LINE shortly.",
  opening: "Opening form…", previewBadge: "Preview mode — nothing is sent",
  required: "Fields marked * are required",
  familyName: "Family name", familyNamePh: (last) => (last ? `${last} family` : "Jaidee family"), familyNameSub: "Empty = the main parent's surname",
  nameEn: "Name in English", nicknameEn: "Nickname in English", familyNameEn: "Family name in English", optional: "optional",
  gender: "Gender", genders: { male: "Boy", female: "Girl" }, genderNone: "Prefer not to say",
  rel: { guardian: "Others", dad: "Father", mom: "Mother", relative: "Relative" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "Walk-in", phone: "Phone", website: "Website", referral: "Referral", other: "Other" },
}

const ja: Dict = {
  formTitle: (t) => (t === "test" ? "レベルチェック申込フォーム" : "体験レッスン申込フォーム"),
  hello: (name) => `${name}様`,
  errRequired: "必須項目です", errPhoneChars: "数字のみ入力できます（- や空白は可）", errPhoneLong: "桁数が多すぎます — 電話番号は9〜10桁です", errPhoneShort: "桁数が足りません — 9〜10桁が必要です", errPhoneZero: "電話番号は0から始まります", errEmail: "メールアドレスの形式が正しくありません（例：name@example.com）", errPdpa: "1つお選びください", errGrade: "学年を選んでください", errTime: "すべての科目で日時を選んでください",
  missing: "未入力：", secN: (n, total) => `セクション ${n}/${total}`, req: "必須",
  secParent: "保護者情報", secSource: "当校を知ったきっかけ", secBus: "送迎バスとご住所", secAddress: "ご住所", secPdpa: "写真撮影について（PDPA）", secTax: "領収書（タックスインボイス）", secStudent: "生徒情報", secTime: "科目と日時",
  steps: ["保護者", "生徒", "確認"],
  parentTitle: "保護者", parentSub: "ご連絡先", addParent: "保護者を追加",
  parentN: (n) => `保護者 ${n}`,
  grpName: "お名前", grpBasic: "基本情報", grpContact: "連絡先", grpFamily: "ご家族", grpStudentName: "生徒のお名前",
  firstName: "名", lastName: "姓", nickname: "ニックネーム", email: "メール",
  relationship: "続柄", birthDate: "生年月日", phone: "電話番号", addPhone: "電話番号を追加", makeDefault: "メインに設定", defaultTag: "メイン",
  primaryParent: "主な連絡先", acquisition: "当校を知ったきっかけ", select: "選択",
  busUse: "スクールバスを利用する", busUseSub: "利用する場合はチェックし、下にご自宅の場所を入力してください", busLeg: { pickup: "行き（お迎え）のみ", dropoff: "帰り（お送り）のみ", both: "往復" },
  referral: "当校をご紹介くださった方", referralPh: "保護者または生徒のお名前（覚えている範囲で）", referralSub: "任意 — 担当者が確認します",
  pdpaTitle: "生徒の写真撮影（個人情報保護）", pdpaSub: "生徒の写真を撮影し、SNSや広報に使用してもよろしいですか？",
  pdpa: { allow: "使用を許可します", blur: "許可しますが、顔にぼかしを入れるか後ろ姿のみとし、誰か分からないようにしてください", deny: "いかなる場合も許可しません" },
  address: "住所", addressSub: "任意", addrPart: { line: "住所", area: "区・郡（ケート／アンプー）" }, addrLinePh: "番地、マンション・ビル名、ソイ、通り", addrAreaPh: "例：バーンカピ区、フアイクワーン郡", province: "県", postcode: "郵便番号",
  tax: "領収書（タックスインボイス）が必要", taxSub: "任意 — 後からでも追加できます", taxName: "納税者名／会社名", taxId: "納税者番号", taxAddress: "インボイス用住所", school: "学校", targetSchool: "志望校", targetSchoolHint: "あれば — 最大3校、第一志望から順に", targetRank: (n: number) => `第${n}志望`, targetAdd: "学校を追加", addressNote: "補足（道順など）", addressNotePh: "例：プルクサ村 ソイ2 左手の緑の門の家", pin: "地図で自宅にピンを立てる", pinSub: "地図をタップしてピン、ドラッグで調整", locate: "現在地を使う", busAddress: "送迎バス用の住所", acquisitionSub: "複数選択できます", lineLinked: (n) => `LINE連携済み · ${n}`, commonTimes: (n) => (n > 1 ? `${n}科目を同時に受けられる時間 · 2時間` : "日時を選択 · 1時間"), noCommon: "全科目が同時に受けられる時間がありません — 科目を減らすかお問い合わせください",
  studentTitle: "生徒", studentSub: "お子様の情報と科目・日時", addStudent: "生徒を追加", studentN: (n) => `生徒 ${n}`,
  grade: "学年", note: "備考", notePh: "例：重点的に見てほしい点など", age: (n) => `${n}歳`,
  subjects: "希望科目", subjectsSub: "複数選択できます",
  schedule: (t) => (t === "test" ? "テスト日時を選択" : "体験日時を選択"),
  subjectsFor: (t) => (t === "test" ? "テストを受ける科目" : "体験する科目"),
  clash: "他の科目と時間が重なります",
  sameDay: "同じ日の複数科目は同じ時間になります（1科目1時間・2科目以上2時間）",
  summaryTitle: "確認", summarySub: "送信前に内容をご確認ください", family: "ご家族",
  edit: "編集", done: "完了", remove: "削除", back: "戻る", next: "次へ", cancel: "キャンセル", submit: "送信する",
  known: "以前ご登録いただいた情報です — 変更があれば編集してください",
  sent: (t) => (t === "test" ? "レベルチェックの申込を送信しました" : "体験レッスンの申込を送信しました"), sentSub: "ありがとうございます。LINEで日時を確定いたします。",
  opening: "フォームを開いています…", previewBadge: "プレビュー — 送信されません",
  required: "* は必須項目です",
  familyName: "家族名", familyNamePh: (last) => (last ? `${last}家` : "山田家"), familyNameSub: "空欄 = 主な保護者の姓",
  nameEn: "英語表記の氏名", nicknameEn: "ニックネーム（英語）", familyNameEn: "家族名（英語）", optional: "任意",
  gender: "性別", genders: { male: "男", female: "女" }, genderNone: "回答しない",
  rel: { guardian: "その他", dad: "父", mom: "母", relative: "親族" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "来校", phone: "電話", website: "ウェブサイト", referral: "ご紹介", other: "その他" },
}

export const DICT: Record<FormLang, Dict> = { th, en, ja }
export type RelKey = keyof Dict["rel"]
/** owner 2026-10-12: the same four as staff see (ผู้ปกครอง · พ่อ · แม่ · ญาติ) */
export const REL_KEYS: RelKey[] = ["dad", "mom", "relative", "guardian"]
/** what is stored never changes with the label shown (owner 2026-11-20: the menu reads Father · Mother · Relative · Others) */
const REL_STORED: Record<RelKey, string> = { guardian: "ผู้ปกครอง", dad: "พ่อ", mom: "แม่", relative: "ญาติ" }
export const SOURCE_KEYS: LeadSource[] = ["line", "facebook", "walkin", "referral", "website", "phone", "other"]

/** staff read relationships in Thai — store the Thai word whatever language the parent used */
export const relToStored = (k: RelKey) => REL_STORED[k]
/** stored (Thai or free text) → key, so a pre-filled "คุณแม่" shows as "Mother" on an English form */
export const relFromStored = (v?: string): RelKey | "" => { const n = normalizeRelation(v); return n ? REL_KEYS.find((k) => REL_STORED[k] === n) ?? "" : "" }

const LOCALE: Record<FormLang, string> = { th: "th-TH", en: "en-GB", ja: "ja-JP" }
/** "อ. 30 ก.ย." / "Tue 30 Sep" / "9月30日(火)" */
export function fmtFormDate(d: string, lang: FormLang) {
  const [y, m, day] = d.split("-").map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, day))
}

/** birth dates with the year: "12 มี.ค. 2558" / "12 Mar 2015" / "2015年3月12日" */
export function fmtBirth(d: string, lang: FormLang) {
  const [y, m, day] = d.split("-").map(Number)
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, day))
}
