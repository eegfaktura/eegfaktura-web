import {describe, expect, it} from "vitest";
import {downscaleImage, scaledSize} from "../../util/ImageScale.util";

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
})
