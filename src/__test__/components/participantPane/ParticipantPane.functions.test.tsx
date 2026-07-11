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
        {meterId: "AT0000000000000000000000000000001", meterDir: "CONSUMPTION", report: {summary: {utilization: 10, production: 0, allocation: 0},
          buckets: [{key: "BASE", kWh: 5}, {key: "T1", kWh: 5}]}},
        {meterId: "AT0000000000000000000000000000002", meterDir: "CONSUMPTION", report: {summary: {utilization: 0, production: 0, allocation: 0}}},
      ],
    },
  ],
}));
// ZVT: Tarif-Lookup fuer die Fenster-Weitergabe. "zvt1" ist zeitbasiert -
// nur Zaehlpunkte mit diesem Tarif bekommen buckets + timeWindows angehaengt.
vi.mock("../../../store/rate", () => ({
  ratesMapSelector: () => ({
    "zvt1": {
      id: "zvt1", type: "VZP", useTimeTariff: true,
      timeTariff1Active: true, timeTariff1Name: "Tag", timeTariff1From: "06:00", timeTariff1To: "08:00",
      timeTariff1CentPerKWh: 22.5,
    },
  }),
}));

import {buildAllocationMapFromSelected} from "../../../components/participantPane/ParticipantPane.functions";

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
    // carries the participantId. Simple tariffs never carry buckets.
    expect(r).toEqual([
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000001", allocationKWh: 10},
      {participantId: "1234567890", meteringPoint: "AT0000000000000000000000000000002", allocationKWh: 0},
    ])
  });

  it("attaches buckets and timeWindows for time-based tariffs (ZVT)", async () => {
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
        tariff_id: "simple1"
      } as Metering],
    } as EegParticipant]

    const r = buildAllocationMapFromSelected(participants, {"1234567890": true})

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
