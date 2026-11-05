import {Eeg} from "../models/eeg.model";

type Area = Eeg["area"]

// Short forms of a community's type, the same as in admin (platform#229, E7). Typed with the area union, so a new
// type without a label does not compile.
const AREA_LABELS: Record<Area, string> = {
  LOCAL: "EEG lokal",
  REGIONAL: "EEG regional",
  GEA: "GEA",
  BEG: "BEG",
  P2P: "P2P",
  EVA: "EVA",
}

// Unknown or missing values are shown as they are.
export const areaLabel = (area?: string) =>
  area && Object.prototype.hasOwnProperty.call(AREA_LABELS, area) ? AREA_LABELS[area as Area] : area

// Is billing (tariffs, billing runs, invoices, joining fee) provided for this community? Not for peer-to-peer and
// self-supply (platform#229, E4/E5); billing rejects their runs as well. While the community is not loaded yet
// (undefined) the answer is true, as before.
export const hasBilling = (area?: string) => area !== "P2P" && area !== "EVA"
