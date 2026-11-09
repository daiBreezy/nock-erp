import type { AddressParts } from "../types"

/** The one-line address (what invoices, the driver sheet and reports read) from the two lean parts: line + area. */
export function composeAddress(parts: AddressParts | undefined): string {
  return [parts?.line, parts?.area].map((x) => (x ?? "").trim()).filter(Boolean).join(" ")
}

/** a saved address with no parts (older records) opens as the address line = the whole line, so nothing is lost and it can be refined */
export const addressPartsOf = (address: string | undefined, parts: AddressParts | undefined): AddressParts => parts ?? (address?.trim() ? { line: address.trim() } : {})
