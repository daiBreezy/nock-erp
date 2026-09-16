#!/bin/bash
# ============================================================
#  เปิด server ทั้งหมดของ NockAcademy monorepo (ดับเบิลคลิกได้)
#  ปิดหน้าต่างนี้ = server ดับ (เลิกใช้แล้วค่อยปิด)
# ============================================================

# หาตำแหน่งโฟลเดอร์ของสคริปต์นี้เอง (ใช้ได้ทุกเครื่อง ไม่ต้องแก้ path)
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

echo "🚀 กำลังเปิด server ทั้งหมด..."
echo ""

# ปิด server เก่าที่ค้างอยู่ (กันเปิดซ้ำ/ port ชน)
for p in 5199 5200 8000; do
  lsof -ti:$p | xargs kill -9 2>/dev/null
done
sleep 1

# เช็คว่าโปรเจกต์ React ลง node_modules แล้วยัง
if [ ! -d "$ROOT/web-app/app/node_modules" ]; then
  echo "⚠️  web-app ยังไม่ได้ลง node_modules — รัน: cd web-app/app && npm install"
fi
if [ ! -d "$ROOT/teacher-portal/web-teacher-app/node_modules" ]; then
  echo "⚠️  teacher-portal ยังไม่ได้ลง node_modules — รัน: cd teacher-portal/web-teacher-app && npm install"
fi

# เปิด server 3 ตัว (รันเบื้องหลังในหน้าต่างนี้)
( cd "$ROOT/web-app/app" && npm run dev -- --port 5199 --strictPort ) >/tmp/nock-webapp.log 2>&1 &
( cd "$ROOT/teacher-portal/web-teacher-app" && npm run dev -- --port 5200 --strictPort ) >/tmp/nock-teacher.log 2>&1 &
( cd "$ROOT" && python3 -m http.server 8000 ) >/tmp/nock-static.log 2>&1 &

sleep 4
echo ""
echo "=================================================================="
echo "✅ Server พร้อมแล้ว! ก็อปลิงก์ไปเปิดในเบราว์เซอร์:"
echo ""
echo "   Web App          →  http://localhost:5199/"
echo "   Web Teacher      →  http://localhost:5200/"
echo "   ERP              →  http://localhost:8000/new-erp/index.html"
echo "   KruJob           →  http://localhost:8000/krujob/krujob-proto.html"
echo "   Web Landing/Learn →  http://localhost:8000/web-app/prototypes/landing-page.html"
echo ""
echo "⚠️  อย่าปิดหน้าต่างนี้ระหว่างใช้งาน (ปิด = server ดับ)"
echo "    เลิกใช้แล้ว: ปิดหน้าต่างนี้ได้เลย server จะดับเอง"
echo "=================================================================="
echo ""

# รอไว้ไม่ให้หน้าต่างปิด (server จะรันต่อไปเรื่อยๆ จนกว่าจะปิดหน้าต่าง)
wait
