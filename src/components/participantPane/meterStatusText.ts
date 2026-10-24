import {TFunction} from "i18next";

// Text for a metering point's process state in the meter detail pane. A state without a text in
// locales/<lng>/common.json ("meter.status_text_<STATE>") shows a readable fallback instead of the raw key.
export const processStateText = (t: TFunction, processState: string): string =>
  t(`meter.status_text_${processState}`, {defaultValue: `Zählpunkt-Status ${processState}.`})
