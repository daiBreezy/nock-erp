// ข้อมูลสาขา NockAcademy School — ใช้กับ /school (list) + /school/:branch (template)
// แหล่งข้อมูลจริง (ดึง 2026-10-26):
//   · Google Sheet "NA WEB" → ที่ตั้ง/เบอร์/LINE OA/Facebook/ครู
//   · Google Sheet "Data for Import" → คอร์ส (Course) ต่อสาขา
//   ⏳ ยัง mock: ที่อยู่ข้อความ · ตารางเรียน · รูปห้องเรียน · รีวิว · โพสต์ FB
import clsA from '../assets/media/Screenshot00004.png'
import clsB from '../assets/media/Screenshot00006.png'
import clsC from '../assets/media/Screenshot00007.png'
import clsD from '../assets/media/Screenshot00005.png'
import { CLASS_RAW } from './schoolClasses'

export type Region = 'กรุงเทพฯ' | 'ชลบุรี'
export type FbPost = { date: string; text: string; image?: string; likes: number; comments: number; url: string }
export type Teacher = { name: string; subject: string; fullName?: string; photo?: string }
/** คลาสในตารางเรียนของสาขา (จริง จาก Sheet) — วัน · เวลา · วิชา (ชื่อสั้น) · ชั้น (ว่าง = ไม่ระบุ) */
export type ClassRow = { day: string; start: string; end: string; subjects: string[]; grades: string[] }
export type Course = { name: string; duration: string; subjects: string[]; grade: string; levels: string[]; price: number; fee?: number }

export type Branch = {
  slug: string
  area: string
  name: string
  region: Region
  tagline: string
  heading: string
  titleKeyword: string
  cover: string
  lat: number
  lng: number
  mapUrl: string
  address: string
  directions: string[]
  hours: { day: string; time: string }[]
  phone: string
  lineId: string
  lineUrl: string
  facebookUrl: string
  facebookPosts: FbPost[]
  courses: Course[]
  subjectTags: string[]
  levelTags: string[]
  classes: ClassRow[]
  teachers: Teacher[]
  classroomPhotos: string[]
  testimonials: { quote: string; name: string; result?: string }[]
}

const PHOTOS = [clsA, clsB, clsC, clsD]

/* ---- ยัง mock ---- */
const COMMON_HOURS = [
  { day: 'จันทร์ – ศุกร์', time: '15:00 – 20:00 น.' },
  { day: 'เสาร์ – อาทิตย์', time: '09:00 – 17:00 น.' },
  { day: 'วันหยุดนักขัตฤกษ์', time: 'ปิดทำการ' },
]
const COMMON_TESTIMONIALS = [
  { quote: 'ลูกสอบเข้า ม.1 ได้ เพราะติวที่นี่มาตั้งแต่ ป.5 ครูดูแลดีมากค่ะ', name: 'คุณแม่น้องปีใหม่', result: 'สอบติด ม.1' },
  { quote: 'จากเกรดเลข 2 ขึ้นมา 3.5 ภายในเทอมเดียว', name: 'น้องพลอย ม.3', result: 'เกรดคณิต 2.0 → 3.5' },
  { quote: 'บรรยากาศเรียนเป็นกันเอง ถามได้ตลอด ไม่กดดัน', name: 'น้องเจ ม.5' },
]
const COMMON_FB_POSTS: FbPost[] = [
  { date: '3 วันที่แล้ว', text: 'เปิดรับสมัครคอร์สติวเข้ม สอบกลางภาคแล้ววันนี้! สมัคร 2 วิชาขึ้นไป รับส่วนลดทันที 10% ทักแชทจองที่นั่งได้เลยค่ะ', image: clsB, likes: 128, comments: 14, url: '#' },
  { date: '1 สัปดาห์ที่แล้ว', text: 'ยินดีกับน้องๆ ที่สอบเข้า ม.1 โรงเรียนในฝันได้ทุกคนนะคะ ภูมิใจในตัวน้องๆ มากค่ะ 💪', image: clsD, likes: 342, comments: 56, url: '#' },
  { date: '2 สัปดาห์ที่แล้ว', text: 'ตารางติว Summer 2026 มาแล้ว! ครบทั้ง 4 วิชาหลัก เรียนสดที่สาขา พร้อมทบทวนย้อนหลังได้ตลอด', likes: 97, comments: 8, url: '#' },
  { date: '3 สัปดาห์ที่แล้ว', text: 'บรรยากาศห้องเรียนสนุกทุกคาบ น้องๆ ตั้งใจเรียนกันมาก ขอบคุณผู้ปกครองที่ไว้วางใจ NockAcademy นะคะ', image: clsC, likes: 156, comments: 21, url: '#' },
]

// ชื่อจริงครู (Sheet: Teacher) — map จากชื่อเล่น (ไทย) → ชื่อจริง (อังกฤษ)
const TEACHER_FULLNAME: Record<string, string> = {
  'ครูจัมพ์': 'Chedsadakorn Rosfung', 'ครูมุก': 'Naruedee Khenphithak', 'ครูแนตตี้': 'Natthanicha Suyawin',
  'ครูมิวสิค': 'Wijitra Chidchob', 'ครูยี่': 'Kawinnad Kumyan', 'ครูเฟิร์น': 'Kanokwan Jongjaroen',
  'ครูอาเหลียง': 'Pasit Songprasert', 'ครูปอนด์': 'Chitsanupong Sandum', 'ครูแพร์': 'Thamonwan Prombud',
  'ครูจูน': 'Thunchanok Oumkam', 'ครูตึ๋ง': 'Pawon Tantimala', 'ครูมิ้นท์': 'Niraporn Thepbubpa',
  'ครูน้ำฝน': 'Chutikan Chiyadecha', 'ครูหนึ่ง': 'Boonnupab Teepapal', 'ครูกีตาร์': 'Natthaphon Sidakhiao',
  'ครูพลอย': 'Supunsa Soison', 'ครูฟิล์ม': 'Nutcha Panjabud', 'ครูกันฮา': 'Nisakorn Panajapoe',
  'ครูกานต์': 'Nichakan Rueangsri', 'ครูมิ้งค์': 'Supapich Khloiaiam', 'ครูแพรว': 'Jitlada Yaowamalee',
  'ครูเดียร์': 'Pannita Karnjanasrimak', 'ครูมอส': 'Kongpop Pankong', 'ครูกุ๊กกิ๊ก': 'Kanyanat Soisawan',
  'ครูไปป์': 'Sanansit Thongperm', 'ครูโนอี้': 'Jiraporn Seedang', 'ครูบาส': 'Bunyarit Voochaiphum',
  'ครูอิง': 'Sasiprapa Yayod', 'ครูไซน์': 'Nattakarn Thariya', 'ครูพิน': 'Suthawan Thaemmai',
  'ครูแฟง': 'Linlada Suviyanand', 'ครูเพชร': 'Patcharawan Sornyotha', 'ครูแพร': 'Pimnara Sangkaew',
  'ครูปาล์มมี่': 'Jidapha Kulthanaphakdee', 'ครูกริก': 'Suphatta Sumingsalee',
}

/* ---- คอร์สจริง (Sheet: Data for Import) ---- */
const SUBJ: Record<string, string> = { Eng: 'อังกฤษ', Math: 'คณิต', Science: 'วิทย์' }
const SUBJ_ORDER = ['คณิต', 'อังกฤษ', 'วิทย์', 'ไทย']
const LEVEL_ORDER = ['ประถม', 'ม.ต้น', 'ม.ปลาย']
const short = (n: number) => (n <= 6 ? `ป.${n}` : `ม.${n - 6}`)
const toLevel = (n: number) => (n <= 6 ? 'ประถม' : n <= 9 ? 'ม.ต้น' : 'ม.ปลาย')
const durThai = (d: string) => d.replace(' h', ' ชม.').replace(' m', ' เดือน').replace(' w', ' สัปดาห์')

// RawCourse = [name, duration, subjectsCsv, gradesCsv, price, fee?]
type RawCourse = [string, string, string, string, number, number?]
function buildCourses(raw: RawCourse[]): Course[] {
  return raw.map(([name, d, s, g, price, fee]) => {
    const nums = g.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n))
    const sorted = [...nums].sort((a, b) => a - b)
    return {
      name,
      duration: durThai(d),
      subjects: s.split(',').map((x) => SUBJ[x.trim()] ?? x.trim()),
      grade: sorted.length > 1 ? `${short(sorted[0])}–${short(sorted[sorted.length - 1])}` : short(sorted[0]),
      levels: [...new Set(nums.map(toLevel))],
      price,
      fee,
    }
  })
}

const COURSE_RAW: Record<string, RawCourse[]> = {
  bangna: [
    ['ติวสอบเข้า ม.1', '1 m', 'Eng, Math, Science', '5,6', 5900, 1500],
    ['คณิต ประถม', '24 h', 'Math', '1,2,3,4,5,6', 5600], ['คณิต ประถม', '48 h', 'Math', '1,2,3,4,5,6', 10900],
    ['คณิต ม.ต้น', '24 h', 'Math', '7,8,9', 6200], ['คณิต ม.ต้น', '48 h', 'Math', '7,8,9', 11900],
    ['วิทย์ ป.4-6', '24 h', 'Science', '1,2,3,4,5,6', 6200], ['วิทย์ ป.4-6', '48 h', 'Science', '1,2,3,4,5,6', 11900],
    ['วิทย์ ม.ต้น', '24 h', 'Science', '7,8,9', 6900], ['วิทย์ ม.ต้น', '48 h', 'Science', '7,8,9', 12900],
    ['อังกฤษ ประถม', '24 h', 'Eng', '1,2,3,4,5,6', 6700], ['อังกฤษ ประถม', '48 h', 'Eng', '1,2,3,4,5,6', 12900],
    ['อังกฤษ ม.ต้น', '24 h', 'Eng', '7,8,9', 6900], ['อังกฤษ ม.ต้น', '48 h', 'Eng', '7,8,9', 12900],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Eng', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Math', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Science', '1,2,3,4,5,6,7,8,9', 1990],
  ],
  'paradise-park': [
    ['อังกฤษประถม', '24 h', 'Eng', '1,2,3,4,5,6', 6700], ['อังกฤษประถม', '48 h', 'Eng', '1,2,3,4,5,6', 12900],
    ['อังกฤษมัธยมต้น', '24 h', 'Eng', '7,8,9', 6900], ['อังกฤษมัธยมต้น', '48 h', 'Eng', '7,8,9', 12900],
    ['อังกฤษมัธยมปลาย', '24 h', 'Eng', '10,11,12', 7900], ['อังกฤษมัธยมปลาย', '48 h', 'Eng', '10,11,12', 14900],
    ['คณิตศาสตร์ประถม', '24 h', 'Math', '1,2,3,4,5,6', 5600], ['คณิตศาสตร์ประถม', '48 h', 'Math', '1,2,3,4,5,6', 10900],
    ['คณิตศาสตร์มัธยมต้น', '24 h', 'Math', '7,8,9', 6200], ['คณิตศาสตร์มัธยมต้น', '48 h', 'Math', '7,8,9', 11900],
    ['คณิตศาสตร์มัธยมปลาย', '24 h', 'Math', '10,11,12', 7900], ['คณิตศาสตร์มัธยมปลาย', '48 h', 'Math', '10,11,12', 14900],
    ['คอร์สปิดเทอมตุลาคม', '24 h', 'Eng', '4,5,6', 6700], ['คอร์สปิดเทอมตุลาคม', '24 h', 'Math', '4,5,6', 5600],
    ['คอร์สปิดเทอมตุลาคม', '24 h', 'Science', '4,5,6', 6200],
    ['วิทยาศาสตร์มัธยมต้น', '24 h', 'Science', '7,8,9', 6900], ['วิทยาศาสตร์มัธยมต้น', '48 h', 'Science', '7,8,9', 12900],
    ['วิทยาศาสตร์มัธยมปลาย', '24 h', 'Science', '10,11,12', 7900], ['วิทยาศาสตร์มัธยมปลาย', '48 h', 'Science', '10,11,12', 14900],
    ['ติวเข้า ม.1', '1 m', 'Eng, Math, Science', '5,6', 5900, 1500],
  ],
  ramkhamhaeng: [
    ['ติวเข้า ม.1', '1 m', 'Eng, Math, Science', '5,6', 5900, 1500],
    ['คณิตศาสตร์ประถม', '24 h', 'Math', '1,2,3,4,5,6', 5600], ['คณิตศาสตร์ประถม', '48 h', 'Math', '1,2,3,4,5,6', 10900],
    ['คณิตศาสตร์มัธยมต้น', '24 h', 'Math', '7,8,9', 6200], ['คณิตศาสตร์มัธยมต้น', '48 h', 'Math', '7,8,9', 11900],
    ['วิทยาศาสตร์ ป.4-6', '24 h', 'Science', '1,2,3,4,5,6', 6200], ['วิทยาศาสตร์ ป.4-6', '48 h', 'Science', '1,2,3,4,5,6', 11900],
    ['วิทยาศาสตร์มัธยมต้น', '24 h', 'Science', '7,8,9', 6900], ['วิทยาศาสตร์มัธยมต้น', '48 h', 'Science', '7,8,9', 12900],
    ['ภาษาอังกฤษประถม', '24 h', 'Eng', '1,2,3,4,5,6', 6700], ['ภาษาอังกฤษประถม', '48 h', 'Eng', '1,2,3,4,5,6', 12900],
    ['ภาษาอังกฤษมัธยมต้น', '24 h', 'Eng', '7,8,9', 6900], ['ภาษาอังกฤษมัธยมต้น', '48 h', 'Eng', '7,8,9', 12900],
    ['คณิตศาสตร์มัธยมปลาย', '24 h', 'Math', '10', 7900], ['คณิตศาสตร์มัธยมปลาย', '48 h', 'Math', '10', 14900],
    ['วิทยาศาสตร์มัธยมปลาย', '24 h', 'Science', '10', 7900], ['วิทยาศาสตร์มัธยมปลาย', '48 h', 'Science', '10', 14900],
    ['ภาษาอังกฤษมัธยมปลาย', '24 h', 'Eng', '10', 7900], ['ภาษาอังกฤษมัธยมปลาย', '48 h', 'Eng', '10', 14900],
    ['คอร์สปิดเทอมตุลาคม', '4 w', 'Eng', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '4 w', 'Math', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '4 w', 'Science', '1,2,3,4,5,6,7,8,9', 1990],
  ],
  'green-place': [
    ['ติวเข้า ม.1', '1 m', 'Eng, Math, Science', '5,6', 5900, 1500],
    ['คณิตศาสตร์ประถม', '24 h', 'Math', '1,2,3,4,5,6', 5600], ['คณิตศาสตร์ประถม', '48 h', 'Math', '1,2,3,4,5,6', 10900],
    ['คณิตศาสตร์มัธยมต้น', '24 h', 'Math', '7,8,9', 6200], ['คณิตศาสตร์มัธยมต้น', '48 h', 'Math', '7,8,9', 11900],
    ['วิทยาศาสตร์ ป.4-6', '24 h', 'Science', '1,2,3,4,5,6', 6200], ['วิทยาศาสตร์ ป.4-6', '48 h', 'Science', '1,2,3,4,5,6', 11900],
    ['วิทยาศาสตร์มัธยมต้น', '24 h', 'Science', '7,8,9', 6900], ['วิทยาศาสตร์มัธยมต้น', '48 h', 'Science', '7,8,9', 12900],
    ['ภาษาอังกฤษประถม', '24 h', 'Eng', '1,2,3,4,5,6', 6700], ['ภาษาอังกฤษประถม', '48 h', 'Eng', '1,2,3,4,5,6', 12900],
    ['ภาษาอังกฤษมัธยมต้น', '24 h', 'Eng', '7,8,9', 6900], ['ภาษาอังกฤษมัธยมต้น', '48 h', 'Eng', '7,8,9', 12900],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Eng', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Math', '1,2,3,4,5,6,7,8,9', 1990],
    ['คอร์สปิดเทอมตุลาคม', '5 w', 'Science', '1,2,3,4,5,6,7,8,9', 1990],
    ['Fun English', '24 h', 'Eng', '1,2,3,4,5,6,7,8,9', 5200], ['Fun English', '48 h', 'Eng', '1,2,3,4,5,6,7,8,9', 10400],
    ['Grammar', '24 h', 'Eng', '1,2,3,4,5,6,7,8,9', 5200], ['Grammar', '48 h', 'Eng', '1,2,3,4,5,6,7,8,9', 10400],
  ],
  tuknam: [
    ['ติวเข้า ม.1', '1 m', 'Math, Science, Eng', '5,6', 4500],
    ['คณิต', '24 h', 'Math', '1,2,3,4,5,6', 4350], ['คณิต', '48 h', 'Math', '1,2,3,4,5,6', 8290],
    ['คณิต ม.ต้น', '24 h', 'Math', '7,8,9', 4770], ['คณิต ม.ต้น', '48 h', 'Math', '7,8,9', 8990],
    ['วิทยาศาสตร์', '24 h', 'Science', '1,2,3,4,5,6', 4700], ['วิทยาศาสตร์', '48 h', 'Science', '1,2,3,4,5,6', 8900],
    ['วิทยาศาสตร์ ม.ต้น', '24 h', 'Science', '7,8,9', 5200], ['วิทยาศาสตร์ ม.ต้น', '48 h', 'Science', '7,8,9', 9900],
    ['อังกฤษ', '24 h', 'Eng', '4,5,6,7,8,9', 5200], ['อังกฤษ', '48 h', 'Eng', '4,5,6,7,8,9', 9900],
    ['อังกฤษ ประถม', '24 h', 'Eng', '1,2,3,4,5,6', 5200], ['อังกฤษ ประถม', '48 h', 'Eng', '1,2,3,4,5,6', 9900],
  ],
  sriracha: [
    ['ติวสอบเข้า ม.1', '1 m', 'Math, Science, Eng', '5,6', 4500],
    ['ติวคณิตประถม', '24 h', 'Math', '1,2,3,4,5,6', 4350], ['ติวคณิตประถม', '48 h', 'Math', '1,2,3,4,5,6', 8290],
    ['ติวคณิต ม.ต้น', '24 h', 'Math', '7,8,9', 4770], ['ติวคณิต ม.ต้น', '48 h', 'Math', '7,8,9', 8990],
    ['ติววิทย์ประถม (2 ชั่วโมง)', '24 h', 'Science', '1,2,3,4,5,6', 4700], ['ติววิทย์ประถม (2 ชั่วโมง)', '48 h', 'Science', '1,2,3,4,5,6', 8900],
    ['ติววิทย์ ม.ต้น (2 ชั่วโมง)', '24 h', 'Science', '7,8,9', 5200], ['ติววิทย์ ม.ต้น (2 ชั่วโมง)', '48 h', 'Science', '7,8,9', 9900],
    ['แกรมม่า', '24 h', 'Eng', '4,5,6,7,8,9', 5200], ['แกรมม่า', '48 h', 'Eng', '4,5,6,7,8,9', 9900],
    ['ฟัง-พูด-อ่าน-เขียน', '24 h', 'Eng', '1,2,3,4,5,6', 5200], ['ฟัง-พูด-อ่าน-เขียน', '48 h', 'Eng', '1,2,3,4,5,6', 9900],
  ],
  pattaya: [
    ['ตะลุยโจทย์ (คณิต)', '24 h', 'Math', '5,6', 4900], ['ตะลุยโจทย์ (วิทย์)', '24 h', 'Science', '5,6', 4900],
    ['ตะลุยโจทย์ (อังกฤษ)', '24 h', 'Eng', '5,6', 4900],
    ['คณิตประถม', '24 h', 'Math', '1,2,3,4,5,6', 4350], ['คณิตประถม', '48 h', 'Math', '1,2,3,4,5,6', 8290],
    ['คณิต ม.ต้น', '24 h', 'Math', '7,8,9', 4770], ['คณิต ม.ต้น', '48 h', 'Math', '7,8,9', 8990],
    ['วิทย์ประถม', '24 h', 'Science', '1,2,3,4,5,6', 4700], ['วิทย์ประถม', '48 h', 'Science', '1,2,3,4,5,6', 8900],
    ['วิทย์ ม.ต้น', '24 h', 'Science', '7,8,9', 5200], ['วิทย์ ม.ต้น', '48 h', 'Science', '7,8,9', 9900],
    ['Grammar', '24 h', 'Eng', '4,5,6,7,8,9', 5200], ['Grammar', '48 h', 'Eng', '4,5,6,7,8,9', 9900],
    ['Fun English', '24 h', 'Eng', '1,2,3,4,5,6', 5200], ['Fun English', '48 h', 'Eng', '1,2,3,4,5,6', 9900],
  ],
  bowin: [
    ['ติวคณิตประถม', '24 h', 'Math', '1,2,3,4,5,6', 4350], ['ติวคณิตประถม', '48 h', 'Math', '1,2,3,4,5,6', 8290],
    ['ติวคณิต ม.ต้น', '24 h', 'Math', '7,8,9', 4770], ['ติวคณิต ม.ต้น', '48 h', 'Math', '7,8,9', 8990],
    ['ติวคณิต ม.ปลาย', '24 h', 'Math', '10,11,12', 5290], ['ติวคณิต ม.ปลาย', '48 h', 'Math', '10,11,12', 9990],
    ['ติววิทย์ประถมปลาย', '24 h', 'Science', '1,2,3,4,5,6', 4700], ['ติววิทย์ประถมปลาย', '48 h', 'Science', '1,2,3,4,5,6', 8900],
    ['ติววิทย์ ม.ต้น', '24 h', 'Science', '7,8,9', 5200], ['ติววิทย์ ม.ต้น', '48 h', 'Science', '7,8,9', 9900],
  ],
}

/* ---- ติดต่อ + ครู จริง (Sheet: NA WEB) — [slug, area, region, lat, lng, mapUrl, phone, lineId, facebookUrl, teachers] ---- */
const T = (name: string, subject: string): Teacher => ({ name, subject })
const RAW: [string, string, Region, number, number, string, string, string, string, Teacher[]][] = [
  ['sriracha', 'ศรีราชา', 'ชลบุรี', 13.1671855, 100.9352627,
    'https://www.google.com/maps/place/NockAcademy+School+%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%B2/@13.1671855,100.859045,13z/data=!4m10!1m2!2m1!1snockacademy+school!3m6!1s0x3102b7d2eed9340f:0x676642696aead9c4!8m2!3d13.1671855!4d100.9352627!16s%2Fg%2F11h0t0yp67',
    '092-271-1752', '@231zkgex', 'https://www.facebook.com/p/NockAcademy-School-%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%B2-61572404511344/',
    [T('ครูจัมพ์', 'คณิตศาสตร์'), T('ครูมุก', 'ภาษาอังกฤษ'), T('ครูแนตตี้', 'อังกฤษ · คณิต'), T('ครูมิวสิค', 'วิทย์ · คณิต'), T('ครูยี่', 'คณิตศาสตร์'), T('ครูเฟิร์น', 'คณิตศาสตร์')]],
  ['bowin', 'บ่อวิน', 'ชลบุรี', 13.025688, 101.1089473,
    'https://www.google.com/maps/place/NockAcademy+School+%E0%B8%9A%E0%B9%88%E0%B8%AD%E0%B8%A7%E0%B8%B4%E0%B8%99/@13.025688,101.1063724,17z/data=!3m1!4b1!4m6!3m5!1s0x3102c38a653c3ee7:0x1c88affb477bd9d6!8m2!3d13.025688!4d101.1089473!16s%2Fg%2F11nqpdt0g5',
    '082-281-4514', '@135fvhqn', 'https://www.facebook.com/p/NockAcademy-School-%E0%B8%9A%E0%B9%88%E0%B8%AD%E0%B8%A7%E0%B8%B4%E0%B8%99-61589901942118/',
    [T('ครูอาเหลียง', 'คณิตศาสตร์'), T('ครูปอนด์', 'คณิตศาสตร์'), T('ครูแพร์', 'วิทยาศาสตร์')]],
  ['pattaya', 'พัทยา', 'ชลบุรี', 12.9643997, 100.9093871,
    'https://www.google.com/maps/place/NockAcademy+School+%E0%B8%A1%E0%B8%B4%E0%B8%99%E0%B8%B4%E0%B8%A1%E0%B8%AD%E0%B8%A5+%E0%B8%9E%E0%B8%B1%E0%B8%97%E0%B8%A2%E0%B8%B2/@12.9643997,100.9068122,17z/data=!3m1!4b1!4m6!3m5!1s0x310297f8c77d1b61:0xebbc688ffe6afb28!8m2!3d12.9643997!4d100.9093871!16s%2Fg%2F11yq9cy09r',
    '080-643-5463', '@367fygel', 'https://www.facebook.com/nockacademypattaya1/?locale=th_TH',
    [T('ครูจูน', 'ภาษาอังกฤษ'), T('ครูตึ๋ง', 'อังกฤษ · คณิต'), T('ครูมิ้นท์', 'คณิตศาสตร์'), T('ครูน้ำฝน', 'วิทย์ · คณิต'), T('ครูหนึ่ง', 'คณิตศาสตร์')]],
  ['tuknam', 'ตึกน้ำ', 'ชลบุรี', 13.3455601, 100.9787992,
    'https://www.google.com/maps/place/@13.3455601,100.9787992,17z/data=!3m1!4b1!4m6!3m5!1s0x311d4be92cacf0df:0xf2f204df360319d9!8m2!3d13.3455601!4d100.9787992!16s%2Fg%2F11mvm8bdl8',
    '086-410-2099', '@358cndqk', 'https://www.facebook.com/NockAcademySchool/?locale=th_TH',
    [T('ครูกีตาร์', 'วิทยาศาสตร์'), T('ครูพลอย', 'คณิตศาสตร์'), T('ครูฟิล์ม', 'ภาษาอังกฤษ'), T('ครูกันฮา', 'ภาษาอังกฤษ'), T('ครูกานต์', 'คณิตศาสตร์'), T('ครูมิ้งค์', 'คณิตศาสตร์'), T('ครูแพรว', 'คณิต · อังกฤษ')]],
  ['bangna', 'บางนา', 'กรุงเทพฯ', 13.6393895, 100.6731063,
    'https://www.google.com/maps/place/NockAcademy+School+%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%99%E0%B8%B2/@13.6393895,100.5968886,13z/data=!4m10!1m2!2m1!1snockacademy+school!3m6!1s0x311d5feb4e7e62b9:0xeb0466d8cfcb9ad7!8m2!3d13.6393895!4d100.6731063!16s%2Fg%2F11yx5x55wf',
    '093-326-1633', '@556riyrg', 'https://www.facebook.com/p/NockAcademy-School-%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%99%E0%B8%B2-61584788877600/',
    [T('ครูเดียร์', 'คณิต · วิทย์'), T('ครูมอส', 'ภาษาอังกฤษ'), T('ครูกุ๊กกิ๊ก', 'คณิตศาสตร์'), T('ครูไปป์', 'วิทย์ · คณิต')]],
  ['paradise-park', 'พาราไดร์ พาร์ค', 'กรุงเทพฯ', 13.6860398, 100.6478202,
    'https://www.google.com/maps/@13.6860398,100.6478202,3a,75y,91.29h,90t/data=!3m7!1e1!3m5!1sV1zO-UvJjjpKHZUQGcYlXA!2e0',
    '063-940-4141', '@074jfqij', 'https://www.facebook.com/profile.php?id=61578298002477',
    [T('ครูโนอี้', 'คณิตศาสตร์'), T('ครูบาส', 'คณิต · วิทย์'), T('ครูอิง', 'ภาษาอังกฤษ'), T('ครูไซน์', 'ภาษาอังกฤษ'), T('ครูพิน', 'คณิตศาสตร์')]],
  ['green-place', 'กรีนเพลส', 'กรุงเทพฯ', 13.7024082, 100.5220679,
    'https://www.google.com/maps/place/NockAcademy+School+%E0%B8%81%E0%B8%A3%E0%B8%B5%E0%B8%99%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%AA/@13.7024082,100.5220679,17z/data=!4m10!1m2!2m1!1snockacademy+school!3m6!1s0x30e299a5a300d0e1:0x573d695be0f89810!8m2!3d13.7024082!4d100.5220679!16s%2Fg%2F11zzzy2604',
    '080-551-9297', '@021twcqn', 'https://www.facebook.com/profile.php?id=61593955576184',
    [T('ครูแฟง', 'ภาษาอังกฤษ'), T('ครูเพชร', 'วิทย์ · คณิต')]],
  ['ramkhamhaeng', 'รามคำแหง', 'กรุงเทพฯ', 13.7767141, 100.6677075,
    'https://www.google.com/maps/place/NockAcademy+School+Little+Walk+%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%84%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%87/@13.7767141,100.5914898,13z/data=!4m10!1m2!2m1!1snockacademy+school!3m6!1s0x311d631486bb7d6f:0x297c8e718d15302e!8m2!3d13.7767141!4d100.6677075!16s%2Fg%2F11z4lqczqj',
    '080-210-4741', '@942zlrwy', 'https://www.facebook.com/p/NockAcademy-School-Little-Walk-%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%84%E0%B8%B3%E0%B9%81%E0%B8%AB%E0%B8%87-61586730716143/',
    [T('ครูแพร', 'คณิตศาสตร์'), T('ครูปาล์มมี่', 'ภาษาอังกฤษ'), T('ครูกริก', 'วิทย์ · คณิต')]],
]

// รูปครูจริง (แปลง/ย่อไว้ที่ public/teachers) — key = `${slug}|${ชื่อเล่นไทย}`
const TP = (slug: string, nick: string) => `/teachers/${slug}-${nick}.jpg`
const TEACHER_PHOTO: Record<string, string> = {
  'bangna|ครูเดียร์': TP('bangna', 'dear'), 'bangna|ครูกุ๊กกิ๊ก': TP('bangna', 'kookik'), 'bangna|ครูมอส': TP('bangna', 'mos'), 'bangna|ครูไปป์': TP('bangna', 'pipe'),
  'green-place|ครูเพชร': TP('green-place', 'petch'),
  'paradise-park|ครูบาส': TP('paradise-park', 'bas'), 'paradise-park|ครูอิง': TP('paradise-park', 'ing'), 'paradise-park|ครูโนอี้': TP('paradise-park', 'noey'), 'paradise-park|ครูพิน': TP('paradise-park', 'pin'), 'paradise-park|ครูไซน์': TP('paradise-park', 'sine'),
  'ramkhamhaeng|ครูกริก': TP('ramkhamhaeng', 'kik'), 'ramkhamhaeng|ครูปาล์มมี่': TP('ramkhamhaeng', 'palmy'), 'ramkhamhaeng|ครูแพร': TP('ramkhamhaeng', 'prae'),
  'bowin|ครูอาเหลียง': TP('bowin', 'ahliang'), 'bowin|ครูปอนด์': TP('bowin', 'pond'),
  'pattaya|ครูจูน': TP('pattaya', 'june'), 'pattaya|ครูมิ้นท์': TP('pattaya', 'mint'), 'pattaya|ครูน้ำฝน': TP('pattaya', 'namfon'), 'pattaya|ครูตึ๋ง': TP('pattaya', 'tueng'),
  'sriracha|ครูเฟิร์น': TP('sriracha', 'fern'), 'sriracha|ครูจัมพ์': TP('sriracha', 'jump'), 'sriracha|ครูมุก': TP('sriracha', 'mook'), 'sriracha|ครูมิวสิค': TP('sriracha', 'music'), 'sriracha|ครูแนตตี้': TP('sriracha', 'natty'), 'sriracha|ครูยี่': TP('sriracha', 'yee'),
  'tuknam|ครูฟิล์ม': TP('tuknam', 'film'), 'tuknam|ครูกีตาร์': TP('tuknam', 'guitar'), 'tuknam|ครูกันฮา': TP('tuknam', 'kanha'), 'tuknam|ครูกานต์': TP('tuknam', 'karn'), 'tuknam|ครูพลอย': TP('tuknam', 'ploy'), 'tuknam|ครูแพรว': TP('tuknam', 'preaw'),
}

// รูปโรงเรียนจริงต่อสาขา (public/school) — ใช้เป็น cover + บรรยากาศห้องเรียน
const SCHOOL_IMG: Record<string, string[]> = {
  bangna: ['/school/bangna-1.jpg'],
  'green-place': ['/school/green-place-1.jpg'],
  'paradise-park': ['/school/paradise-park-1.jpg', '/school/paradise-park-2.jpg'],
  ramkhamhaeng: ['/school/ramkhamhaeng-1.jpg'],
  bowin: ['/school/bowin-1.jpg'],
  pattaya: ['/school/pattaya-1.jpg'],
  sriracha: ['/school/sriracha-1.jpg'],
  tuknam: ['/school/tuknam-1.jpg'],
}

export const branches: Branch[] = RAW.map(([slug, area, region, lat, lng, mapUrl, phone, lineId, facebookUrl, teachers], i) => {
  const imgs = SCHOOL_IMG[slug] ?? [PHOTOS[i % PHOTOS.length]]
  const courses = buildCourses(COURSE_RAW[slug] ?? [])
  const subjectTags = SUBJ_ORDER.filter((s) => courses.some((c) => c.subjects.includes(s)))
  const levelTags = LEVEL_ORDER.filter((l) => courses.some((c) => c.levels.includes(l)))
  return {
    slug,
    area,
    name: `NockAcademy ${area}`,
    region,
    tagline: `สถาบันกวดวิชา NockAcademy สาขา${area} ครบทุกวิชาหลัก สอนโดยติวเตอร์มืออาชีพ`,
    heading: `ที่เรียนพิเศษ ${area} สำหรับนักเรียนประถมและมัธยม`,
    titleKeyword: `กวดวิชา ${area}`,
    cover: imgs[0],
    lat,
    lng,
    mapUrl,
    address: '',
    directions: [],
    hours: COMMON_HOURS,
    phone,
    lineId,
    lineUrl: `https://line.me/R/ti/p/${lineId}`,
    facebookUrl,
    facebookPosts: COMMON_FB_POSTS,
    courses,
    subjectTags,
    levelTags,
    classes: (CLASS_RAW[slug] ?? []).map(([day, start, end, subj, grade]) => ({
      day, start, end, subjects: subj.split(','), grades: grade ? [grade] : [],
    })),
    // รูปครูจริง (public/teachers) · ครูที่ยังไม่มีรูป → undefined (การ์ดจะโชว์ตัวอักษรแทน)
    teachers: teachers.map((t) => ({
      ...t,
      fullName: TEACHER_FULLNAME[t.name],
      photo: TEACHER_PHOTO[`${slug}|${t.name}`],
    })),
    classroomPhotos: imgs,
    testimonials: COMMON_TESTIMONIALS,
  }
})

export function getBranch(slug: string | undefined) {
  return branches.find((b) => b.slug === slug)
}

export const regions: Region[] = ['กรุงเทพฯ', 'ชลบุรี']

/** คลาส Tailwind ของ chip วิชา (ตามสีประจำวิชา) */
export function subjectChipClass(subject: string): string {
  switch (subject) {
    case 'คณิต': return 'bg-subject-math text-subject-math-ink'
    case 'อังกฤษ': return 'bg-subject-english text-subject-english-ink'
    case 'วิทย์': return 'bg-subject-science text-subject-science-ink'
    case 'ไทย': return 'bg-subject-thai text-subject-thai-ink'
    default: return 'bg-surface-2 text-ink-soft'
  }
}
