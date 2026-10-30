import {describe, expect, it} from "vitest";
import {hasErrorOnChangedField} from "../../../components/core/SaveStatus.component";

// Only errors on fields the user changed count as unsaved input (re-review PR #244): a stored incomplete value that got
// validated (e.g. by trigger() after another field changed) asks nothing.
const required = {type: "required", message: "Straße fehlt"}

describe("hasErrorOnChangedField", () => {
  it("ignores an error on an unchanged field", () => {
    expect(hasErrorOnChangedField({billingAddress: {street: required}}, {})).toBe(false)
    expect(hasErrorOnChangedField({billingAddress: {street: required}}, {billingAddress: {zip: true}})).toBe(false)
  })

  it("counts an error on a changed field, also nested", () => {
    expect(hasErrorOnChangedField({lastname: required}, {lastname: true})).toBe(true)
    expect(hasErrorOnChangedField({billingAddress: {street: required}}, {billingAddress: {street: true}})).toBe(true)
  })

  it("no errors, nothing unsaved", () => {
    expect(hasErrorOnChangedField({}, {lastname: true})).toBe(false)
  })
})
