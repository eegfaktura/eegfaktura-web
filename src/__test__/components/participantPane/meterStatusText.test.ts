import {describe, expect, it} from "vitest";
import i18n from "../../../util/I18n";
import {processStateText} from "../../../components/participantPane/meterStatusText";

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
