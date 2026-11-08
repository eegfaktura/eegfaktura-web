import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup} from "@testing-library/react";
import React, {FC, ReactNode} from "react";
import {IonApp, IonContent, IonPage} from "@ionic/react";
import {IonReactRouter} from "@ionic/react-router";
import {useHistory} from "react-router-dom";
import {renderWithProviders} from "./test-utils";
import "../util/I18n";

// the pages that show the load state are real; their heavy panes and the other pages are not
const page = vi.hoisted(() => (name: string) => ({default: () => <IonPage><IonContent>{name}</IonContent></IonPage>}))
vi.mock("../pages/Rates.page", () => page("Tarifseite"))
vi.mock("../pages/Dashboard.page", () => page("Dashboardseite"))
vi.mock("../pages/MailTemplates.page", () => page("E-Mail-Texte-Seite"))
vi.mock("../pages/ParticipantRegister.page", () => page("Registrierseite"))
vi.mock("../pages/Profiles.page", () => page("Profilseite"))
vi.mock("../pages/Notification.page", () => page("Nachrichtenseite"))
vi.mock("../store/hook/MemberViewProvider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../store/hook/MemberViewProvider")>()),
  default: ({children}: any) => <>{children}</>,
}))
// one array, as the real hook returns: the EEG page sets state on every new one
const TENANTS = vi.hoisted(() => ["TE100200", "TE100300"])
vi.mock("../store/hook/AuthProvider", () => ({useTenants: () => TENANTS}))
vi.mock("../components/participantPane/ParticipantPane.component", () => ({default: () => <div>Mitgliederliste</div>}))
vi.mock("../components/participantPane/ParticipantDetailsPane.component", () => ({default: () => <div/>}))
vi.mock("../components/processDetails/ProcessDetailPane.component", () => ({default: () => <div>Prozessdetails</div>}))
vi.mock("../components/RateDetailPane.component", () => ({default: () => <div/>}))
vi.mock("../components/EegBillingConfigCard.component", () => ({default: () => <div/>}))
vi.mock("../components/dialogs/SettlementIntervalChange.dialog", () => ({default: () => null}))

import {PageRoutes} from "../App";
import {EegContext} from "../store/hook/Eeg.provider";
import {useAppSelector} from "../store";
import {eegSelector, fetchEegModel, selectTenant} from "../store/eeg";
import {Eeg} from "../models/eeg.model";

// what each page shows when its EEG is there
const MEMBERS = "Mitgliederliste", EEG = "Gemeinschafts-ID", PROCESSES = "Prozessdetails"
const PAGES: Record<string, string> = {"/page/participants": MEMBERS, "/page/eeg": EEG, "/page/processes": PROCESSES}

const eegOf = (tenant: string) => ({id: tenant, name: `EEG ${tenant}`, rcNumber: tenant, communityId: "AT0000",
  settlementInterval: "MONTHLY", online: true, address: {}, contact: {}, accountInfo: {}, optionals: {}} as unknown as Eeg)

// the EegProvider without its loading: the pages read the EEG of the selected community from the store
const Eeg_: FC<{children: ReactNode}> = ({children}) => {
  const eeg = useAppSelector(eegSelector)
  const value = {eeg, tenant: eeg?.id ?? "TE100200", isFetching: false, getTenants: () => [], isAdmin: () => true,
    isOwner: () => false, isUser: () => false, setTenant: () => {}, refresh: () => {}}
  return <EegContext.Provider value={value as any}>{children}</EegContext.Provider>
}

let history: ReturnType<typeof useHistory>
const Nav = () => { history = useHistory(); return null }

// jsdom has no ion-router-outlet.commit; like core, the entering page becomes visible (the router hides the leaving one)
const installCommit = () => {
  (document.querySelector("ion-router-outlet") as any).commit = async (entering: HTMLElement) => {
    entering.classList.remove("ion-page-invisible", "ion-page-hidden")
    return true
  }
}
const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
// the menu navigates with routerDirection "none"
const go = async (path: string) => { await act(async () => { history.push(path, {direction: "none"}) }); await settle() }
const visiblePages = () => [...document.querySelectorAll("ion-router-outlet > .ion-page")]
  .filter(el => !el.classList.contains("ion-page-hidden") && !el.classList.contains("ion-page-invisible"))

const expectShown = (path: string) => {
  const visible = visiblePages()
  expect(visible.length, `${path}: visible pages ${visible.map(e => e.textContent?.slice(0, 40))}`).toBe(1)
  expect(visible[0].textContent, path).toContain(PAGES[path])
}

const start = async () => {
  window.history.pushState({}, "", "/page/participants")
  const {store} = renderWithProviders(<IonApp><IonReactRouter><Eeg_><Nav/><PageRoutes/></Eeg_></IonReactRouter></IonApp>)
  installCommit()
  act(() => {
    store.dispatch(selectTenant("TE100200"))
    store.dispatch(fetchEegModel.fulfilled({eeg: eegOf("TE100200")}, "r1", {tenant: "TE100200"}))
  })
  // every page with a load state is mounted, the members are shown
  for (const path of ["/page/participants", "/page/eeg", "/page/processes", "/page/participants"]) {
    await go(path)
    expectShown(path)
  }
  return store
}

// the menu afterwards still shows the page of the URL
const expectMenuWorks = async () => {
  for (const path of ["/page/eeg", "/page/participants", "/page/processes", "/page/eeg", "/page/participants"]) {
    await go(path)
    expectShown(path)
  }
}

describe("the outlet shows the page of the URL after the EEG reloads (platform#237)", () => {
  beforeEach(() => localStorage.setItem("tenant", "TE100200"))
  afterEach(() => cleanup())

  it("after switching to a community that is not loaded yet", async () => {
    const store = await start()
    // the switch: no EEG until the load of the new community ends, every mounted page shows the load state
    await act(async () => {
      store.dispatch(selectTenant("TE100300"))
      store.dispatch(fetchEegModel.pending("r2", {tenant: "TE100300"}))
    })
    await settle()
    await act(async () => { store.dispatch(fetchEegModel.fulfilled({eeg: eegOf("TE100300")}, "r2", {tenant: "TE100300"})) })
    await settle()
    expectShown("/page/participants")
    await expectMenuWorks()
  })

  it("after a failed load and \"Erneut versuchen\"", async () => {
    const store = await start()
    await act(async () => { store.dispatch(fetchEegModel.rejected(new Error("Bad Gateway"), "r2", {tenant: "TE100200"})) })
    await settle()
    expect(visiblePages()[0]?.textContent).toContain("Erneut versuchen")
    await act(async () => {
      store.dispatch(fetchEegModel.pending("r3", {tenant: "TE100200"}))
      store.dispatch(fetchEegModel.fulfilled({eeg: eegOf("TE100200")}, "r3", {tenant: "TE100200"}))
    })
    await settle()
    expectShown("/page/participants")
    await expectMenuWorks()
  })
})
