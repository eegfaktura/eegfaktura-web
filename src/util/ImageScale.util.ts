// Images for member mails are reduced in the browser before the upload
// (konzept-mail-texte-editierbar.md, Tech Design G.3: at most 1200 px wide).
export const MAX_MAIL_IMAGE_WIDTH = 1200

export const scaledSize = (width: number, height: number, maxWidth = MAX_MAIL_IMAGE_WIDTH) =>
  width <= maxWidth ? {width, height} : {width: maxWidth, height: Math.max(1, Math.round(height * maxWidth / width))}

// Draws every PNG/JPEG anew (same type, JPEG quality 0.9), at most maxWidth wide, so metadata such as
// EXIF/GPS does not leave the browser; also a small image is re-encoded. Other types are returned unchanged
// (the service rejects them).
export const downscaleImage = async (file: File, maxWidth = MAX_MAIL_IMAGE_WIDTH): Promise<Blob> => {
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    return file
  }
  const bitmap = await createImageBitmap(file)
  try {
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
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob")), file.type, 0.9))
  } finally {
    bitmap.close()
  }
}
