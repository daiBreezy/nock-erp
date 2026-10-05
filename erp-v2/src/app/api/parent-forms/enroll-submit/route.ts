import { NextResponse } from "next/server"
import { submitEnroll } from "@/server/parent-form-store"
import { recordInboundMessage } from "@/server/line-store"
import type { EnrollSubmission } from "@/domain/types"

// Parent page: send the enroll-now form. Shows up in the family's Inbox thread when it came from LINE.
export async function POST(req: Request) {
  let body: { token?: string } & Partial<EnrollSubmission>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.token || !body.parents?.length || !body.children?.length || !body.acceptedTerms) return NextResponse.json({ ok: false, error: "ข้อมูลไม่ครบ" }, { status: 400 })
  const { token, ...rest } = body
  const r = await submitEnroll(token, {
    lineUserId: rest.lineUserId, lineName: rest.lineName, parents: rest.parents!, familyAddress: rest.familyAddress, familyPostcode: rest.familyPostcode, familyProvince: rest.familyProvince,
    familyLocation: rest.familyLocation, familyAddressNote: rest.familyAddressNote, acquisitions: rest.acquisitions, taxInfo: rest.taxInfo, children: rest.children!, acceptedTerms: true, lang: rest.lang ?? "th",
  })
  if (!r.ok) return NextResponse.json(r)
  if (rest.lineUserId) await recordInboundMessage(rest.lineUserId, rest.lineName ?? null, `📝 ส่งใบสมัครเรียน: ${rest.children!.map((c) => c.nickname || c.name).join(", ")}`).catch(() => undefined)
  return NextResponse.json({ ok: true, id: r.submission.id })
}
