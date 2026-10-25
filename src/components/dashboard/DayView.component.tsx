import {useCallback, useEffect, useRef, useState} from "react";
import {ActiveTenant} from "../../models/eeg.model";
import {Api} from "../../service";
import {
  DayReportState, dayRequestRange, startOfDay, stateForDay, toQuarterHours
} from "./DayView.functions";

// Loads the quarter hours of one day for the whole community. A slower, older answer (fast paging) never
// overwrites the answer for the day shown now.
export const useDayReport = (tenant: ActiveTenant | undefined, day: Date | undefined) => {
  const [state, setState] = useState<DayReportState>({status: "loading"})
  const request = useRef(0)

  const load = useCallback(() => {
    if (!tenant || !day) return
    const id = ++request.current
    const key = startOfDay(day).getTime()
    setState({status: "loading", day: key})
    const {start, end} = dayRequestRange(day)
    Api.energyService.fetchLoadCurveRangeV2(tenant, start, end)
      .then(report => { if (id === request.current) setState({status: "ok", day: key, quarters: toQuarterHours(report)}) })
      .catch((e: unknown) => {
        if (id === request.current) setState({status: "error", day: key, message: e instanceof Error ? e.message : String(e)})
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant, tenant?.ecId, day?.getTime()])   // useTenant() returns a new object on every render: key on its values, else load() runs on every render

  useEffect(() => { load() }, [load])

  return {state: stateForDay(state, day), reload: load}
}
