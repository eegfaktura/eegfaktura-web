import {afterEach, describe, expect, it, vi} from "vitest";
import i18n from "../../../util/I18n";
import {meterActiveText, processStateText} from "../../../components/participantPane/meterStatusText";
import {Metering} from "../../../models/meteringpoint.model";

// The process states the backend writes for a metering point (eegfaktura-backend model/participant.go);
// ACTIVE shows no status text. RESTORE and ABORTED are never stored.
const shownStates = ["NEW", "INIT", "PENDING", "APPROVED", "INACTIVE", "REJECTED", "REVOKED", "INVALID", "ARCHIVED", "WARN"]

describe("processStateText", () => {
  const t = i18n.getFixedT("de", "common")

  it.each(shownStates)("has a German text for %s", state => {
    expect(i18n.exists(`meter.status_text_${state}`, {lng: "de", ns: "common"})).toBe(true)
    expect(processStateText(t, state)).not.toContain("status_text")
  })

  it("names WARN and ARCHIVED", () => {
    expect(processStateText(t, "WARN")).toBe("Zählpunkt hat eine Warnung, bitte die Prozess History prüfen.")
    expect(processStateText(t, "ARCHIVED")).toBe("Zählpunkt wurde archiviert.")
  })

  it("shows a readable fallback instead of the raw key for an unknown state", () => {
    expect(processStateText(t, "SOMETHING")).toBe("Zählpunkt-Status SOMETHING.")
  })
})

// platform#272, EEG Perg 28.11.2026: the grid operator reported the activation on 28.11. for 01.12.
describe("meterActiveText", () => {
  afterEach(() => { vi.useRealTimers() })
  const meter = (processState: string, activeSince?: string) =>
    ({processState, participantState: {activeSince}} as unknown as Metering)

  it.each([
    ["2026-12-01", "Zählpunkt aktiv ab 01.12.2026"],
    ["2026-11-29", "Zählpunkt aktiv ab 29.11.2026"],
    ["2026-11-28", "Zählpunkt aktiv"],
    ["2026-01-01", "Zählpunkt aktiv"],
    [undefined, "Zählpunkt aktiv"],
  ])("active since %s, today 28.11.2026: %s", (since, text) => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date(2026, 10, 28, 15, 0))
    expect(meterActiveText(meter("ACTIVE", since))).toBe(text)
  })

  it("not active: inaktiv, also with a day ahead", () => {
    expect(meterActiveText(meter("INACTIVE", "2099-01-01"))).toBe("Zählpunkt inaktiv")
    expect(meterActiveText(meter("APPROVED", "2099-01-01"))).toBe("Zählpunkt inaktiv")
  })
})
