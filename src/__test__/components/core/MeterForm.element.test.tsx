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

const renderElement = (area: string, meter: Partial<Metering>) =>
  renderWithReactHookForm(
    <EegContext.Provider value={ctxValue(area)}>
      <MeterFormElement rates={[]}/>
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

  it("EEG: grid operator stays hidden", async () => {
    renderElement('LOCAL', {})
    await screen.findAllByText(/Zählpunkt/)
    expect(screen.queryByText(/Netzbetreiber-ID/)).not.toBeInTheDocument()
  });
});
