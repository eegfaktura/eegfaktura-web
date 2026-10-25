import { describe, expect, it, vi } from "vitest";
import {act, render} from "@testing-library/react";
import React from "react";
import {MemoryRouter, useHistory} from "react-router";
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
})
