import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, render, screen} from "@testing-library/react";
import {IonApp, IonContent, IonPage} from "@ionic/react";
import {IonReactRouter} from "@ionic/react-router";
import {useHistory} from "react-router-dom";

// every page is a plain IonPage with its name, as the real pages are IonPages
const page = vi.hoisted(() => (name: string) => ({default: () => <IonPage><IonContent>{name}</IonContent></IonPage>}))
vi.mock("../pages/Participants", () => page("Mitgliederseite"))
vi.mock("../pages/Rates.page", () => page("Tarifseite"))
vi.mock("../pages/Eeg.page", () => page("EEG-Seite"))
vi.mock("../pages/Dashboard.page", () => page("Dashboardseite"))
vi.mock("../pages/ParticipantRegister.page", () => page("Registrierseite"))
vi.mock("../pages/Profiles.page", () => page("Profilseite"))
vi.mock("../pages/Processes.page", () => page("Prozessseite"))
vi.mock("../pages/Notification.page", () => page("Nachrichtenseite"))
vi.mock("../store/hook/MemberViewProvider", () => ({default: ({children}: any) => <>{children}</>}))

import {PageRoutes} from "../App";

let history: ReturnType<typeof useHistory>
const Nav = () => { history = useHistory(); return null }

const start = (path: string) => {
  window.history.pushState({}, "", path)
  render(<IonApp><IonReactRouter><Nav/><PageRoutes/></IonReactRouter></IonApp>)
}
const go = async (path: string) => { await act(async () => { history.push(path) }); await act(async () => { await new Promise(r => setTimeout(r, 50)) }) }

// jsdom runs no page transition (no ion-page-hidden): the number of visible pages is checked in the browser
// (PR description); these tests guard the route matching inside IonRouterOutlet.
describe("IonRouterOutlet routes (261024-ca12)", () => {
  afterEach(() => cleanup())

  it("an unknown URL shows the not-found page", async () => {
    start("/page/gibtsnicht")
    await go("/page/gibtsnicht")
    expect(await screen.findByText("Diese Seite gibt es nicht.")).toBeTruthy()
  })

  it("leaving the members for other pages never shows the not-found page", async () => {
    start("/page/participants")
    await go("/page/participants")
    expect(await screen.findByText("Mitgliederseite")).toBeTruthy()
    for (const [path, name] of [["/page/eeg", "EEG-Seite"], ["/page/addParticipant", "Registrierseite"],
      ["/page/dashboard", "Dashboardseite"], ["/page/rates", "Tarifseite"], ["/page/notifications", "Nachrichtenseite"]]) {
      await go(path)
      expect(await screen.findByText(name)).toBeTruthy()
      expect(screen.queryByText("Diese Seite gibt es nicht.")).toBeNull()
    }
  })
})
