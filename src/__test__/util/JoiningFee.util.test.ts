import {describe, expect, it} from "vitest";
import {
  hasJoiningFee, joiningFeeActions, joiningFeeStateOf, joiningFeeStatus, joiningFeeStatusText, joiningFeeVatUnusual,
  membersNotYetEnergyBilled, showJoiningFeeHint
} from "../../util/JoiningFee.util";
import {EegTariff, JoiningFeeState} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";

const eeg = (extra: Partial<EegTariff> = {}) =>
  ({id: "t1", name: "Mitglied", type: "EEG", useVat: false, useMeteringPointFee: false, ...extra}) as EegTariff

describe("hasJoiningFee", () => {
  it("is a membership fee tariff with a fee above 0", () => {
    expect(hasJoiningFee(eeg({joiningFee: 49.9}))).toBe(true)
    expect(hasJoiningFee(eeg({joiningFee: 0}))).toBe(false)
    expect(hasJoiningFee(eeg())).toBe(false)
    expect(hasJoiningFee(undefined)).toBe(false)
  })
  it("ignores a fee on another tariff type", () => {
    expect(hasJoiningFee(eeg({type: "VZP", joiningFee: 10}))).toBe(false)
  })
})

describe("joiningFeeVatUnusual (AK 9)", () => {
  const consumer = {id: "v", name: "Bezug", type: "VZP", useVat: true, vatInPercent: "20", useMeteringPointFee: false} as EegTariff
  const producer = {id: "e", name: "Einspeisung", type: "EZP", useVat: false, useMeteringPointFee: true, meteringPointVat: 10} as EegTariff

  it("warns for a rate no tariff of the community uses", () => {
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 13}), [consumer, producer])).toBe(true)
  })
  it("does not warn for a rate in use: energy, producer metering point fee, the tariff's own membership fee", () => {
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 20.0}), [consumer])).toBe(false)
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 10}), [producer])).toBe(false)
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, useVat: true, vatInPercent: "13", joiningFeeUseVat: true, joiningFeeVatInPercent: 13}), [])).toBe(false)
  })
  it("does not warn without VAT, with 0 % or without a fee", () => {
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: false, joiningFeeVatInPercent: 13}), [])).toBe(false)
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 0}), [])).toBe(false)
    expect(joiningFeeVatUnusual(eeg({joiningFee: 0, joiningFeeUseVat: true, joiningFeeVatInPercent: 13}), [])).toBe(false)
  })
  it("ignores rates switched off and the stored version of the edited tariff", () => {
    const noVat = {...consumer, useVat: false, vatInPercent: "13"}
    const noFee = {...producer, useMeteringPointFee: false, meteringPointVat: 13}
    const stored = eeg({useVat: true, vatInPercent: "13"})
    expect(joiningFeeVatUnusual(eeg({joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 13}), [noVat, noFee, stored])).toBe(true)
  })
})

describe("membersNotYetEnergyBilled", () => {
  const member = (id: string, tariffId: string, status: string) =>
    ({id, tariffId, meters: [{meteringPoint: "AT" + id, status}]}) as unknown as EegParticipant
  const state: JoiningFeeState[] = [
    {participantId: "B", energyBilled: true, joiningFee: null},
    {participantId: "c", energyBilled: false, joiningFee: null},
  ]

  it("counts the active members of the tariff without a final document with energy", () => {
    const participants = [
      member("a", "t1", "ACTIVE"),   // no final document at all -> counts
      member("b", "t1", "ACTIVE"),   // energy billed (ids compared without case) -> not
      member("c", "t1", "ACTIVE"),   // final document without energy -> counts
      member("d", "t1", "INACTIVE"), // not active -> not
      member("e", "t2", "ACTIVE"),   // other tariff -> not
    ]
    expect(membersNotYetEnergyBilled(participants, "t1", state)).toBe(2)
  })
  it("is 0 without members of the tariff", () => {
    expect(membersNotYetEnergyBilled([], "t1", [])).toBe(0)
  })
  it("does not count a member whose fee was paid outside eegfaktura (extension 27.10.)", () => {
    const paid: JoiningFeeState[] = [{participantId: "a", energyBilled: false, joiningFee: null, paidExternally: {paidOn: "2026-03-01", note: null}}]
    expect(membersNotYetEnergyBilled([member("a", "t1", "ACTIVE"), member("f", "t1", "ACTIVE")], "t1", paid)).toBe(1)
  })
})

describe("showJoiningFeeHint (grill 27.10. no. 3, AK 11)", () => {
  const fee = eeg({joiningFee: 50})
  const billed: JoiningFeeState = {participantId: "p", energyBilled: true, joiningFee: null}

  it("shows for a member billed with energy, never charged a fee, and a tariff with a fee", () => {
    expect(showJoiningFeeHint(billed, fee)).toBe(true)
  })
  it("does not show when the fee was charged already", () => {
    expect(showJoiningFeeHint({...billed, joiningFee: {documentNumber: "RG202600012", documentDate: "2026-01-15"}}, fee)).toBe(false)
  })
  it("does not show for a member not billed with energy or without a final document", () => {
    expect(showJoiningFeeHint({...billed, energyBilled: false}, fee)).toBe(false)
    expect(showJoiningFeeHint(undefined, fee)).toBe(false)
  })
  it("does not show for a tariff without a fee or no tariff", () => {
    expect(showJoiningFeeHint(billed, eeg({joiningFee: 0}))).toBe(false)
    expect(showJoiningFeeHint(billed, undefined)).toBe(false)
  })
  it("finds the member's entry without case", () => {
    expect(joiningFeeStateOf([{...billed, participantId: "ABC"}], "abc")?.energyBilled).toBe(true)
    expect(joiningFeeStateOf([billed], "other")).toBeUndefined()
  })
  it("does not show when the fee is requested or was paid outside (extension 27.10.)", () => {
    expect(showJoiningFeeHint({...billed, requested: true}, fee)).toBe(false)
    expect(showJoiningFeeHint({...billed, paidExternally: {paidOn: "2026-03-01", note: null}}, fee)).toBe(false)
  })
})

describe("joiningFeeStatus / joiningFeeStatusText (extension 27.10., six states)", () => {
  const fee = eeg({joiningFee: 50})
  const s = (extra: Partial<JoiningFeeState> = {}): JoiningFeeState =>
    ({participantId: "p", energyBilled: false, joiningFee: null, requested: false, paidExternally: null, ...extra})
  const text = (state: JoiningFeeState | undefined, tariff?: EegTariff) => joiningFeeStatusText(joiningFeeStatus(state, tariff))
  const doc = {documentNumber: "RG202600012", documentDate: "2026-01-15"}
  const paid = {paidOn: "2026-03-01", note: "bar beim Beitritt"}

  it("has the concept's texts", () => {
    expect(text(s({joiningFee: doc, energyBilled: true}), fee)).toBe("verrechnet mit RG202600012 vom 15.01.2026")
    expect(text(s({paidExternally: paid}), fee)).toBe("außerhalb bezahlt am 01.03.2026 (bar beim Beitritt)")
    expect(text(s({paidExternally: {...paid, note: null}}), fee)).toBe("außerhalb bezahlt am 01.03.2026")
    expect(text(s({requested: true, energyBilled: true}), fee)).toBe("zur Verrechnung im nächsten Abrechnungslauf vorgemerkt")
    expect(text(undefined, fee)).toBe("offen – wird mit der ersten Energieabrechnung verrechnet")
    expect(text(s({energyBilled: true}), fee)).toBe("nicht verrechnet – Mitglied wurde schon abgerechnet")
    expect(text(s({energyBilled: true}), eeg({joiningFee: 0}))).toBe("kein Tarif mit Beitrittsgebühr")
  })
  it("a document wins over a record, a record over the tariff; a request without a fee tariff is no fee", () => {
    expect(joiningFeeStatus(s({joiningFee: doc, requested: true}), eeg()).kind).toBe("BILLED")
    expect(joiningFeeStatus(s({paidExternally: paid}), eeg()).kind).toBe("PAID_EXTERNALLY")
    expect(joiningFeeStatus(s({requested: true}), eeg()).kind).toBe("NO_FEE")
  })
  it("an older billing without the new fields reads as no record", () => {
    expect(joiningFeeStatus({participantId: "p", energyBilled: true, joiningFee: null}, fee).kind).toBe("NOT_BILLED")
  })
})

describe("joiningFeeActions (extension 27.10.)", () => {
  const fee = eeg({joiningFee: 50})
  const s = (extra: Partial<JoiningFeeState> = {}): JoiningFeeState =>
    ({participantId: "p", energyBilled: true, joiningFee: null, requested: false, paidExternally: null, ...extra})
  const paid = {paidOn: "2026-03-01", note: null}

  it("open fee: request or record a payment", () => {
    expect(joiningFeeActions(s(), fee)).toEqual({request: true, withdraw: false, recordPaid: true, changePaid: false})
    expect(joiningFeeActions(undefined, fee)).toEqual({request: true, withdraw: false, recordPaid: true, changePaid: false})
  })
  it("no request without a fee in the member's tariff; a payment can still be recorded", () => {
    expect(joiningFeeActions(s(), eeg({joiningFee: 0}))).toEqual({request: false, withdraw: false, recordPaid: true, changePaid: false})
  })
  it("requested: only withdraw (request and payment exclude each other)", () => {
    expect(joiningFeeActions(s({requested: true}), fee)).toEqual({request: false, withdraw: true, recordPaid: false, changePaid: false})
  })
  it("paid outside: only correct or remove", () => {
    expect(joiningFeeActions(s({paidExternally: paid}), fee)).toEqual({request: false, withdraw: false, recordPaid: false, changePaid: true})
  })
  it("charged: nothing, also with a leftover record", () => {
    const doc = {documentNumber: "RG1", documentDate: "2026-01-15"}
    const none = {request: false, withdraw: false, recordPaid: false, changePaid: false}
    expect(joiningFeeActions(s({joiningFee: doc}), fee)).toEqual(none)
    expect(joiningFeeActions(s({joiningFee: doc, requested: true}), fee)).toEqual(none)
  })
})
