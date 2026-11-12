import {describe, expect, it} from "vitest";
import {renderWithReactHookForm} from "../../test-utils";
import {fireEvent, waitFor} from "@testing-library/react";
import React from "react";
import MeterFormElement from "../../../components/core/MeterForm.element";
import {Metering} from "../../../models/meteringpoint.model";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {Eeg} from "../../../models/eeg.model";

const RTF = "{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0{\\fonttbl{\\f0 Arial;}} AT 003000 0000000000000000000012345}"

// Copied from a PDF viewer or Word: the first clipboard item is RTF, the plain text comes later.
const clipboard = (plain: string) => ({
  items: [
    {kind: "string", type: "text/rtf", getAsString: (cb: (s: string) => void) => cb(RTF)},
    {kind: "string", type: "text/plain", getAsString: (cb: (s: string) => void) => cb(plain)},
  ],
  types: ["text/rtf", "text/plain"],
  getData: (type: string) => type === "text/plain" ? plain : type === "text/rtf" ? RTF : "",
})

const ctxValue = {
  eeg: {area: 'LOCAL', allocationMode: 'DYNAMIC'} as unknown as Eeg,
  isFetching: false,
  getTenants: () => [{tenant: "TE100100", name: "TEST EEG"}],
  isAdmin: () => true,
  isOwner: () => false,
  isUser: () => false,
  setTenant: () => {},
  refresh: async () => 1
} as unknown as EegState

const valueOf = (el: Element | null) => (el as unknown as {value?: string} | null)?.value

const renderMeter = (meteringPoint: string) => renderWithReactHookForm(
  <EegContext.Provider value={ctxValue}>
    <MeterFormElement rates={[]}/>
  </EegContext.Provider>, {defaultValues: {
    status: 'INIT', processState: 'NEW', participantId: "", meteringPoint, direction: "CONSUMPTION"
  } as Metering})

const meterInput = (container: HTMLElement) => waitFor(() => {
  const el = container.querySelector('ion-input[name=meteringPoint]')
  expect(el).not.toBeNull()
  return el!
})

// platform#256: the phone field has no paste handling of its own any more; the browser pastes plain text itself
describe("metering point: paste takes the plain text, not the first clipboard item", () => {
  it("metering point: RTF first in the clipboard → plain number without spaces", async () => {
    const {container} = renderMeter("")
    const input = await meterInput(container)
    fireEvent.paste(input, {clipboardData: clipboard("AT 003000 0000000000000000000012345")})
    await waitFor(() => expect(valueOf(input)).toBe("AT0030000000000000000000000012345"))
  });

  it("metering point: a clipboard without text (an image, a file) leaves the field alone", async () => {
    const {container} = renderMeter("AT0030000000000000000000000012345")
    const input = await meterInput(container)
    fireEvent.paste(input, {clipboardData: {items: [{kind: "file", type: "image/png", getAsString: () => {}}],
      types: ["Files"], getData: () => ""}})
    await new Promise(r => setTimeout(r, 20))
    expect(valueOf(input)).toBe("AT0030000000000000000000000012345")
  });
});
