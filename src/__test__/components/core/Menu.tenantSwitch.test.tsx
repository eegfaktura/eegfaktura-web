import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import "../../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))

import {UserDetailPopover} from "../../../components/Menu";
import {TenantPickerList} from "../../../components/core/TenantPicker.component";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {UNSAVED_DISCARD_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

const TWO = [{tenant: "RC100200", name: "Zwei"}, {tenant: "RC100100", name: "Eins"}]
const MANY = [...TWO, {tenant: "RC104947", name: "EEG Sonnenwein"}, {tenant: "CC100076", name: "Über-Strom"}]

const setup = (addMeterDirty: boolean, tariffDirty = false, tenants = TWO) => {
  const setTenant = vi.fn()
  const onDone = vi.fn()
  const eeg = {tenant: "RC100100", setTenant, getTenants: () => tenants} as unknown as EegState
  const r = render(
    <EegContext.Provider value={eeg}>
      <ParticipantContext.Provider value={{unsaved: {addMeter: addMeterDirty, tariff: tariffDirty}} as any}>
        <TenantPickerList onDone={onDone}/>
      </ParticipantContext.Provider>
    </EegContext.Provider>)
  const choose = (label: string) => fireEvent.click(screen.getByText(label).closest("ion-item")!)
  const labels = () => Array.from(r.container.querySelectorAll("ion-item ion-label")).map(e => e.textContent)
  const search = (value: string) => act(() => {
    fireEvent(r.container.querySelector("ion-searchbar")!, new CustomEvent("ionInput", {detail: {value}}))
  })
  return {setTenant, onDone, choose, labels, search, container: r.container}
}

describe("community switch with unsaved input in „Zählpunkt hinzufügen“ (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("asks first; declined, the community stays and the picker stays open", () => {
    const {setTenant, onDone, choose} = setup(true)
    choose("RC100200-Zwei")
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "cancel"}}))
    expect(setTenant).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("switches on confirm and closes the picker", () => {
    const {setTenant, onDone, choose} = setup(true)
    choose("RC100200-Zwei")
    act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(setTenant).toHaveBeenCalledWith("RC100200")
    expect(onDone).toHaveBeenCalled()
  })

  it("switches directly without unsaved input", () => {
    const {setTenant, choose} = setup(false)
    choose("RC100200-Zwei")
    expect(alert).not.toHaveBeenCalled()
    expect(setTenant).toHaveBeenCalledWith("RC100200")
  })

  it("asks too while the tariff editor holds unsaved changes (review PR #244)", () => {
    const {setTenant, choose} = setup(false, true)
    choose("RC100200-Zwei")
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    expect(setTenant).not.toHaveBeenCalled()
  })

  it("choosing the current community only closes the picker, also with unsaved input", () => {
    const {setTenant, onDone, choose} = setup(true)
    choose("RC100100-Eins")
    expect(alert).not.toHaveBeenCalled()
    expect(setTenant).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })
})

// platform#241: a search field as soon as there is more than one community (Harald, 07.11.2026)
describe("community picker search (platform#241)", () => {
  beforeEach(() => alert.mockReset())

  it("lists the communities sorted by number and marks the current one", () => {
    const {labels, container} = setup(false, false, MANY)
    expect(labels()).toEqual(["CC100076-Über-Strom", "RC100100-Eins", "RC100200-Zwei", "RC104947-EEG Sonnenwein"])
    expect(container.querySelectorAll("ion-icon[slot='end']")).toHaveLength(1)
  })

  it("filters by number and by name, ignoring case and accents", () => {
    const {labels, search} = setup(false, false, MANY)
    search("rc1049")
    expect(labels()).toEqual(["RC104947-EEG Sonnenwein"])
    search("sonnen")
    expect(labels()).toEqual(["RC104947-EEG Sonnenwein"])
    search("uber")
    expect(labels()).toEqual(["CC100076-Über-Strom"])
  })

  it("says so when nothing matches", () => {
    const {labels, search} = setup(false, false, MANY)
    search("xyz")
    expect(labels()).toEqual([])
    expect(screen.getByText("Keine Gemeinschaft gefunden.")).toBeTruthy()
  })

  it("shows no empty-result text without a search, also with no community loaded", () => {
    setup(false, false, [])
    expect(screen.queryByText("Keine Gemeinschaft gefunden.")).toBeNull()
  })

  it("finds the label as the menu shows it", () => {
    const {labels, search} = setup(false, false, MANY)
    search("RC104947-EEG Sonnenwein")
    expect(labels()).toEqual(["RC104947-EEG Sonnenwein"])
  })

  it("shows no search field with a single community", () => {
    const {container} = setup(false, false, [{tenant: "RC100100", name: "Eins"}])
    expect(container.querySelector("ion-searchbar")).toBeNull()
  })
})

describe("user popover (platform#241)", () => {
  it("shows the current community and opens the picker on click", () => {
    const onPickTenant = vi.fn()
    const eeg = {tenant: "RC100100", setTenant: vi.fn(), getTenants: () => TWO} as unknown as EegState
    render(<EegContext.Provider value={eeg}><UserDetailPopover authSvc={undefined} onPickTenant={onPickTenant}/></EegContext.Provider>)
    fireEvent.click(screen.getByText("RC100100-Eins").closest("ion-item")!)
    expect(onPickTenant).toHaveBeenCalled()
  })
})
