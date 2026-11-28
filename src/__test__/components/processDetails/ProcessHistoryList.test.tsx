import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {Process_EC_REQ_ONL_MY_REQ_ONL} from "../../../components/processDetails/ProcessHistory/Process_EC_REQ_ONL.component";
import {Eeg} from "../../../models/eeg.model";

const getHistories1 = vi.fn()
vi.mock("../../../service", () => ({Api: {eegService: {getHistories1: (...a: unknown[]) => getHistories1(...a)}}}))

const day = "2026-11-20T10:00:00"
const renderList = (protocol: string, entries: Record<string, unknown[]>) => {
  getHistories1.mockResolvedValue({[protocol]: entries})
  render(<Process_EC_REQ_ONL_MY_REQ_ONL eeg={{id: "rc100298"} as Eeg} protocols={[protocol]} participants={[]}
                                        historyDate={[new Date(2026, 10, 1), new Date(2026, 10, 28)]}/>)
}

// web 261128-mm2: the backend leaves responseData out when it is empty (omitempty). Read unguarded, one such
// message threw and the whole list of the process stayed empty.
describe("process history list, message without responseData", () => {
  it("EC_REQ_ONL: the other entries are shown", async () => {
    renderList("EC_REQ_ONL", {
      c1: [{conversationId: "c1", date: day, processType: "ANTWORT_ECON", message: {}}],
      c2: [{conversationId: "c2", date: day, processType: "ANFORDERUNG_ECON", message: {meter: {meteringPoint: "AT0000000000000000000000000000001"}}}],
    })
    expect(await screen.findByText("AT0000000000000000000000000000001")).toBeTruthy()
  })

  it("CM_REV_IMP: a rejection without responseData does not hide the other entries", async () => {
    renderList("CM_REV_IMP", {
      c1: [{conversationId: "c1", date: day, processType: "ABLEHNUNG_CCMS", message: {}}],
      c2: [{conversationId: "c2", date: day, processType: "ANTWORT_CCMS", message: {responseData: [{meteringPoint: "AT0000000000000000000000000000002"}]}}],
    })
    expect(await screen.findByText("AT0000000000000000000000000000002")).toBeTruthy()
  })
})
