import {Eeg} from "../models/eeg.model";

type Area = Eeg["area"]

// A community's type: the short form of admin (platform#229, E7) and the long form in brackets (07.11.2026, Harald:
// field „Modell“). Typed with the area union, so a new type without a label does not compile.
const AREA_LABELS: Record<Area, string> = {
  LOCAL: "EEG lokal (Erneuerbare-Energie-Gemeinschaft, lokal)",
  REGIONAL: "EEG regional (Erneuerbare-Energie-Gemeinschaft, regional)",
  GEA: "GEA (Gemeinschaftliche Erzeugungsanlage)",
  BEG: "BEG (Bürgerenergiegemeinschaft)",
  P2P: "P2P (Peer-to-Peer)",
  EVA: "EVA (Eigenversorgungsanlage)",
}

// Unknown or missing values are shown as they are.
export const areaLabel = (area?: string) =>
  area && Object.prototype.hasOwnProperty.call(AREA_LABELS, area) ? AREA_LABELS[area as Area] : area

// Is billing (tariffs, billing runs, invoices, joining fee) provided for this community? Not for peer-to-peer and
// self-supply (platform#229, E4/E5); billing rejects their runs as well. While the community is not loaded yet
// (undefined) the answer is true, as before.
export const hasBilling = (area?: string) => area !== "P2P" && area !== "EVA"

// May the community have metering points at several grid operators? BEG, and P2P/EVA like a BEG (handled centrally by
// ebUtilities, platform#229 addendum 05.11.2026): each metering point shows its grid operator, and the metering point
// list is requested per grid operator.
export const hasMultipleGridOperators = (area?: string) => area === "BEG" || area === "P2P" || area === "EVA"

// The community's zone level (ECZoneLevel 1–7 of the metering point list, platform#229 addendum 05.11.2026), named in
// the locales (common-info.zone-level_1 … _7): "3 (Lokalbereich)"; no or an unknown value: zone-level_unknown
export const zoneLevelLabel = (t: (key: string) => string, level?: number | null) =>
  level && Number.isInteger(level) && level >= 1 && level <= 7
    ? `${level} (${t(`common-info.zone-level_${level}`)})` : t("common-info.zone-level_unknown")
