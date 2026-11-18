// "ใช้ตำแหน่งปัจจุบัน" fills the address fields by itself (owner 2026-11-18): the pin's coordinates → an address, so the
// parent only types what the map cannot know (house number…). OpenStreetMap Nominatim — no API key, the same map the pin
// uses. The prototype calls it straight from the browser; the real system should use its own geocoder (Nominatim asks for
// at most 1 request/second and is not meant for production traffic).

export interface FoundAddress { province: string; postcode: string; line: string; area: string }

interface Nominatim { address?: Record<string, string> }

/** Thai addresses on OSM: road + house number → the address line; แขวง/ตำบล + เขต/อำเภอ → the area; state → province */
export function addressFromNominatim(j: Nominatim): FoundAddress | null {
  const a = j.address
  if (!a) return null
  const province = (a.state ?? a.province ?? a.city ?? "").replace(/^(จังหวัด|Province of)\s*/i, "").trim()
  const sub = (a.suburb ?? a.subdistrict ?? a.quarter ?? a.neighbourhood ?? a.village ?? "").trim()
  const district = (a.city_district ?? a.district ?? a.county ?? "").trim()
  const line = [a.house_number, a.road].filter(Boolean).join(" ").trim()
  const found = { province, postcode: (a.postcode ?? "").trim(), line, area: [sub, district].filter(Boolean).join(" ") }
  return found.province || found.postcode || found.line || found.area ? found : null
}

export async function reverseGeocode(lat: number, lng: number, lang = "th"): Promise<FoundAddress | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=${lang}&lat=${lat}&lon=${lng}`)
    if (!r.ok) return null
    return addressFromNominatim((await r.json()) as Nominatim)
  } catch { return null }
}
