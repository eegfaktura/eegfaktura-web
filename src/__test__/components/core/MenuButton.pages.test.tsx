import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, render} from "@testing-library/react";
import {readdirSync, readFileSync} from "fs";
import {join} from "path";
import {renderWithProviders} from "../../test-utils";
import "../../../util/I18n";

vi.mock("../../../store/hook/Eeg.provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/hook/Eeg.provider")>()),
  useTenant: () => ({tenant: "RC100100"}),
}))
vi.mock("../../../store/hook/AuthProvider", () => ({useTenants: () => ["RC100100"]}))
vi.mock("../../../components/RateDetailPane.component", () => ({default: () => <div/>}))
vi.mock("../../../components/dashboard/DashboardLayout.component", () => ({default: () => <div/>}))

import MenuHeaderComponent from "../../../components/core/MenuHeader.component";
import NotFoundPage from "../../../pages/NotFound.page";
import RatesPage from "../../../pages/Rates.page";
import DashboardPage from "../../../pages/Dashboard.page";
import EegLoadStateComponent from "../../../components/EegLoadState.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import {setSelectedPeriod} from "../../../store/energy";

const menuButton = (container: HTMLElement) => container.querySelector("ion-menu-button")

// Below 992 px the split pane hides the side menu; every page needs a button that opens it (261024-ca9).
// IonMenuButton hides itself while the menu is shown beside the page (autoHide), the extra header hides from 992 px on.
describe("menu button below 992 px (261024-ca9)", () => {
  afterEach(() => cleanup())

  it("the menu header has a menu button and is hidden from the split pane breakpoint on", () => {
    const {container} = render(<MenuHeaderComponent/>)
    expect(menuButton(container)).toBeTruthy()
    expect(container.querySelector("ion-header")!.classList.contains("ion-hide-lg-up")).toBe(true)
  })

  it("pages without a toolbar of their own have one", () => {
    expect(menuButton(render(<NotFoundPage/>).container)).toBeTruthy()
    cleanup()
    expect(menuButton(renderWithProviders(<EegLoadStateComponent/>).container)).toBeTruthy()
    cleanup()
    const dashboard = renderWithProviders(
      <ParticipantContext.Provider value={{participants: [], reloadEnergyReport: vi.fn()} as any}>
        <DashboardPage/></ParticipantContext.Provider>)
    act(() => { dashboard.store.dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 10})) })
    expect(menuButton(dashboard.container)).toBeTruthy()
  })

  it("the tariff page has it in its toolbar", () => {
    const {container} = renderWithProviders(<RatesPage/>)
    expect(container.querySelector("ion-toolbar ion-menu-button")).toBeTruthy()
  })

  // a guard for pages this file does not render: every IonPage brings the menu header or a menu button
  it("every page in src/pages has a menu button", () => {
    const dir = join(__dirname, "../../../pages")
    const pages = readdirSync(dir).filter(f => f.endsWith(".tsx"))
      .map(f => [f, readFileSync(join(dir, f), "utf-8")] as const)
      // the login page is shown before signing in, without the menu
      .filter(([file, src]) => file !== "Login.tsx" && /<IonPage[\s>]/.test(src))
    expect(pages.length).toBeGreaterThan(5)
    for (const [file, src] of pages) {
      // the member page shows the member pane, whose toolbar has the button
      const own = file === "Participants.tsx" ? readFileSync(join(__dirname,
        "../../../components/participantPane/ParticipantPane.component.tsx"), "utf-8") : src
      expect(/<MenuHeaderComponent\s*\/>|<IonMenuButton/.test(own), file).toBe(true)
    }
  })
})
