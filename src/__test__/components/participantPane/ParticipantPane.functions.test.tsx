import { describe, it, expect, vi } from "vitest";
import {AccountInfo, Address, Contact, Optionals} from "../../../models/eeg.model";
import {Metering, ParticipantBillType} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";

// buildAllocationMap reads the per-participant energy report from the
// redux store (meteringEnergyGroup1), not from an argument. Mock both so the unit
// test is deterministic without booting the store.
vi.mock("../../../store", () => ({store: {getState: () => ({})}}));
vi.mock("../../../store/energy", () => ({
  meteringEnergyGroup1: () => [
    {
      participantId: "1234567890",
      meters: [
        // the energystore echoes the time windows it computed the buckets for
        {meterId: "AT0000000000000000000000000000001", meterDir: "CONSUMPTION", timeWindows: [{key: "T1", from: "06:00", to: "08:00"}],
          report: {summary: {utilization: 10, production: 0, allocation: 0},
          buckets: [{key: "BASE", kWh: 5}, {key: "T1", kWh: 5}]}},
        {meterId: "AT0000000000000000000000000000002", meterDir: "CONSUMPTION", report: {summary: {utilization: 0, production: 0, allocation: 0}}},
      ],
    },
  ],
}));
// ZVT: the current tariff already has other windows (06:00-09:00) than the report (06:00-08:00), as right after a
// window edit. The allocation must carry the report's windows, never the tariff's (platform#174).
vi.mock("../../../store/rate", () => ({
  ratesMapSelector: () => ({
    "zvt1": {
      id: "zvt1", type: "VZP", useTimeTariff: true,
      timeTariff1Active: true, timeTariff1Name: "Tag", timeTariff1From: "06:00", timeTariff1To: "09:00",
      timeTariff1CentPerKWh: 22.5,
    },
  }),
}));

import {billTotal, buildAllocationMap, isBillableParticipant, uploadActivationDocuments, withOpenProblems} from "../../../components/participantPane/ParticipantPane.functions";

describe("<ParticipantPane/> Functions", () => {
  it("allocate invoice member and metering points", async () => {
    const participants = [{
      accountInfo: {} as AccountInfo,
      billingAddress: {} as Address,
      residentAddress: {} as Address,
      businessRole: 'EEG_PRIVATE',
      contact: {} as Contact,
      firstname: "Max",
      id: "1234567890",
      lastname: "Mustermann",
      meters: [{
        meteringPoint: "AT0000000000000000000000000000001",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE'
      } as Metering,
      {
        meteringPoint: "AT0000000000000000000000000000002",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE'
      } as Metering],
      optionals: {} as Optionals,
      participantNumber: "001",
      participantSince: new Date(2023, 0, 1),
      role: 'EEG_USER',
      status: 'ACTIVE',
      tariffId: "",
      taxNumber: "",
      titleAfter: "",
      titleBefore: ""} as EegParticipant
    ]

    const r = buildAllocationMap(participants)

    // Current behaviour: energy comes from the store; zero-kWh meters are NOT
    // filtered out (the >0 filter is intentionally disabled) and each entry
    // carries the participantId. Time windows and buckets come from the report, not from the tariff.
    expect(r).toEqual([
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000001", allocationKWh: 10,
        buckets: [{key: "BASE", kWh: 5}, {key: "T1", kWh: 5}], timeWindows: [{key: "T1", from: "06:00", to: "08:00"}]},
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000002", allocationKWh: 0},
    ])
  });

  it("takes buckets and timeWindows from the report: a stale report without windows sends none (platform#174)", async () => {
    const participants = [{
      id: "1234567890",
      status: 'ACTIVE',
      meters: [{
        meteringPoint: "AT0000000000000000000000000000001",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE',
        tariff_id: "zvt1"
      } as Metering,
      {
        meteringPoint: "AT0000000000000000000000000000002",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE',
        tariff_id: "zvt1"
      } as Metering],
    } as EegParticipant]

    const r = buildAllocationMap(participants)

    expect(r).toEqual([
      {
        participantId: "1234567890",
        meteringPoint: "AT0000000000000000000000000000001",
        allocationKWh: 10,
        buckets: [{key: "BASE", kWh: 5}, {key: "T1", kWh: 5}],
        timeWindows: [{key: "T1", from: "06:00", to: "08:00"}],
      },
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000002", allocationKWh: 0},
    ])
  });
})

describe("uploadActivationDocuments", () => {
  const file = new File(["x"], "a.png", {type: "image/png"});

  it("does not call the upload without files", async () => {
    const upload = vi.fn();
    await expect(uploadActivationDocuments(upload, [])).resolves.toBeUndefined();
    expect(upload).not.toHaveBeenCalled();
  });

  it("resolves without warning when the upload succeeds", async () => {
    await expect(uploadActivationDocuments(async () => [], [file])).resolves.toBeUndefined();
  });

  it("resolves with a warning naming the failed files instead of rejecting", async () => {
    const warning = await uploadActivationDocuments(() => Promise.reject(new Error("a.png: Invalid content_type")), [file]);
    expect(warning).toContain("a.png: Invalid content_type");
    expect(warning).toContain("später im Bereich Verträge");
  });
})

describe("withOpenProblems (member list)", () => {
  const m = (id: string, status: string, processState: string) => ({meteringPoint: id, status, processState} as Metering)
  it("adds the rejected metering points the period filter dropped, nothing else", () => {
    const all = [{id: "1", meters: [m("AT1", "ACTIVE", "ACTIVE"), m("AT2", "INACTIVE", "REJECTED"), m("AT3", "INACTIVE", "INACTIVE")]} as EegParticipant]
    const period = [{id: "1", meters: [m("AT1", "ACTIVE", "ACTIVE")]} as EegParticipant]
    expect(withOpenProblems(period, all)[0].meters.map(x => x.meteringPoint)).toEqual(["AT1", "AT2"])
    // the period list itself (billing, reports) is unchanged
    expect(period[0].meters).toHaveLength(1)
  })
  it("adds a re-registration in progress that keeps its old inactive date", () => {
    const all = [{id: "1", meters: [m("AT4", "INACTIVE", "PENDING")]} as EegParticipant]
    expect(withOpenProblems([{id: "1", meters: [] as Metering[]} as EegParticipant], all)[0].meters.map(x => x.meteringPoint)).toEqual(["AT4"])
  })
  it("does not add a metering point twice", () => {
    const all = [{id: "1", meters: [m("AT2", "INIT", "INVALID")]} as EegParticipant]
    expect(withOpenProblems(all, all)).toEqual(all)
  })
})

describe("billTotal", () => {
  it("adds membership fee, metering point fees and metering points, credit notes negative", () => {
    const bill = {
      id: "1", amount: 0, participantFee: 30, meteringPointFeeSum: 2.4,
      meteringPoints: [{id: "AT1", amount: 12.5}, {id: "AT2", amount: -8.25}],
    } as ParticipantBillType
    expect(billTotal(bill)).toBeCloseTo(36.65, 10)
  })

  it("is the fees alone without metering point amounts", () => {
    expect(billTotal({id: "1", amount: 0, participantFee: 0, meteringPointFeeSum: 1.2, meteringPoints: []})).toBe(1.2)
  })

  it("adds the joining fee (platform#217), also without a membership fee; missing from older billing", () => {
    const bill = {id: "1", amount: 0, participantFee: 2, joiningFee: 60, meteringPoints: [{id: "AT1", amount: -8.25}]} as ParticipantBillType
    expect(billTotal(bill)).toBeCloseTo(53.75, 10)
    expect(billTotal({id: "1", amount: 0, participantFee: 0, joiningFee: 49.9, meteringPoints: []})).toBe(49.9)
    expect(billTotal({id: "1", amount: 0, participantFee: 2, meteringPoints: []})).toBe(2)
  })
})

describe("billing always the whole community (platform#194)", () => {
  const member = (over: Partial<EegParticipant>, meters: Partial<Metering>[]) =>
    ({id: "1234567890", status: 'ACTIVE', tariffId: undefined, meters: meters as Metering[], ...over}) as unknown as EegParticipant
  const meter = (over: Partial<Metering> = {}) =>
    ({meteringPoint: "AT0000000000000000000000000000001", direction: 'CONSUMPTION', status: 'ACTIVE', ...over}) as Metering

  it("bills an active member with a tariff on the member or on a registered metering point", () => {
    expect(isBillableParticipant(member({tariffId: "m1"}, [meter()]))).toBe(true)
    expect(isBillableParticipant(member({}, [meter({tariff_id: "t1"})]))).toBe(true)
  })

  it("leaves out members that are not active or have no tariff (they are named by „Daten prüfen“)", () => {
    expect(isBillableParticipant(member({tariffId: "m1", status: 'INACTIVE'} as any, [meter()]))).toBe(false)
    expect(isBillableParticipant(member({}, [meter()]))).toBe(false)
    // a tariff only on a metering point still in registration does not count
    expect(isBillableParticipant(member({}, [meter({tariff_id: "t1", status: 'INIT'})]))).toBe(false)
  })

  it("sends nothing for a member that is not billable, with no selection involved", () => {
    expect(buildAllocationMap([member({status: 'INACTIVE'} as any, [meter({tariff_id: "t1"})])])).toEqual([])
    // the report holds two metering points of the member; only the one the member still has in the list is sent
    expect(buildAllocationMap([member({}, [meter({tariff_id: "t1"})])]).map(a => a.meteringPoint))
      .toEqual(["AT0000000000000000000000000000001"])
  })
})

