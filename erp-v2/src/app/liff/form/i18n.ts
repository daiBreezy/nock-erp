// Parent form copy in TH / EN / JP (owner 2026-09-29). Default language comes from Settings → System; the parent
// can switch on the form. Stored values stay language-neutral (codes) or Thai (what staff read in the ERP).

import type { FormLang, FormType, LeadSource } from "@/domain/types"

export const LANGS: { key: FormLang; label: string }[] = [{ key: "th", label: "TH" }, { key: "en", label: "EN" }, { key: "ja", label: "JP" }]

const th = {
  formTitle: (t: FormType): string => (t === "test" ? "แบบฟอร์มสอบวัดระดับ" : "แบบฟอร์มทดลองเรียน"),
  hello: (name: string) => `สวัสดีค่ะ คุณ${name}`,
  steps: ["ผู้ปกครอง", "นักเรียน", "ตรวจสอบ"],
  parentTitle: "ผู้ปกครอง", parentSub: "ข้อมูลสำหรับติดต่อ", addParent: "เพิ่มผู้ปกครอง",
  parentN: (n: number) => `ผู้ปกครองคนที่ ${n}`,
  firstName: "ชื่อ", lastName: "นามสกุล", nickname: "ชื่อเล่น", email: "อีเมล", lineId: "LINE ID",
  relationship: "ความสัมพันธ์", birthDate: "วันเกิด", phone: "เบอร์โทร", addPhone: "เพิ่มเบอร์โทร", makeDefault: "ตั้งเป็นเบอร์หลัก", defaultTag: "เบอร์หลัก",
  primaryParent: "ผู้ติดต่อหลัก", acquisition: "รู้จักเราจากช่องทางไหน", select: "เลือก",
  address: "ที่อยู่", addressSub: "ไม่บังคับ", addressLine: "บ้านเลขที่ / อาคาร / ถนน / แขวง / เขต", province: "จังหวัด", postcode: "รหัสไปรษณีย์",
  tax: "ต้องการใบกำกับภาษี", taxSub: "ไม่บังคับ — ใส่ภายหลังได้", taxName: "ชื่อผู้เสียภาษี / บริษัท", taxId: "เลขประจำตัวผู้เสียภาษี", taxAddress: "ที่อยู่สำหรับใบกำกับภาษี", school: "โรงเรียน", addressNote: "รายละเอียดเพิ่มเติม", addressNotePh: "เช่น หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ ประตูสีเขียว", pin: "ปักหมุดบ้านบนแผนที่", pinSub: "แตะแผนที่เพื่อวางหมุด ลากหมุดเพื่อปรับให้ตรง", locate: "ใช้ตำแหน่งปัจจุบัน", busAddress: "ที่อยู่สำหรับรถรับส่ง", acquisitionSub: "เลือกได้หลายข้อ", lineLinked: (n: string) => `เชื่อม LINE แล้ว · ${n}`, commonTimes: (n: number) => (n > 1 ? `เวลาที่สอบได้ทุกวิชาพร้อมกัน · ${n} วิชา = 2 ชม.` : "เลือกวัน-เวลา · 1 ชม."), noCommon: "ไม่มีเวลาที่ว่างพร้อมกันทุกวิชา — ลองลดวิชา หรือติดต่อสถาบัน",
  studentTitle: "นักเรียน", studentSub: "ข้อมูลน้อง + เลือกวิชาและเวลา", addStudent: "เพิ่มนักเรียน", studentN: (n: number) => `นักเรียนคนที่ ${n}`,
  grade: "ระดับชั้น", note: "หมายเหตุ", notePh: "เช่น จุดที่อยากเน้น หรือสิ่งที่ครูควรรู้", age: (n: number) => `อายุ ${n} ปี`,
  subjects: "วิชาที่สนใจ", subjectsSub: "เลือกได้มากกว่า 1 วิชา",
  schedule: (t: FormType): string => (t === "test" ? "เลือกวัน-เวลาสอบ" : "เลือกวัน-เวลาทดลองเรียน"),
  sameDay: "หลายวิชาวันเดียวกันต้องเวลาเดียวกัน (1 วิชา 1 ชม. · 2 วิชาขึ้นไป 2 ชม.)",
  summaryTitle: "ตรวจสอบข้อมูล", summarySub: "ตรวจให้ถูกต้องก่อนส่งให้สถาบัน", family: "ครอบครัว",
  edit: "แก้ไข", done: "เสร็จ", remove: "ลบ", back: "ย้อนกลับ", next: "ถัดไป", cancel: "ยกเลิก", submit: "ส่งฟอร์ม",
  known: "ข้อมูลที่เคยให้ไว้ — แก้ไขได้ถ้ามีอะไรเปลี่ยน",
  sent: (t: FormType) => `ส่ง${t === "test" ? "แบบฟอร์มสอบวัดระดับ" : "แบบฟอร์มทดลองเรียน"}แล้ว`, sentSub: "ขอบคุณค่ะ ทางสถาบันจะยืนยันนัดทาง LINE เร็วๆ นี้",
  opening: "กำลังเปิดฟอร์ม…", previewBadge: "โหมดดูตัวอย่าง — ไม่ส่งข้อมูลจริง",
  required: "ช่องที่มี * ต้องกรอก",
  rel: { mom: "คุณแม่", dad: "คุณพ่อ", guardian: "ผู้ปกครอง", grandparent: "ปู่ย่าตายาย", other: "อื่นๆ" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "Walk-in", phone: "โทรศัพท์", website: "เว็บไซต์", referral: "คนแนะนำ", other: "อื่นๆ" } as Record<LeadSource, string>,
}

type Dict = typeof th

const en: Dict = {
  formTitle: (t) => (t === "test" ? "Placement test form" : "Trial class form"),
  hello: (name) => `Hello ${name}`,
  steps: ["Parent", "Student", "Review"],
  parentTitle: "Parent / Guardian", parentSub: "Contact details", addParent: "Add another parent",
  parentN: (n) => `Parent ${n}`,
  firstName: "First name", lastName: "Surname", nickname: "Nickname", email: "Email", lineId: "LINE ID",
  relationship: "Relationship", birthDate: "Date of birth", phone: "Phone", addPhone: "Add phone number", makeDefault: "Set as default", defaultTag: "Default",
  primaryParent: "Main contact", acquisition: "How did you hear about us?", select: "Select",
  address: "Address", addressSub: "Optional", addressLine: "House no. / building / road / district", province: "Province", postcode: "Post code",
  tax: "I need a tax invoice", taxSub: "Optional — can be added later", taxName: "Taxpayer / company name", taxId: "Tax ID number", taxAddress: "Tax invoice address", school: "School", addressNote: "Directions", addressNotePh: "e.g. Pruksa village, Soi 2, house on the left, green gate", pin: "Pin your home on the map", pinSub: "Tap the map to drop the pin, drag it to adjust", locate: "Use my location", busAddress: "Address for the school bus", acquisitionSub: "Choose all that apply", lineLinked: (n) => `LINE connected · ${n}`, commonTimes: (n) => (n > 1 ? `Times that fit all ${n} subjects together · 2 h` : "Choose a date & time · 1 h"), noCommon: "No time fits all subjects together — pick fewer subjects or contact us",
  studentTitle: "Student", studentSub: "Your child + subjects and time", addStudent: "Add another student", studentN: (n) => `Student ${n}`,
  grade: "Grade", note: "Note", notePh: "e.g. what to focus on, anything the teacher should know", age: (n) => `Age ${n}`,
  subjects: "Subjects of interest", subjectsSub: "You can choose more than one",
  schedule: (t) => (t === "test" ? "Choose test date & time" : "Choose trial date & time"),
  sameDay: "Several subjects on the same day share one time (1 subject 1 h · 2+ subjects 2 h)",
  summaryTitle: "Review", summarySub: "Please check before sending to the school", family: "Family",
  edit: "Edit", done: "Done", remove: "Remove", back: "Back", next: "Next", cancel: "Cancel", submit: "Submit & send",
  known: "Details you gave us before — edit if anything changed",
  sent: (t) => `Your ${t === "test" ? "test" : "trial"} form has been sent`, sentSub: "Thank you! We will confirm the appointment on LINE shortly.",
  opening: "Opening form…", previewBadge: "Preview mode — nothing is sent",
  required: "Fields marked * are required",
  rel: { mom: "Mother", dad: "Father", guardian: "Guardian", grandparent: "Grandparent", other: "Other" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "Walk-in", phone: "Phone", website: "Website", referral: "Referral", other: "Other" },
}

const ja: Dict = {
  formTitle: (t) => (t === "test" ? "レベルチェック申込フォーム" : "体験レッスン申込フォーム"),
  hello: (name) => `${name}様`,
  steps: ["保護者", "生徒", "確認"],
  parentTitle: "保護者", parentSub: "ご連絡先", addParent: "保護者を追加",
  parentN: (n) => `保護者 ${n}`,
  firstName: "名", lastName: "姓", nickname: "ニックネーム", email: "メール", lineId: "LINE ID",
  relationship: "続柄", birthDate: "生年月日", phone: "電話番号", addPhone: "電話番号を追加", makeDefault: "メインに設定", defaultTag: "メイン",
  primaryParent: "主な連絡先", acquisition: "当校を知ったきっかけ", select: "選択",
  address: "住所", addressSub: "任意", addressLine: "番地・建物・通り・地区", province: "県", postcode: "郵便番号",
  tax: "領収書（タックスインボイス）が必要", taxSub: "任意 — 後からでも追加できます", taxName: "納税者名／会社名", taxId: "納税者番号", taxAddress: "インボイス用住所", school: "学校", addressNote: "補足（道順など）", addressNotePh: "例：プルクサ村 ソイ2 左手の緑の門の家", pin: "地図で自宅にピンを立てる", pinSub: "地図をタップしてピン、ドラッグで調整", locate: "現在地を使う", busAddress: "送迎バス用の住所", acquisitionSub: "複数選択できます", lineLinked: (n) => `LINE連携済み · ${n}`, commonTimes: (n) => (n > 1 ? `${n}科目を同時に受けられる時間 · 2時間` : "日時を選択 · 1時間"), noCommon: "全科目が同時に受けられる時間がありません — 科目を減らすかお問い合わせください",
  studentTitle: "生徒", studentSub: "お子様の情報と科目・日時", addStudent: "生徒を追加", studentN: (n) => `生徒 ${n}`,
  grade: "学年", note: "備考", notePh: "例：重点的に見てほしい点など", age: (n) => `${n}歳`,
  subjects: "希望科目", subjectsSub: "複数選択できます",
  schedule: (t) => (t === "test" ? "テスト日時を選択" : "体験日時を選択"),
  sameDay: "同じ日の複数科目は同じ時間になります（1科目1時間・2科目以上2時間）",
  summaryTitle: "確認", summarySub: "送信前に内容をご確認ください", family: "ご家族",
  edit: "編集", done: "完了", remove: "削除", back: "戻る", next: "次へ", cancel: "キャンセル", submit: "送信する",
  known: "以前ご登録いただいた情報です — 変更があれば編集してください",
  sent: (t) => (t === "test" ? "レベルチェックの申込を送信しました" : "体験レッスンの申込を送信しました"), sentSub: "ありがとうございます。LINEで日時を確定いたします。",
  opening: "フォームを開いています…", previewBadge: "プレビュー — 送信されません",
  required: "* は必須項目です",
  rel: { mom: "母", dad: "父", guardian: "保護者", grandparent: "祖父母", other: "その他" },
  src: { line: "LINE OA", facebook: "Facebook", walkin: "来校", phone: "電話", website: "ウェブサイト", referral: "ご紹介", other: "その他" },
}

export const DICT: Record<FormLang, Dict> = { th, en, ja }
export type RelKey = keyof Dict["rel"]
export const REL_KEYS: RelKey[] = ["mom", "dad", "guardian", "grandparent", "other"]
export const SOURCE_KEYS: LeadSource[] = ["line", "facebook", "walkin", "referral", "website", "phone", "other"]

/** staff read relationships in Thai — store the Thai word whatever language the parent used */
export const relToStored = (k: RelKey) => th.rel[k]
/** stored (Thai or free text) → key, so a pre-filled "คุณแม่" shows as "Mother" on an English form */
export const relFromStored = (v?: string): RelKey | "" => (REL_KEYS.find((k) => th.rel[k] === v || en.rel[k] === v || ja.rel[k] === v) ?? (v ? "other" : ""))

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
