import {afterEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {isInPartFactWindow} from "../../util/PartFactWindow.util";
import {buildNotificationText} from "../../util/Notificaton.util";
import {Message} from "../../models/eeg.model";
import {renderWithProviders} from "../test-utils";
import ProcessChangeParticipantFactorComponent from "../../components/processDetails/ProcessChangeParticipantFactor.component";

describe("isInPartFactWindow (Europe/Vienna)", () => {
  // summer time (CEST, UTC+2) and winter time (CET, UTC+1)
  it.each([
    ["2026-10-21T06:59:00Z", false], // 08:59 CEST
    ["2026-10-21T07:00:00Z", true],  // 09:00 CEST
    ["2026-10-21T14:59:00Z", true],  // 16:59 CEST
    ["2026-10-21T15:00:00Z", false], // 17:00 CEST
    ["2026-12-01T07:59:00Z", false], // 08:59 CET
    ["2026-12-01T08:00:00Z", true],  // 09:00 CET
    ["2026-12-01T15:59:00Z", true],  // 16:59 CET
    ["2026-12-01T16:00:00Z", false], // 17:00 CET
  ])("%s → %s", (iso, expected) => {
    expect(isInPartFactWindow(new Date(iso))).toBe(expected)
  })
})

describe("ABLEHNUNG_CPF notification", () => {
  const show = (properties: Record<string, unknown>) =>
    render(<>{buildNotificationText("MESSAGE", "EDA_PROCESS",
      {id: 1, date: new Date(), type: "MESSAGE", process: "EDA_PROCESS", message: new Message(properties)})}</>)

  it("shows the reason and the time window hint for Prozessdatum falsch", () => {
    show({type: "ABLEHNUNG_CPF", meteringPoints: null, responseCodes: ["Prozessdatum falsch"]})
    expect(screen.getByText(/wurde abgelehnt/).textContent).toContain("(Prozessdatum falsch)")
    expect(screen.getByText(/09:00 und\s+17:00 Uhr/)).toBeTruthy()
    expect(screen.queryByText(/Zählpunkte/)).toBeNull()
  })

  it("names the metering points and no hint for other reasons", () => {
    show({type: "ABLEHNUNG_CPF", meteringPoints: ["AT1"], responseCodes: ["Teilnahmefaktor von 100 % würde überschritten werden"]})
    expect(screen.getByText("AT1")).toBeTruthy()
    expect(screen.queryByText(/09:00/)).toBeNull()
  })
})

describe("ProcessChangeParticipantFactor time window", () => {
  const props = {
    eeg: {id: "rc100001", communityId: "AT00000000000RC100001000000000000"} as never,
    meters: [], participants: [],
    edaProcess: {name: "Teilnehmerfaktor ändern", type: "EC_PRTFACT_CHANGE"} as never,
  }
  afterEach(() => vi.useRealTimers())

  it("shows the hint, and the warning only outside 09:00–17:00", () => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date("2026-10-21T08:00:00Z")) // 10:00 CEST
    const {unmount} = renderWithProviders(<ProcessChangeParticipantFactorComponent {...props}/>)
    expect(screen.getByText(/nur zwischen 09:00 und 17:00 Uhr an/)).toBeTruthy()
    expect(screen.queryByText(/außerhalb dieser Zeit/)).toBeNull()
    unmount()

    vi.setSystemTime(new Date("2026-10-21T15:30:00Z")) // 17:30 CEST
    renderWithProviders(<ProcessChangeParticipantFactorComponent {...props}/>)
    expect(screen.getByText(/außerhalb dieser Zeit/)).toBeTruthy()
  })
})
