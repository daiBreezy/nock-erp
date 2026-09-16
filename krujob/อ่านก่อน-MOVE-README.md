# วิธีย้าย KruJob ไปเครื่องใหม่ + ทำต่อด้วย Claude

## ในโฟลเดอร์นี้มีอะไร
```
krujob-transfer/
├── krujob-proto.html          ← ตัว prototype (เปิด Chrome ได้เลย)
├── CLAUDE.md                  ← context โปรเจกต์ (Claude อ่านอัตโนมัติ)
├── อ่านก่อน-MOVE-README.md      ← ไฟล์นี้
└── claude-memory-backup/      ← memory เดิม (สำรองไว้ ไม่บังคับใช้)
```

## ขั้นตอน (3 สเต็ป)

### 1) ย้ายทั้งโฟลเดอร์ `krujob-transfer` ไปเครื่องใหม่
เลือกวิธีไหนก็ได้: **AirDrop** (Mac→Mac ง่ายสุด) · iCloud/Google Drive/Dropbox · USB

### 2) เปิดดู prototype
ดับเบิลคลิก `krujob-proto.html` → เปิดใน Chrome
- ต้องต่อเน็ต (ฟอนต์ + Google Maps มาจาก internet)

### 3) ทำงานต่อด้วย Claude Code
1. ติดตั้ง Claude Code บนเครื่องใหม่ + login บัญชีเดิม (`nockacademylms@gmail.com`)
2. เปิด terminal มาที่โฟลเดอร์นี้ แล้วรัน `claude`
3. Claude จะอ่าน `CLAUDE.md` อัตโนมัติ → ได้ context ครบ (โปรเจกต์คืออะไร, ทำอะไรไปแล้ว, gotcha, งานที่ค้าง) ทำต่อได้เลย

> ✅ วิธีนี้ context เดินทางไปกับโฟลเดอร์ ไม่ต้องยุ่งกับ path ของ memory เดิม

## (ไม่บังคับ) ถ้าอยากได้ memory ระบบเดิมด้วย
memory ของ Claude Code ผูกกับ path โฟลเดอร์ ถ้าอยากย้ายจริงๆ:
1. บนเครื่องใหม่ เปิด Claude ในโฟลเดอร์นี้ 1 ครั้ง (จะสร้าง `~/.claude/projects/<slug>/memory/`)
2. ก็อปไฟล์จาก `claude-memory-backup/` ไปวางในโฟลเดอร์ memory นั้น
- แต่ปกติ **แค่ CLAUDE.md ก็พอ** ไม่ต้องทำขั้นนี้

## เริ่มงานต่อ พิมพ์บอก Claude ได้เลย เช่น
- "ทำต่อฝั่งโรงเรียน — ลงประกาศงาน + ATS"
- "อ่าน CLAUDE.md แล้วสรุปว่าเราทำอะไรไปแล้วบ้าง"
