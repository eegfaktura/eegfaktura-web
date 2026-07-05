import {describe, expect, it} from "vitest";
import {EMAIL_LIST_PATTERN, isValidEmailList, normalizeEmailList} from "../../util/EmailAddress.util";

describe("normalizeEmailList", () => {
  it("trims outer whitespace per ';'-part and joins without spaces", () => {
    expect(normalizeEmailList(" a@x.at ")).toBe("a@x.at");
    expect(normalizeEmailList("a@x.at ; b@y.at")).toBe("a@x.at;b@y.at");
    expect(normalizeEmailList(" a@x.at ")).toBe("a@x.at"); // NBSP
    expect(normalizeEmailList("a@x.at;;b@y.at")).toBe("a@x.at;b@y.at");
    expect(normalizeEmailList("  ")).toBe("");
    expect(normalizeEmailList(undefined)).toBe("");
    expect(normalizeEmailList(null)).toBe("");
  });
});

describe("isValidEmailList", () => {
  it("accepts valid lists (after normalization) and empty values", () => {
    expect(isValidEmailList("a@x.at")).toBe(true);
    expect(isValidEmailList(" a@x.at ")).toBe(true);
    expect(isValidEmailList("A@X.AT")).toBe(true);
    expect(isValidEmailList("a@eeg.energy")).toBe(true); // modern gTLD
    expect(isValidEmailList("a@x.at; b@y.at")).toBe(true);
    expect(isValidEmailList("")).toBe(true); // no address is not an error
    expect(isValidEmailList("  ")).toBe(true);
    expect(isValidEmailList(undefined)).toBe(true);
  });

  it("rejects garbage, non-ASCII local parts and inner whitespace", () => {
    expect(isValidEmailList("x")).toBe(false);
    expect(isValidEmailList("hedwig.schön@x.at")).toBe(false);
    expect(isValidEmailList("a b@x.at")).toBe(false);
    expect(isValidEmailList("a@x")).toBe(false);
    expect(isValidEmailList("a@x.at;x")).toBe(false); // one bad part rejects the list
  });
});

describe("EMAIL_LIST_PATTERN (react-hook-form rule)", () => {
  it("matches the canonical stored format only", () => {
    expect(EMAIL_LIST_PATTERN.test("a@x.at")).toBe(true);
    expect(EMAIL_LIST_PATTERN.test("a@x.at;b@y.at")).toBe(true);
    expect(EMAIL_LIST_PATTERN.test("a@eeg.energy")).toBe(true);
    expect(EMAIL_LIST_PATTERN.test("x")).toBe(false);
    expect(EMAIL_LIST_PATTERN.test("a@x.at; b@y.at")).toBe(false); // no spaces in canonical form
  });
});
