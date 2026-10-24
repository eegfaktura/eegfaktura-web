import {describe, expect, it} from "vitest";
import {tariffInUseMessage} from "../../components/RateDetailPane.functions";
import {EegParticipant} from "../../models/members.model";

const member = (firstname: string, tariffId: string | undefined, meters: [string, string | undefined][]) =>
  ({firstname, lastname: "Muster", tariffId, meters: meters.map(([meteringPoint, tariff_id]) => ({meteringPoint, tariff_id}))}) as unknown as EegParticipant

describe("tariffInUseMessage (261024-ca16)", () => {
  it("is undefined for a tariff nobody uses", () => {
    expect(tariffInUseMessage([member("Anna", "t2", [["AT001", "t3"]])], "t1")).toBeUndefined()
  })

  it("names the members with the tariff", () => {
    expect(tariffInUseMessage([member("Anna", "t1", []), member("Ben", "t2", [])], "t1"))
      .toBe("Der Tarif wird noch verwendet (Mitglieder: Anna Muster) und kann daher nicht gelöscht werden. Bitte weisen Sie einen anderen Tarif zu.")
  })

  it("also counts metering points with the tariff, not only the member tariff", () => {
    expect(tariffInUseMessage([member("Anna", "t2", [["AT001", "t1"], ["AT002", "t2"]])], "t1"))
      .toBe("Der Tarif wird noch verwendet (Zählpunkte: AT001 (Anna Muster)) und kann daher nicht gelöscht werden. Bitte weisen Sie einen anderen Tarif zu.")
  })

  it("shortens long lists", () => {
    const many = Array.from({length: 12}, (_, i) => member(`M${i}`, "t1", []))
    const message = tariffInUseMessage(many, "t1")!
    expect(message).toContain("M9 Muster und 2 weitere")
    expect(message).not.toContain("M10 Muster")
  })
})

// the user's rule (backend#106): a metering point counts only with its current entry (backend flag 1, any status);
// the old owner's entry after an owner change (flag 0) and an archived entry (flag 2) do not; members of any status do
const entry = (meteringPoint: string, tariff_id: string, activeSince: string, inactiveSince: string, extra: object = {}) =>
  ({meteringPoint, tariff_id, status: "INACTIVE", processState: "INACTIVE", participantState: {activeSince, inactiveSince}, ...extra})
const owner = (firstname: string, tariffId: string | undefined, meters: object[], status = "ACTIVE") =>
  ({firstname, lastname: "Muster", tariffId, status, meters}) as unknown as EegParticipant

describe("tariffInUseMessage: current metering point entries only (261024-ca16, user decision)", () => {
  it("the old owner's entry after an owner change does not block", () => {
    const old = owner("Alt", "t9", [entry("AT001", "t1", "2024-01-01", "2026-03-31")])
    const now = owner("Neu", "t9", [entry("AT001", "t2", "2026-04-01", "2999-12-31", {status: "ACTIVE", processState: "ACTIVE"})])
    expect(tariffInUseMessage([old, now], "t1")).toBeUndefined()
  })

  it("the current entry blocks, also when it is inactive", () => {
    const old = owner("Alt", "t9", [entry("AT001", "t2", "2024-01-01", "2026-03-31")])
    const now = owner("Neu", "t9", [entry("AT001", "t1", "2026-04-01", "2026-09-30")])
    expect(tariffInUseMessage([old, now], "t1")).toContain("Zählpunkte: AT001 (Neu Muster)")
  })

  it("a metering point with a single entry blocks", () => {
    expect(tariffInUseMessage([owner("Anna", "t9", [entry("AT002", "t1", "2025-01-01", "2999-12-31")])], "t1"))
      .toContain("AT002 (Anna Muster)")
  })

  it("an archived entry does not block", () => {
    expect(tariffInUseMessage([owner("Anna", "t9", [entry("AT003", "t1", "2025-01-01", "2026-01-31", {processState: "ARCHIVED"})])], "t1"))
      .toBeUndefined()
  })

  it("a member of any status with the tariff blocks", () => {
    expect(tariffInUseMessage([owner("Inaktiv", "t1", [], "INACTIVE")], "t1")).toContain("Mitglieder: Inaktiv Muster")
  })

  it("entries that cannot be told apart (same start) do not block: the backend decides", () => {
    const a = owner("A", "t9", [entry("AT004", "t1", "2025-01-01", "2999-12-31")])
    const b = owner("B", "t9", [entry("AT004", "t1", "2025-01-01", "2999-12-31")])
    expect(tariffInUseMessage([a, b], "t1")).toBeUndefined()
  })
})
