import { describe, it, expect } from "vitest";
import {isDirectDebit, suggestMandateReference} from "../../util/MandateReference.util";

describe("suggestMandateReference", () => {
  it("fills an empty reference with the member number", () => {
    expect(suggestMandateReference("", "4711")).toBe("4711");
    expect(suggestMandateReference(undefined, " 4711 ")).toBe("4711");
  });
  it("never replaces a reference typed in or already in use", () => {
    expect(suggestMandateReference("MANDAT-1", "4711")).toBeUndefined();
    expect(suggestMandateReference("MANDAT-1", "4711", "47")).toBeUndefined();
  });
  it("follows the member number while the field still holds the last suggestion", () => {
    expect(suggestMandateReference("47", "4711", "47")).toBe("4711");
  });
  it("leaves the field alone without a member number", () => {
    expect(suggestMandateReference("", "")).toBeUndefined();
    expect(suggestMandateReference("", null)).toBeUndefined();
  });
});

describe("isDirectDebit", () => {
  it("is false only for 'Kein SEPA'", () => {
    expect(isDirectDebit("NONE")).toBe(false);
    expect(isDirectDebit("CORE")).toBe(true);
    expect(isDirectDebit("B2B")).toBe(true);
    expect(isDirectDebit("")).toBe(true);
    expect(isDirectDebit(undefined)).toBe(true);
  });
});

describe("suggestMandateReference and the SEPA mandate id", () => {
  it("does not suggest a member number that is no valid mandate id", () => {
    expect(suggestMandateReference("", "EEG 001")).toBeUndefined();
    expect(suggestMandateReference("", "M_12")).toBeUndefined();
    expect(suggestMandateReference("", "Mü-1")).toBeUndefined();
    expect(suggestMandateReference("", "1".repeat(36))).toBeUndefined();
    expect(suggestMandateReference("", "EEG-001/A")).toBe("EEG-001/A");
  });
});
