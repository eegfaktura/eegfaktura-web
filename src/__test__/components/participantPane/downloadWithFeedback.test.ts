import {describe, expect, it, vi} from "vitest";

vi.mock("../../../store", () => ({store: {getState: () => ({})}}));
import {downloadWithFeedback} from "../../../components/participantPane/ParticipantPane.functions";

const feedback = () => {
  const calls: string[] = []
  return {
    calls,
    busy: {show: vi.fn(async (m: string) => { calls.push(`show ${m}`) }), hide: vi.fn(async () => { calls.push("hide") })},
    failed: vi.fn((m: string) => { calls.push(`failed ${m}`) }),
  }
}

describe("downloadWithFeedback (261024-ca14)", () => {
  it("shows the busy state while the download runs and hides it afterwards", async () => {
    const f = feedback()
    await downloadWithFeedback(async () => { f.calls.push("download") }, f.busy, f.failed, "Excel-Datei")
    expect(f.calls).toEqual(["show Excel-Datei wird erstellt ...", "download", "hide"])
    expect(f.failed).not.toHaveBeenCalled()
  })

  it("hides the busy state and reports a failed download with its reason", async () => {
    const f = feedback()
    await downloadWithFeedback(async () => { throw new Error("Bad Gateway") }, f.busy, f.failed, "ZIP-Datei")
    expect(f.calls).toEqual(["show ZIP-Datei wird erstellt ...", "hide",
      "failed Die ZIP-Datei konnte nicht erstellt werden. (Bad Gateway)"])
  })
})
