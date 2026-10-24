import {describe, expect, it} from "vitest";
import {
  alreadyRequestedInfo,
  entireConfirmation,
  metersToCheck,
  smartConfirmation,
  SmartPlan,
  sendFeedback,
  smartPeriod,
  smartPlan,
  smartRequest
} from "../../../components/processDetails/SmartRequest.functions";
import {CheckedMeter} from "../../../components/participantPane/BillingCheck.functions";
import {BillingCheckResponse} from "../../../models/billingCheck.model";
import {Metering} from "../../../models/meteringpoint.model";

const start = new Date(2026, 8, 1)
const end = new Date(2026, 8, 30)
const ms = (d: number) => new Date(2026, 8, d).getTime()

const checked = (id: string): CheckedMeter => ({
  participantName: "", meteringPoint: id, direction: "CONSUMPTION", activeSince: 0, inactiveSince: 0,
})

const answer = (meters: { id: string, days: string[] }[]): BillingCheckResponse => ({
  periodStart: start.getTime(), periodEnd: new Date(2026, 8, 30, 23, 45).getTime(),
  meters: meters.map(m => ({
    meteringPoint: m.id, direction: "CONSUMPTION", activeSince: 0, inactiveSince: 0, l3Count: 0, l3Days: [],
    firstData: start.getTime(), lastData: new Date(2026, 8, 30, 23, 45).getTime(),
    missingCount: m.days.length * 96, missingDays: m.days,
  })),
  totals: {produced: 0, consumed: 0, allocated: 0, selfCovered: 0, surplus: 0},
})

const plan = (p: Partial<SmartPlan>): SmartPlan => ({checked: 0, missing: [], missingDays: 0, complete: [], notChecked: [], ...p})
const sync = (id: string) => ({meter: id, direction: "CONSUMPTION"})

describe("smartPlan: the period per metering point from its missing days", () => {
  it("requests each metering point from its first to its last missing day, gaps at start, end and middle", () => {
    const meters = ["AT1", "AT2", "AT3", "AT4"].map(checked)
    const p = smartPlan(meters, answer([
      {id: "AT1", days: ["2026-09-01", "2026-09-02"]},
      {id: "AT2", days: ["2026-09-30", "2026-09-29"]},  // unsorted
      {id: "AT3", days: ["2026-09-10", "2026-09-20"]},
      {id: "AT4", days: ["2026-09-15"]},
    ]))
    expect(p.missing).toEqual([
      {...sync("AT1"), from: ms(1), to: ms(2)},
      {...sync("AT2"), from: ms(29), to: ms(30)},
      {...sync("AT3"), from: ms(10), to: ms(20)},
      {...sync("AT4"), from: ms(15), to: ms(15)},
    ])
    expect(p.missingDays).toBe(7)
    expect(p.complete).toEqual([])
    expect(p.checked).toBe(4)
  })

  it("merges the gaps of several entries of a metering point into one period", () => {
    const old = {...checked("AT1"), inactiveSince: ms(15)}
    const now = {...checked("AT1"), activeSince: ms(16)}
    const p = smartPlan([old, now, checked("AT2")], answer([
      {id: "AT1", days: ["2026-09-03"]}, {id: "AT1", days: ["2026-09-20", "2026-09-21"]}, {id: "AT2", days: []},
    ]))
    expect(p.missing).toEqual([{...sync("AT1"), from: ms(3), to: ms(21)}])
    expect(p.missingDays).toBe(3)
    expect(p.checked).toBe(2)
    expect(p.complete).toEqual(["AT2"])
  })

  it("counts a day missing in two overlapping entries once", () => {
    const p = smartPlan([checked("AT1"), checked("AT1")],
      answer([{id: "AT1", days: ["2026-09-03", "2026-09-04"]}, {id: "AT1", days: ["2026-09-04"]}]))
    expect(p.missingDays).toBe(2)
  })

  it("counts a metering point as complete only if every entry is", () => {
    const p = smartPlan([checked("AT1"), checked("AT1")], answer([{id: "AT1", days: []}, {id: "AT1", days: ["2026-09-30"]}]))
    expect(p.complete).toEqual([])
    expect(p.missing).toEqual([{...sync("AT1"), from: ms(30), to: ms(30)}])
  })

  it("does not check a metering point when one of its entries got no answer", () => {
    const p = smartPlan([checked("AT1"), checked("AT1")], answer([{id: "AT1", days: []}]))
    expect(p).toEqual(plan({notChecked: [sync("AT1")]}))
  })

  it("puts metering points without a gap into complete", () => {
    const p = smartPlan(["AT1", "AT2"].map(checked), answer([{id: "AT1", days: []}, {id: "AT2", days: ["2026-09-03"]}]))
    expect(p.complete).toEqual(["AT1"])
    expect(p.missing.map(m => m.meter)).toEqual(["AT2"])
  })

  it("takes nothing missing as all complete", () => {
    const p = smartPlan(["AT1", "AT2"].map(checked), answer([{id: "AT1", days: []}, {id: "AT2", days: []}]))
    expect(p).toEqual(plan({checked: 2, complete: ["AT1", "AT2"]}))
    expect(smartConfirmation(p)).toBeUndefined()
  })

  it("marks every metering point as not checked when energystore fails", () => {
    const p = smartPlan(["AT1", "AT2"].map(checked), {error: "x"})
    expect(p).toEqual(plan({notChecked: [sync("AT1"), sync("AT2")]}))
  })

  it("marks metering points beyond the energystore answer as not checked, not as complete", () => {
    const p = smartPlan(["AT1", "AT2"].map(checked), answer([{id: "AT1", days: []}]))
    expect(p.complete).toEqual(["AT1"])
    expect(p.notChecked).toEqual([sync("AT2")])
    expect(p.checked).toBe(1)
  })

  it("requests the request period for a gap without missing days (older energystore)", () => {
    const energy = answer([{id: "AT1", days: []}])
    energy.meters[0].firstData = null
    energy.meters[0].lastData = null
    delete energy.meters[0].missingCount
    delete energy.meters[0].missingDays
    const p = smartPlan([checked("AT1")], energy)
    expect(p.missing).toEqual([sync("AT1")])
    expect(p.missingDays).toBe(30)
  })
})

describe("metersToCheck", () => {
  const meter = (id: string, status: string, activeSince: string, inactiveSince: string, processState = status) => ({
    meteringPoint: id, direction: "CONSUMPTION", status, processState, participantState: {activeSince, inactiveSince},
  }) as unknown as Metering

  it("leaves out entries the dialog does not offer (rejected, invalid)", () => {
    const entries = metersToCheck(["AT1"], [
      meter("AT1", "ACTIVE", "2024-01-01", "2026-09-15", "REJECTED"),
      meter("AT1", "ACTIVE", "2024-01-01", "2026-09-15", "INVALID"),
      meter("AT1", "ACTIVE", "2026-09-16", "2099-12-31"),
    ], start, end)
    expect(entries.map(m => m.activeSince)).toEqual([ms(16)])
  })

  it("checks registered metering points active in the period only", () => {
    const ids = metersToCheck(["AT1", "AT2", "AT3", "AT4"], [
      meter("AT1", "ACTIVE", "2024-01-01", "2099-12-31"),
      meter("AT2", "INIT", "2024-01-01", "2099-12-31"),
      meter("AT3", "INACTIVE", "2024-01-01", "2026-08-31"),
      meter("AT4", "ACTIVE", "2026-10-01", "2099-12-31"),
      meter("AT5", "ACTIVE", "2024-01-01", "2099-12-31"),  // not selected
    ], start, end).map(m => m.meteringPoint)
    expect(ids).toEqual(["AT1"])
  })

  it("checks every entry of a selected metering point active in the period (owner change)", () => {
    const entries = metersToCheck(["AT1"], [
      meter("AT1", "INACTIVE", "2024-01-01", "2026-09-15"),
      meter("AT1", "ACTIVE", "2026-09-16", "2099-12-31"),
    ], start, end)
    expect(entries.map(m => m.activeSince)).toEqual([new Date(2024, 0, 1).getTime(), ms(16)])
  })
})

describe("smartConfirmation", () => {
  it("names the checked, the missing metering points and the missing days", () => {
    const missing = Array.from({length: 214}, (_, i) => sync(`AT${i}`))
    const c = smartConfirmation(plan({checked: 2380, missing, missingDays: 1033}))!
    expect(c.message).toBe("Von 2.380 Zählpunkten fehlen bei 214 Daten (zusammen 1.033 Tage). Diese 214 jetzt anfordern?")
    expect(c.buttons).toEqual([{text: "Anfordern", role: "missing"}])
  })

  it("speaks of one metering point and one day in the singular", () => {
    const c = smartConfirmation(plan({checked: 1, missing: [sync("AT1")], missingDays: 1}))!
    expect(c.message).toBe("Von 1 Zählpunkt fehlen bei 1 Daten (zusammen 1 Tag). Diesen jetzt anfordern?")
  })

  it("asks for the not checked metering points, which go only with the second button", () => {
    const c = smartConfirmation(plan({checked: 10, missing: [sync("AT1"), sync("AT2")], missingDays: 3,
      notChecked: [sync("AT9")]}))!
    expect(c.message).toBe("Von 10 Zählpunkten fehlen bei 2 Daten (zusammen 3 Tage). "
      + "Bei 1 Zählpunkt konnte der Datenstand nicht geprüft werden. Soll er für den ganzen Zeitraum angefordert werden?")
    expect(c.buttons).toEqual([{text: "Nur die 2 mit Lücken", role: "missing"}, {text: "Alle 3 anfordern", role: "all"}])
  })

  it("asks only for the not checked ones when the checked ones are complete or energystore failed", () => {
    expect(smartConfirmation(plan({checked: 5, complete: ["A", "B", "C", "D", "E"], notChecked: [sync("AT9")]}))!.message)
      .toBe("Bei 5 Zählpunkten sind alle Daten da. Bei 1 Zählpunkt konnte der Datenstand nicht geprüft werden. "
        + "Soll er für den ganzen Zeitraum angefordert werden?")
    const c = smartConfirmation(plan({notChecked: [sync("AT1"), sync("AT2")]}))!
    expect(c.message).toBe("Der Datenstand konnte nicht geprüft werden – es würden alle 2 Zählpunkte für den ganzen "
      + "Zeitraum angefordert. Trotzdem anfordern?")
    expect(c.buttons).toEqual([{text: "2 Zählpunkte anfordern", role: "all"}])
    expect(smartConfirmation(plan({notChecked: [sync("AT1")]}))!.message).toBe("Der Datenstand konnte nicht geprüft "
      + "werden – es würde 1 Zählpunkt für den ganzen Zeitraum angefordert. Trotzdem anfordern?")
  })
})

describe("smartRequest", () => {
  const p = plan({checked: 3, missing: [{...sync("AT1"), from: 1, to: 2}], complete: ["AT2"], notChecked: [sync("AT3")]})

  it("sends the metering points with gaps and the complete ones, and names the not checked ones left out", () => {
    expect(smartRequest(p, 'missing')).toEqual({meters: [{...sync("AT1"), from: 1, to: 2}], complete: ["AT2"],
      note: "1 Zählpunkt ohne geprüften Datenstand wurde nicht angefordert."})
    expect(smartRequest(plan({missing: [sync("AT1")]}), 'missing').note).toBeUndefined()
  })

  it("adds the not checked ones over the full period when confirmed", () => {
    expect(smartRequest(p, 'all')).toEqual({meters: [{...sync("AT1"), from: 1, to: 2}, sync("AT3")], complete: ["AT2"],
      note: undefined})
  })
})

describe("sendFeedback", () => {
  const locked = {meteringPoint: "AT1", reason: "ALREADY_REQUESTED"}
  const note = "2 Zählpunkte ohne geprüften Datenstand wurden nicht angefordert."

  it("confirms with the lock info and the note", () => {
    expect(sendFeedback({requested: 3, skipped: []})).toEqual({kind: 'sent', text: undefined})
    expect(sendFeedback({requested: 3, skipped: [locked]}, note)).toEqual({kind: 'sent',
      text: `1 Zählpunkt wurde in der letzten Stunde schon angefordert. ${note}`})
  })

  it("says nothing was requested when the backend requested none", () => {
    expect(sendFeedback({requested: 0, skipped: [locked]})).toEqual({kind: 'info',
      text: "Es wurde nichts angefordert. 1 Zählpunkt wurde in der letzten Stunde schon angefordert."})
    expect(sendFeedback({requested: 0, skipped: []})).toEqual({kind: 'info', text: "Es wurde nichts angefordert."})
  })
})

describe("confirmation texts", () => {
  it("names the number of metering points of the whole community", () => {
    expect(entireConfirmation(2380)).toBe("Für die ganze Gemeinschaft werden 2.380 Zählpunkte für den ganzen Zeitraum angefordert. Jetzt anfordern?")
  })

  it("names the already requested metering points and the time from which all are free", () => {
    const now = new Date(2026, 9, 24, 13, 40).getTime()
    expect(alreadyRequestedInfo([
      {meteringPoint: "AT1", reason: "ALREADY_REQUESTED", until: new Date(2026, 9, 24, 14, 40).getTime()},
      {meteringPoint: "AT2", reason: "ALREADY_REQUESTED", until: new Date(2026, 9, 24, 14, 32).getTime()},
      {meteringPoint: "AT3", reason: "ALREADY_REQUESTED", until: new Date(2026, 9, 24, 14, 35).getTime()},
      {meteringPoint: "AT4", reason: "COMPLETE"},
    ], now)).toBe("3 Zählpunkte wurden in der letzten Stunde schon angefordert, alle wieder frei ab 14:40.")
    expect(alreadyRequestedInfo([{meteringPoint: "AT1", reason: "ALREADY_REQUESTED"}], now))
      .toBe("1 Zählpunkt wurde in der letzten Stunde schon angefordert.")
    expect(alreadyRequestedInfo([{meteringPoint: "AT4", reason: "NOT_FOUND"}], now)).toBeUndefined()
  })
})

describe("smartPeriod: energy data of today cannot exist yet", () => {
  const now = new Date(2026, 9, 24, 11, 0).getTime()

  it("keeps a period that ends before today", () => {
    expect(smartPeriod(start, end, now)).toEqual({start, end, capped: false})
  })

  it("cuts a period that reaches today or later at yesterday", () => {
    const p = smartPeriod(new Date(2026, 9, 1), new Date(2026, 9, 31), now)!
    expect(p.end).toEqual(new Date(2026, 9, 23))
    expect(p.capped).toBe(true)
    expect(smartPeriod(new Date(2026, 9, 1), new Date(2026, 9, 24), now)!.end).toEqual(new Date(2026, 9, 23))
  })

  it("has nothing to check for a period from today on", () => {
    expect(smartPeriod(new Date(2026, 9, 24), new Date(2026, 9, 31), now)).toBeUndefined()
  })

  it("puts the cut into the warning when nothing could be checked", () => {
    expect(smartConfirmation(plan({notChecked: [sync("AT1"), sync("AT2")]}), new Date(2026, 9, 23))!.message)
      .toBe("Der Datenstand konnte nicht geprüft werden – es würden alle 2 Zählpunkte für den ganzen Zeitraum "
        + "bis gestern (23.10.2026) angefordert. Trotzdem anfordern?")
  })

  it("names the cut in the question", () => {
    const c = smartConfirmation(plan({checked: 1, missing: [sync("AT1")], missingDays: 1}), new Date(2026, 9, 23))!
    expect(c.message).toBe("Geprüft wird bis gestern (23.10.2026), für heute gibt es noch keine Energiedaten. "
      + "Von 1 Zählpunkt fehlen bei 1 Daten (zusammen 1 Tag). Diesen jetzt anfordern?")
  })
})
