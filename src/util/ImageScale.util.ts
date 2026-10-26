// Images for member mails are reduced in the browser before the upload
// (konzept-mail-texte-editierbar.md, Tech Design G.3: at most 1200 px wide).
export const MAX_MAIL_IMAGE_WIDTH = 1200

export const scaledSize = (width: number, height: number, maxWidth = MAX_MAIL_IMAGE_WIDTH) =>
  width <= maxWidth ? {width, height} : {width: maxWidth, height: Math.max(1, Math.round(height * maxWidth / width))}

// A JPEG (camera/phone photo, may carry EXIF/GPS) is always drawn anew, quality 0.8, at most maxWidth wide.
// A PNG is only redrawn when it is wider than maxWidth: redrawing would turn an optimised palette PNG (logo)
// into a much larger 32-bit one. The service re-encodes every image anyway (metadata of PNGs is dropped there).
// Other types are returned unchanged (the service rejects them). Throws ImageProcessError when the browser can
// not draw the image (e.g. a very long screenshot beyond its canvas limit).
export class ImageProcessError extends Error {}

export const downscaleImage = async (file: File, maxWidth = MAX_MAIL_IMAGE_WIDTH): Promise<Blob> => {
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    return file
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (e) {
    throw new ImageProcessError(String(e))
  }
  try {
    if (file.type === "image/png" && bitmap.width <= maxWidth) {
      return file
    }
    const {width, height} = scaledSize(bitmap.width, bitmap.height, maxWidth)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new ImageProcessError("toBlob")), file.type,
        file.type === "image/jpeg" ? 0.8 : undefined))
  } finally {
    bitmap.close()
  }
}
