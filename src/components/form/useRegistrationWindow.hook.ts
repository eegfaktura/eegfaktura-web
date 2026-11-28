import {useEffect, useState} from "react";
import moment from "moment";
import {Api} from "../../service";
import {isSameDay} from "../../util/DateFormat.util";

// The days on which the registration of a metering point may start (platform#272, market rule EC_REQ_ONL): from
// tomorrow up to the 30th working day. to is missing while the window is not loaded.
export interface RegistrationWindow {
  from: Date
  to?: Date
}

export const tomorrow = () => moment().add(1, "day").startOf("day").toDate()
// as the form holds a day: "YYYY-MM-DD" goes out as that day, a Date of local midnight as the day before
export const tomorrowDay = () => moment().add(1, "day").format("YYYY-MM-DD")

// The backend computes the window, so web and backend never count the holidays differently. Until it has answered,
// and when it fails, tomorrow is the lower bound and there is no upper one; the backend checks the bound on saving and
// sending anyway. Loaded once per form, only for an online community.
export const useRegistrationWindow = (tenant: string | undefined, enabled: boolean): RegistrationWindow => {
  const [regWindow, setRegWindow] = useState<RegistrationWindow>(() => ({from: tomorrow()}))
  useEffect(() => {
    if (!enabled || !tenant) return
    let current = true
    Api.eegService.fetchRegistrationWindow(tenant)
      .then(w => { if (current) setRegWindow(w) })
      .catch(e => console.warn("registration window not loaded, the backend checks the bound", e))
    return () => { current = false }
  }, [tenant, enabled])
  return regWindow
}

export type RegistrationDateError = "before" | "after" | undefined

// A day outside the window is an error. A stored day in the past is not: it counts as tomorrow on sending, and saving
// another field of the metering point must not fail because of it (concept, Fachliche Logik 1 and 7).
export const registrationDateError = (value: Date | string | null | undefined, window: RegistrationWindow,
                                      stored?: Date | string | null): RegistrationDateError => {
  if (!value) return undefined
  if (window.to && moment(value).isAfter(window.to, "day")) return "after"
  if (moment(value).isBefore(window.from, "day") && !isSameDay(value, stored)) return "before"
  return undefined
}
