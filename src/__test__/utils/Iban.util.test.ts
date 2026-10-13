import { describe, it, expect } from "vitest";
import {isValidIban} from "../../util/Iban.util";

describe("isValidIban", () => {
  it("accepts valid IBANs with or without spaces", () => {
    expect(isValidIban("AT61 1904 3002 3457 3201")).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
    expect(isValidIban("at611904300234573201")).toBe(true);
  });
  it("rejects a wrong check digit and swapped digits", () => {
    expect(isValidIban("AT62 1904 3002 3457 3201")).toBe(false);
    expect(isValidIban("AT61 1904 3002 3457 3210")).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban(undefined)).toBe(false);
    expect(isValidIban("AT61")).toBe(false);
    expect(isValidIban("1234 5678 9012 3456")).toBe(false);
  });
});
