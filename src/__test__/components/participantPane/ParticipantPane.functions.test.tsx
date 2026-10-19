import { describe, it, expect, vi } from "vitest";
import {AccountInfo, Address, Contact, Optionals} from "../../../models/eeg.model";
import {Metering} from "../../../models/meteringpoint.model";
import {EegParticipant} from "../../../models/members.model";

// buildAllocationMapFromSelected reads the per-participant energy report from the
// redux store (meteringEnergyGroup1), not from an argument. Mock both so the unit
// test is deterministic without booting the store.
vi.mock("../../../store", () => ({store: {getState: () => ({})}}));
vi.mock("../../../store/energy", () => ({
  meteringEnergyGroup1: () => [
    {
      participantId: "1234567890",
      meters: [
        {meterId: "AT0000000000000000000000000000001", meterDir: "CONSUMPTION", report: {summary: {utilization: 10, production: 0, allocation: 0}}},
        {meterId: "AT0000000000000000000000000000002", meterDir: "CONSUMPTION", report: {summary: {utilization: 0, production: 0, allocation: 0}}},
      ],
    },
  ],
}));

import {buildAllocationMapFromSelected, uploadActivationDocuments, withOpenProblems} from "../../../components/participantPane/ParticipantPane.functions";

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

    const checkedParticipants = {"1234567890": true}

    const r = buildAllocationMapFromSelected(participants, checkedParticipants)

    // Current behaviour: energy comes from the store; zero-kWh meters are NOT
    // filtered out (the >0 filter is intentionally disabled) and each entry
    // carries the participantId.
    expect(r).toEqual([
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000001", allocationKWh: 10},
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
  it("does not add a metering point twice", () => {
    const all = [{id: "1", meters: [m("AT2", "INIT", "INVALID")]} as EegParticipant]
    expect(withOpenProblems(all, all)).toEqual(all)
  })
})
