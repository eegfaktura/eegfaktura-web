import {describe, expect, it} from "vitest";
import {act, renderHook} from "@testing-library/react";
import {useSaveStatus} from "../../../components/core/SaveStatus.component";

// Only the answer to the latest save of a field counts (review PR #244): an older save of the same field that answers
// late must not override the newer one.
const deferred = () => {
  let resolve: (v: unknown) => void = () => {}
  const promise = new Promise(r => { resolve = r })
  return {promise, resolve}
}

describe("useSaveStatus: the latest save of a field wins", () => {
  it("a slow failure of value a does not mark the saved value b as failed", async () => {
    const slow = deferred(), fast = deferred()
    const answers: Record<string, Promise<unknown>> = {a: slow.promise, b: fast.promise}
    const {result} = renderHook(() => useSaveStatus((_name, value) => answers[value]))
    act(() => { result.current.save("x", "a"); result.current.save("x", "b") })
    await act(async () => fast.resolve(true))
    await act(async () => slow.resolve(false))
    expect(result.current.failed).toEqual({})
    expect(result.current.saving).toBe(false)
  })

  it("a slow success of value a does not clear the failure of b; retry sends only b", async () => {
    const slow = deferred(), fast = deferred()
    const sent: string[] = []
    const answers: Record<string, Promise<unknown>> = {a: slow.promise, b: fast.promise}
    const {result} = renderHook(() => useSaveStatus((_name, value) => { sent.push(value); return answers[value] ?? Promise.resolve(true) }))
    act(() => { result.current.save("x", "a"); result.current.save("x", "b") })
    await act(async () => fast.resolve(false))
    await act(async () => slow.resolve(true))
    expect(result.current.failed).toEqual({x: "b"})
    answers.b = Promise.resolve(true)
    await act(async () => result.current.retry())
    expect(sent).toEqual(["a", "b", "b"])
    expect(result.current.failed).toEqual({})
  })
})
