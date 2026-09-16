// ===== External links (nav bar เดียวกับ marketing) =====
// dev: เสิร์ฟ prototypes/*.html ที่ /site/* (origin เดียวกับแอป) ผ่าน vite middleware
// → Marketing ↔ Learn เด้งไปมากันเองแบบ local (ไม่ไปเว็บจริง)
// TODO: ตอน deploy แก้ MARKETING_BASE เป็น URL/โดเมนจริงของเว็บ marketing
export const MARKETING_BASE = '/site'

// "คลิป" = แอป Learn นี้เอง (internal) · หน้าอื่นเป็น marketing
export const landing = {
  home: `${MARKETING_BASE}/landing-page.html`,
  grade: `${MARKETING_BASE}/grade.html`,
  courses: `${MARKETING_BASE}/courses.html`,
  articles: `${MARKETING_BASE}/articles.html`,
  faq: `${MARKETING_BASE}/faq.html`,
}
