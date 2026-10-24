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
