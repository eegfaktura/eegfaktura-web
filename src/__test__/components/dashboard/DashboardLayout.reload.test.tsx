import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {PieSeriesType} from "../../../pages/Dashboard.page";
import {SelectedPeriod} from "../../../models/energy.model";
import {EegParticipant} from "../../../models/members.model";
import "../../../util/I18n";

const fetchCombined = vi.hoisted(() => vi.fn())
vi.mock("../../../service", () => ({Api: {energyService: {fetchCombinedReportV2: fetchCombined}}}))
vi.mock("../../../components/dashboard/LoadSharing.component", () => ({default: () => <div/>}))
vi.mock("../../../components/dashboard/IntraDayReport.component", () => ({default: () => <div/>}))
vi.mock("../../../components/dashboard/EnergyOverview.component", () => ({default: () => <div/>}))
vi.mock("../../../components/dashboard/EegOverview.component", () => ({default: () => <div/>}))

import DashboardLayoutComponent from "../../../components/dashboard/DashboardLayout.component";

// The chart data takes seconds for a large community: a member change that leaves the metering points as they are
// must not load it again.

const eegContext = {tenant: "RC100100", eeg: {communityId: "AT00999900000RC100100000000000001", rcNumber: "RC100100"},
  isFetching: false, getTenants: () => []} as unknown as EegState
const series = {name: "", value: 0, fill: ""} as PieSeriesType
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const OCT: SelectedPeriod = {type: "YM", year: 2026, segment: 10}
const NOV: SelectedPeriod = {type: "YM", year: 2026, segment: 11}

const meter = (meteringPoint: string, changes: any = {}) => ({meteringPoint, direction: "CONSUMPTION",
  participantState: {activeSince: "2025-01-01", inactiveSince: "2999-12-31"}, ...changes})
const members = (changes: any = {}) => [{id: "a1", firstname: "Anna", meters: [meter("AT001")], ...changes}] as unknown as EegParticipant[]
const layout = (participants: EegParticipant[], activePeriod: SelectedPeriod = OCT) => <EegContext.Provider value={eegContext}>
  <DashboardLayoutComponent participants={participants} consumed={series} produced={series} allocated={series}
                            activePeriod={activePeriod}/>
</EegContext.Provider>

describe("Dashboard charts: load again only when the period or the metering points change", () => {
  beforeEach(() => { fetchCombined.mockReset().mockResolvedValue([]) })

  it("a member or metering point field change loads nothing, a period or metering point change loads again", async () => {
    const r = renderWithProviders(layout(members()))
    await flush()
    expect(fetchCombined).toHaveBeenCalledTimes(1)

    r.rerender(layout(members({firstname: "Anne", meters: [meter("AT001", {partFact: 50})]})))
    await flush()
    expect(fetchCombined).toHaveBeenCalledTimes(1)

    r.rerender(layout(members({meters: [meter("AT001"), meter("AT002")]})))
    await flush()
    expect(fetchCombined).toHaveBeenCalledTimes(2)

    r.rerender(layout(members({meters: [meter("AT001"), meter("AT002")]}), NOV))
    await flush()
    expect(fetchCombined).toHaveBeenCalledTimes(3)
  })
})
