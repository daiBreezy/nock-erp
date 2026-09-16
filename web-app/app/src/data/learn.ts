import type { SubjectKey } from './mock'

export type Video = {
  id: string
  title: string
  duration: string
  free: boolean
  watched: boolean
}

export type ClipGroup = {
  id: string
  title: string
  grade: string
  videos: Video[]
}

export const subjectMeta: Record<SubjectKey, { label: string; tone: string }> = {
  english: { label: 'ภาษาอังกฤษ', tone: 'bg-subject-english text-subject-english-ink' },
  thai: { label: 'ภาษาไทย', tone: 'bg-subject-thai text-subject-thai-ink' },
  math: { label: 'คณิตศาสตร์', tone: 'bg-subject-math text-subject-math-ink' },
  science: { label: 'วิทยาศาสตร์', tone: 'bg-subject-science text-subject-science-ink' },
}

function vids(prefix: string, names: string[], freeCount = 1): Video[] {
  return names.map((title, i) => ({
    id: `${prefix}-${i + 1}`,
    title,
    duration: `${8 + ((i * 3) % 14)}:${(i * 17) % 60 < 10 ? '0' : ''}${(i * 17) % 60}`,
    free: i < freeCount,
    watched: i === 0,
  }))
}

export const clipGroups: Record<SubjectKey, ClipGroup[]> = {
  math: [
    { id: 'm-g1', title: 'จำนวนและพีชคณิต', grade: 'ม.1', videos: vids('m1', ['จำนวนเต็ม', 'การบวกลบจำนวนเต็ม', 'การคูณหารจำนวนเต็ม', 'เลขยกกำลัง']) },
    { id: 'm-g2', title: 'สมการเชิงเส้นตัวแปรเดียว', grade: 'ม.1', videos: vids('m2', ['แนะนำสมการ', 'การแก้สมการ', 'โจทย์ปัญหาสมการ']) },
    { id: 'm-g3', title: 'อัตราส่วนและร้อยละ', grade: 'ม.2', videos: vids('m3', ['อัตราส่วน', 'สัดส่วน', 'ร้อยละในชีวิตจริง']) },
  ],
  english: [
    { id: 'e-g1', title: 'Tenses พื้นฐาน', grade: 'ม.1', videos: vids('e1', ['Present Simple', 'Present Continuous', 'Past Simple']) },
    { id: 'e-g2', title: 'Vocabulary Building', grade: 'ม.2', videos: vids('e2', ['คำศัพท์หมวดบ้าน', 'คำศัพท์หมวดโรงเรียน']) },
  ],
  thai: [
    { id: 't-g1', title: 'หลักภาษาไทย', grade: 'ม.1', videos: vids('t1', ['คำนาม คำสรรพนาม', 'คำกริยา', 'คำวิเศษณ์']) },
    { id: 't-g2', title: 'วรรณคดี', grade: 'ม.2', videos: vids('t2', ['รามเกียรติ์ ตอนที่ 1', 'อิเหนา']) },
  ],
  science: [
    { id: 's-g1', title: 'แรงและการเคลื่อนที่', grade: 'ม.3', videos: vids('s1', ['ความเร็วและความเร่ง', 'กฎการเคลื่อนที่', 'แรงเสียดทาน']) },
    { id: 's-g2', title: 'ไฟฟ้า', grade: 'ม.3', videos: vids('s2', ['กระแสไฟฟ้า', 'วงจรไฟฟ้า']) },
  ],
}

export function findVideo(subject: SubjectKey, videoId: string) {
  for (const g of clipGroups[subject]) {
    const v = g.videos.find((x) => x.id === videoId)
    if (v) return { group: g, video: v }
  }
  return null
}
