import {TFunction} from "i18next";
import moment from "moment";
import {Metering} from "../../models/meteringpoint.model";

// Text for a metering point's process state in the meter detail pane. A state without a text in
// locales/<lng>/common.json ("meter.status_text_<STATE>") shows a readable fallback instead of the raw key.
export const processStateText = (t: TFunction, processState: string): string =>
  t(`meter.status_text_${processState}`, {defaultValue: `Zählpunkt-Status ${processState}.`})

// Header of the active toggle in the meter detail pane. The grid operator can report the activation before its date
// (EEG Perg, 28.11.2026: ABSCHLUSS_ECON on 28.11. for 01.12.): the metering point is active at the grid operator, but
// counts only from activeSince, so the text names that day (platform#272). Only the text; the state stays ACTIVE.
export const meterActiveText = (meter: Pick<Metering, "processState" | "participantState">): string => {
  if (meter.processState !== "ACTIVE") return "Zählpunkt inaktiv"
  const since = meter.participantState?.activeSince
  return since && moment(since).isAfter(moment(), "day")
    ? `Zählpunkt aktiv ab ${moment(since).format("DD.MM.YYYY")}` : "Zählpunkt aktiv"
}
