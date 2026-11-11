import {afterEach, describe, expect, it, vi} from "vitest";
import {downscaleImage, ImageProcessError, scaledSize} from "../../util/ImageScale.util";

describe("scaledSize", () => {
  it("keeps images up to 1200 px wide", () => {
    expect(scaledSize(1200, 300)).toEqual({width: 1200, height: 300})
    expect(scaledSize(640, 480)).toEqual({width: 640, height: 480})
  })
  it("scales wider images to 1200 px keeping the aspect ratio", () => {
    expect(scaledSize(2400, 1000)).toEqual({width: 1200, height: 500})
    expect(scaledSize(4000, 3)).toEqual({width: 1200, height: 1})
  })
})

describe("downscaleImage", () => {
  it("passes other types through unchanged (the service rejects them)", async () => {
    const f = new File(["x"], "a.gif", {type: "image/gif"})
    expect(await downscaleImage(f)).toBe(f)
  })

  // jsdom has neither createImageBitmap nor a canvas: record what is drawn and encoded
  const fakeCanvas = (bitmapWidth: number, bitmapHeight: number) => {
    const close = vi.fn()
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({width: bitmapWidth, height: bitmapHeight, close})))
    const drawImage = vi.fn()
    const encoded = new Blob(["re-encoded"], {type: "image/jpeg"})
    const canvas = {
      width: 0, height: 0, getContext: () => ({drawImage}),
      toBlob: vi.fn((cb: (b: Blob | null) => void, _type: string, _quality?: number) => cb(encoded)),
    }
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
      tag === "canvas" ? canvas : createElement(tag)) as typeof document.createElement)
    return {canvas, drawImage, encoded, close}
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("re-encodes a small JPEG at the same size (drops EXIF/GPS)", async () => {
    const {canvas, drawImage, encoded, close} = fakeCanvas(640, 480)
    const f = new File(["jpeg with exif"], "foto.jpg", {type: "image/jpeg"})
    const result = await downscaleImage(f)
    expect(result).toBe(encoded)
    expect(result).not.toBe(f)
    expect([canvas.width, canvas.height]).toEqual([640, 480])
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 640, 480)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.8)
    expect(close).toHaveBeenCalled()
  })

  it("keeps a PNG up to 1200 px unchanged (an optimised palette PNG would grow; the service re-encodes)", async () => {
    const {canvas} = fakeCanvas(800, 300)
    const f = new File(["png"], "logo.png", {type: "image/png"})
    expect(await downscaleImage(f)).toBe(f)
    expect(canvas.toBlob).not.toHaveBeenCalled()
  })

  it("throws ImageProcessError when the browser can not encode the image", async () => {
    const {canvas} = fakeCanvas(1200, 15000)
    canvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(null))
    await expect(downscaleImage(new File(["j"], "long.jpg", {type: "image/jpeg"}))).rejects.toBeInstanceOf(ImageProcessError)
  })

  it("re-encodes a PNG as PNG and scales a wider one to 1200 px", async () => {
    const {canvas, encoded} = fakeCanvas(2400, 1000)
    const result = await downscaleImage(new File(["png"], "a.png", {type: "image/png"}))
    expect(result).toBe(encoded)
    expect([canvas.width, canvas.height]).toEqual([1200, 500])
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined)
  })
})
