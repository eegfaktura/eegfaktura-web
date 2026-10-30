import { describe, it, expect, vi } from "vitest";
import {renderHook} from "@testing-library/react";

const alert = vi.fn()
vi.mock("@ionic/react", () => ({useIonAlert: () => [alert]}))

import {useConfirm} from "../../../components/core/useConfirm";

const dismiss = (role: string) => alert.mock.lastCall![0].onDidDismiss({detail: {role}} as CustomEvent)

describe("useConfirm", () => {
  it("asks first and runs the action only on confirm", () => {
    const action = vi.fn()
    const {result} = renderHook(() => useConfirm())
    result.current("Mitglied löschen", "Soll … gelöscht werden?", "Löschen", action)

    expect(action).not.toHaveBeenCalled()
    expect(alert.mock.lastCall![0].buttons[1]).toEqual({text: "Löschen", role: "confirm"})
    dismiss("confirm")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("does nothing on cancel or backdrop", () => {
    const action = vi.fn()
    const {result} = renderHook(() => useConfirm())
    result.current("Datenfreigabe aufheben", "Soll …?", "Aufheben", action)
    dismiss("cancel")
    dismiss("backdrop")
    expect(action).not.toHaveBeenCalled()
  })

  it("resolves with the choice, so a form submit can wait for it", async () => {
    const {result} = renderHook(() => useConfirm())
    const confirmed = result.current("Senden", "…?", "Senden")
    dismiss("confirm")
    expect(await confirmed).toBe(true)
    const cancelled = result.current("Senden", "…?", "Senden")
    dismiss("backdrop")
    expect(await cancelled).toBe(false)
  })
})
