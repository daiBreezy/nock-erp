"use client"

/** Pay-slip photo → small JPEG data URL (prototype keeps everything in localStorage, so a phone photo
 *  has to shrink to ~100 KB before it is stored on the payment). */
export async function slipDataUrl(file: File, maxSide = 900): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error("อ่านรูปไม่ได้"))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.75)
  } finally {
    URL.revokeObjectURL(url)
  }
}
