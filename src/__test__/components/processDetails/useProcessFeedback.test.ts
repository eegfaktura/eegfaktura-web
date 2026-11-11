import { describe, it, expect, vi } from "vitest";
import {renderHook} from "@testing-library/react";

const toaster = vi.fn()
vi.mock("@ionic/react", () => ({useIonToast: () => [toaster]}))
vi.mock("../../../store/hook/useLocale", () => ({useLocale: () => ({t: (key: string) => key})}))

import {useProcessFeedback} from "../../../components/processDetails/useProcessFeedback";

describe("useProcessFeedback", () => {
  it("confirms a sent request", () => {
    const {result} = renderHook(() => useProcessFeedback())
    result.current.sent()
    expect(toaster).toHaveBeenLastCalledWith(expect.objectContaining({message: "process.request_ok"}))
  })

  it("adds a note to the confirmation and shows it longer", () => {
    const {result} = renderHook(() => useProcessFeedback())
    result.current.sent("1 Zählpunkt wurde in der letzten Stunde schon angefordert.")
    expect(toaster).toHaveBeenLastCalledWith(expect.objectContaining({
      message: "process.request_ok 1 Zählpunkt wurde in der letzten Stunde schon angefordert.", duration: 8000}))
  })

  it("shows an info instead of the confirmation", () => {
    const {result} = renderHook(() => useProcessFeedback())
    result.current.info("Es wird nichts angefordert.")
    expect(toaster).toHaveBeenLastCalledWith(expect.objectContaining({message: "Es wird nichts angefordert."}))
  })

  it("shows a failed request with its reason until closed", () => {
    const {result} = renderHook(() => useProcessFeedback())
    result.current.failed(new Error("Zählpunkt unbekannt"))
    const arg = toaster.mock.lastCall![0]
    expect(arg.message).toBe("process.request_error (Zählpunkt unbekannt)")
    expect(arg.color).toBe("danger")
    expect(arg.duration).toBeUndefined()
  })
})
