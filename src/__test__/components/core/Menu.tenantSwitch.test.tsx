import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render} from "@testing-library/react";
import React from "react";
import "../../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))

import {UserDetailPopover} from "../../../components/Menu";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {UNSAVED_DISCARD_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

// Another community closes the "add metering point" pane: with unsaved input there the switch asks first
// (platform#228 step 4).
const setup = (addMeterDirty: boolean) => {
  const setTenant = vi.fn()
  // one list for every render: a new array on each render would re-sort the menu endlessly
  const tenants = [{tenant: "RC100100", name: "Eins"}, {tenant: "RC100200", name: "Zwei"}]
  const eeg = {tenant: "RC100100", setTenant, getTenants: () => tenants} as unknown as EegState
  const {container} = render(
    <EegContext.Provider value={eeg}>
      <ParticipantContext.Provider value={{showAddMeterPane: true, addMeterDirty} as any}>
        <UserDetailPopover authSvc={undefined}/>
      </ParticipantContext.Provider>
    </EegContext.Provider>)
  const select = container.querySelector("ion-select") as any
  const choose = (value: string) => {
    select.value = value
    fireEvent(select, new CustomEvent("ionChange", {detail: {value}}))
  }
  return {setTenant, select, choose}
}

describe("community switch with unsaved input in „Zählpunkt hinzufügen“ (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("asks first; declined, the community and the select stay", () => {
    const {setTenant, select, choose} = setup(true)
    choose("RC100200")
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "cancel"}}))
    expect(setTenant).not.toHaveBeenCalled()
    expect(select.value).toBe("RC100100")
  })

  it("switches on confirm", () => {
    const {setTenant, choose} = setup(true)
    choose("RC100200")
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(setTenant).toHaveBeenCalledWith("RC100200")
  })

  it("switches directly without unsaved input", () => {
    const {setTenant, choose} = setup(false)
    choose("RC100200")
    expect(alert).not.toHaveBeenCalled()
    expect(setTenant).toHaveBeenCalledWith("RC100200")
  })
})
