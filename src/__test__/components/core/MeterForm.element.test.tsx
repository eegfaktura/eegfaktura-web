import { describe, expect, it } from "vitest";
import {renderWithReactHookForm} from "../../test-utils";
import {screen} from "@testing-library/react";
import React from "react";
import MeterFormElement from "../../../components/core/MeterForm.element";
import {Metering} from "../../../models/meteringpoint.model";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {Eeg} from "../../../models/eeg.model";

const ctxValue = (area: string) => ({
  eeg: {area: area, allocationMode: 'DYNAMIC', gridOperator: 'AT003000', operatorName: 'Netz OÖ'} as unknown as Eeg,
  isFetching: false,
  getTenants: () => [{tenant: "TE100100", name: "TEST EEG"}],
  isAdmin: () => true,
  isOwner: () => false,
  isUser: () => false,
  setTenant: (tenant: string) => {},
  refresh: async () => 1
} as unknown as EegState)

const renderElement = (area: string, meter: Partial<Metering>, meterReadOnly?: boolean) =>
  renderWithReactHookForm(
    <EegContext.Provider value={ctxValue(area)}>
      <MeterFormElement rates={[]} meterReadOnly={meterReadOnly}/>
    </EegContext.Provider>, {defaultValues: {
      status: 'INIT', processState: 'NEW', participantId: "", meteringPoint: "", direction: "CONSUMPTION", ...meter
    } as Metering})

// platform#107: the grid operator is derived from the metering point number by the backend
describe("<MeterFormElement /> grid operator", () => {

  it("BEG: grid operator is display only, with a hint before saving", async () => {
    const {container} = renderElement('BEG', {})
    await screen.findByText(/Netzbetreiber-ID/)
    expect(container.querySelector('[name=gridOperatorId]')).toBeNull()
    screen.getByText(/Wird beim Speichern aus der Zählpunktnummer ermittelt/)
  });

  it("BEG: shows the value set by the backend", async () => {
    const {container} = renderElement('BEG', {gridOperatorId: 'AT008000', gridOperatorName: 'Energienetze Steiermark'})
    await screen.findByText('AT008000')
    screen.getByText('Energienetze Steiermark')
    expect(container.querySelector('[name=gridOperatorId]')).toBeNull()
    expect(screen.queryByText(/Wird beim Speichern/)).not.toBeInTheDocument()
  });

  it("BEG: no hint on a read-only metering point that cannot be saved", async () => {
    renderElement('BEG', {processState: 'ACTIVE', status: 'ACTIVE'} as Partial<Metering>, true)
    await screen.findByText(/Netzbetreiber-ID/)
    expect(screen.queryByText(/Wird beim Speichern/)).not.toBeInTheDocument()
  });

  it("EEG: grid operator stays hidden", async () => {
    renderElement('LOCAL', {})
    await screen.findAllByText(/Zählpunkt/)
    expect(screen.queryByText(/Netzbetreiber-ID/)).not.toBeInTheDocument()
  });

  // platform#229 addendum: P2P and EVA run like a BEG, with metering points at several grid operators
  it.each(['P2P', 'EVA'])("%s: shows the grid operator set by the backend, like a BEG", async (area) => {
    renderElement(area, {gridOperatorId: 'AT001000', gridOperatorName: 'Wiener Netze'})
    await screen.findByText('AT001000')
    screen.getByText('Wiener Netze')
    screen.getByText(/Netzbetreiber-ID/)
  });
});

// platform#229 addendum: TechCode and FuelCode from the metering point list, read only
describe("<MeterFormElement /> codes of the metering point list", () => {
  const codeField = (container: HTMLElement, label: string) =>
    container.querySelector(`ion-input[label="${label}"]`) as (HTMLElement & {value?: string, readonly?: boolean}) | null

  it("an existing metering point shows them as read-only fields, not as input", async () => {
    const {container} = renderElement('LOCAL', {processState: 'ACTIVE', status: 'ACTIVE', techCode: 'PV01',
      fuelCode: 'E01'} as Partial<Metering>, true)
    await screen.findAllByText(/Zählpunkt/)
    expect(codeField(container, "Technologie (Code)")?.value).toBe('PV01')
    expect(codeField(container, "Energieträger (Code)")?.value).toBe('E01')
    expect(codeField(container, "Technologie (Code)")?.readonly).toBe(true)
    expect(container.querySelector('[name=techCode]')).toBeNull()
    expect(container.querySelector('[name=fuelCode]')).toBeNull()
  });

  // review of 08.11.2026: no empty boxes when the metering point list delivered no code
  it("an existing metering point without codes shows none, one code only that one", async () => {
    const none = renderElement('LOCAL', {processState: 'ACTIVE', status: 'ACTIVE'} as Partial<Metering>, true)
    await screen.findAllByText(/Zählpunkt/)
    expect(codeField(none.container, "Technologie (Code)")).toBeNull()
    expect(codeField(none.container, "Energieträger (Code)")).toBeNull()
    none.unmount()

    const one = renderElement('LOCAL', {processState: 'ACTIVE', status: 'ACTIVE', techCode: 'PV01'} as Partial<Metering>, true)
    await screen.findAllByText(/Zählpunkt/)
    expect(codeField(one.container, "Technologie (Code)")?.value).toBe('PV01')
    expect(codeField(one.container, "Energieträger (Code)")).toBeNull()
  });

  it("a new metering point has none", async () => {
    const {container} = renderElement('LOCAL', {})
    await screen.findAllByText(/Zählpunkt/)
    expect(codeField(container, "Technologie (Code)")).toBeNull()
  });
});
