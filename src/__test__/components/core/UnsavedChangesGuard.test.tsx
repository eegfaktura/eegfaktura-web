import { describe, expect, it, vi } from "vitest";
import {act, render, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter, useHistory} from "react-router";
import {Route} from "react-router-dom";
import {IonApp, IonContent, IonItem, IonPage, IonRouterOutlet} from "@ionic/react";
import {IonReactRouter} from "@ionic/react-router";
import UnsavedChangesGuard, {UNSAVED_CHANGES_MESSAGE} from "../../../components/core/UnsavedChangesGuard.component";

// renders the guard in a memory router and hands out its history to navigate with
const setup = (dirty: boolean, allowLeave?: () => boolean) => {
  const confirm = vi.fn((_message: string, callback: (ok: boolean) => void) => callback(false))
  let history: ReturnType<typeof useHistory> | undefined
  const Capture = () => { history = useHistory(); return null }
  render(
    <MemoryRouter initialEntries={["/page/addParticipant"]} getUserConfirmation={confirm}>
      <UnsavedChangesGuard dirty={dirty} allowLeave={allowLeave}/>
      <Capture/>
    </MemoryRouter>
  )
  return {confirm, history: history!}
}

describe("UnsavedChangesGuard (261024-ca18)", () => {
  it("asks before leaving a form with unsaved input and stays when declined", () => {
    const {confirm, history} = setup(true)
    act(() => history.push("/page/participants"))
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE, expect.any(Function))
    expect(history.location.pathname).toBe("/page/addParticipant")
  })

  it("lets a clean form go without asking", () => {
    const {confirm, history} = setup(false)
    act(() => history.push("/page/participants"))
    expect(confirm).not.toHaveBeenCalled()
    expect(history.location.pathname).toBe("/page/participants")
  })

  it("lets the navigation after a successful save pass", () => {
    const {confirm, history} = setup(true, () => true)
    act(() => history.push("/page/participants"))
    expect(confirm).not.toHaveBeenCalled()
    expect(history.location.pathname).toBe("/page/participants")
  })

  it("asks the browser before a reload or closing the tab", () => {
    setup(true)
    const event = new Event("beforeunload", {cancelable: true})
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it("asks only while its page is shown: a page left through the menu stays mounted, hidden", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    const page = (name: string, next?: string) => () =>
      <IonPage><IonContent>{name}{name === "Formular" && <UnsavedChangesGuard dirty={true}/>}
        {next && <IonItem routerLink={next} routerDirection="none">nach {next}</IonItem>}</IonContent></IonPage>
    window.history.pushState({}, "", "/form")
    render(<IonApp><IonReactRouter><IonRouterOutlet>
      <Route path="/form" exact component={page("Formular", "/b")}/>
      <Route path="/b" exact component={page("Seite B", "/c")}/>
      <Route path="/c" exact component={page("Seite C")}/>
    </IonRouterOutlet></IonReactRouter></IonApp>)
    const click = async (text: string) => {
      await act(async () => { (await screen.findByText(text)).click() })
      await act(async () => { await new Promise(r => setTimeout(r, 100)) })
    }
    await click("nach /b")
    expect(confirm).toHaveBeenCalledTimes(1)
    await click("nach /c")
    expect(window.location.pathname).toBe("/c")
    expect(confirm).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })
})
