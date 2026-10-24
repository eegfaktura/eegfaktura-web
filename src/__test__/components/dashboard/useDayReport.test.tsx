import {describe, it, expect, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {useDayReport} from "../../../components/dashboard/DayView.component";
import {ActiveTenant} from "../../../models/eeg.model";

const fetchDay = vi.hoisted(() => vi.fn())
vi.mock("../../../service", () => ({Api: {energyService: {fetchLoadCurveRangeV2: fetchDay}}}))

describe("useDayReport", () => {
  it("loads a day once, also when the tenant object is new on every render (useTenant)", async () => {
    fetchDay.mockResolvedValue([])
    const day = new Date(2026, 9, 1)
    const tenantOf = () => ({tenant: "RC100100", ecId: "AT00999900000RC100100000000000001"} as ActiveTenant)
    const {result, rerender} = renderHook(({t}) => useDayReport(t, day), {initialProps: {t: tenantOf()}})
    await waitFor(() => expect(result.current.state.status).toBe("ok"))
    rerender({t: tenantOf()})
    rerender({t: tenantOf()})
    await waitFor(() => expect(result.current.state.status).toBe("ok"))
    expect(fetchDay).toHaveBeenCalledTimes(1)
  })
})
