import {isFulfilled, isPending, isRejected, Reducer, UnknownAction} from "@reduxjs/toolkit";
import {selectTenant} from "./eeg";

// Slices that only hold data of the selected community (tenant). On a community switch they start empty
// again, until the new community is loaded (261024-ca13).
const tenantScopedSlices = ["participant", "rate", "energy", "billing", "billingRun", "billingConfig"] as const

const sameTenant = (a: string, b: string) => a.toUpperCase() === b.toUpperCase()

// the community a request was sent for: thunk argument `tenant` (string or ActiveTenant), the `tenant` argument
// of an RTK Query call, or the `tenant` header of its request.
// Requests without a community (e.g. the user's community list) are not filtered.
const requestTenant = (action: any): string | undefined => {
  const t = action.meta?.arg?.tenant ?? action.meta?.arg?.originalArgs?.tenant
  if (typeof t === "string") return t
  if (typeof t?.tenant === "string") return t.tenant
  return action.meta?.baseQueryMeta?.request?.headers?.get?.("tenant") ?? undefined
}

export const tenantScoped = <S extends { eeg: { selectedTenant: string | null } }>(reducer: Reducer<S>): Reducer<S> =>
  (state: S | undefined, action: UnknownAction) => {
    const current = state?.eeg?.selectedTenant
    if (state && current) {
      if (selectTenant.match(action) && !sameTenant(action.payload, current)) {
        const cleared = {...state} as any
        tenantScopedSlices.forEach(slice => cleared[slice] = undefined)
        return reducer(cleared, action)
      }
      // a request of the previous community (its start, e.g. a poller's next tick, or its answer) must not change
      // the new community: the community data stays as it is; request bookkeeping (RTK Query caches, the user's
      // community list) still takes it
      if (isPending(action) || isFulfilled(action) || isRejected(action)) {
        const tenant = requestTenant(action)
        if (tenant && !sameTenant(tenant, current)) {
          const next = {...reducer(state, action)} as any
          ;[...tenantScopedSlices, "eeg"].forEach(slice => next[slice] = (state as any)[slice])
          return next
        }
      }
    }
    return reducer(state, action)
  }
