import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

vi.mock("../pages/Participants", () => ({default: () => <div>Mitgliederseite</div>}))
vi.mock("../pages/Rates.page", () => ({default: () => <div>Tarifseite</div>}))
vi.mock("../store/hook/MemberViewProvider", () => ({default: ({children}: any) => <>{children}</>}))

import {AppErrorFallback, MemberRoutes} from "../App";

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><MemberRoutes/></MemoryRouter>)

describe("member routes and crash fallback (261024-ca12)", () => {
  it("renders nothing for another page's URL: the outlet keeps this view mounted while hidden", () => {
    for (const path of ["/page/dashboard", "/page/eeg", "/page/gibtsnicht"]) {
      const {container, unmount} = at(path)
      expect(container.textContent, path).toBe("")
      unmount()
    }
  })

  it("the known pages still render", () => {
    at("/page/participants")
    expect(screen.getByText("Mitgliederseite")).toBeTruthy()
    expect(screen.queryByText("Diese Seite gibt es nicht.")).toBeNull()
  })

  it("the rates page still renders", () => {
    at("/page/rates")
    expect(screen.getByText("Tarifseite")).toBeTruthy()
    expect(screen.queryByText("Diese Seite gibt es nicht.")).toBeNull()
  })

  it("the crash fallback is German and offers reload and the start page", () => {
    const reload = vi.fn()
    const assign = vi.fn()
    vi.stubGlobal("location", {...window.location, reload, assign})
    render(<AppErrorFallback/>)
    expect(screen.getByText("Etwas ist schiefgelaufen.")).toBeTruthy()
    fireEvent.click(screen.getByText("Neu laden"))
    expect(reload).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText("Zur Startseite"))
    expect(assign).toHaveBeenCalledWith("/")
    vi.unstubAllGlobals()
  })
})
