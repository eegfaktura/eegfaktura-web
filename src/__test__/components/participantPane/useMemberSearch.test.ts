import {describe, expect, it} from "vitest";
import {act, renderHook} from "@testing-library/react";
import {useMemberSearch} from "../../../components/participantPane/useMemberSearch";

// platform#228 step 2: after closing the search bar the list kept filtering by the last query, so members were
// missing without a visible reason
describe("useMemberSearch", () => {
  it("filters by the typed text in lower case while the bar is open", () => {
    const {result} = renderHook(() => useMemberSearch())
    act(() => result.current.toggleSearch())
    act(() => result.current.onSearchInput("Muster"))
    expect(result.current.searchActive).toBe(true)
    expect(result.current.searchQuery).toBe("muster")
  })

  it("closing the bar clears the query", () => {
    const {result} = renderHook(() => useMemberSearch())
    act(() => result.current.toggleSearch())
    act(() => result.current.onSearchInput("muster"))
    act(() => result.current.toggleSearch())
    expect(result.current.searchActive).toBe(false)
    expect(result.current.searchQuery).toBeUndefined()
  })

  it("ignores a debounced input that arrives after the bar was closed", () => {
    const {result} = renderHook(() => useMemberSearch())
    act(() => result.current.toggleSearch())
    const lateInput = result.current.onSearchInput   // the handler the open bar was rendered with
    act(() => result.current.toggleSearch())
    act(() => lateInput("muster"))
    expect(result.current.searchQuery).toBeUndefined()
  })

  it("reopening starts with an empty search", () => {
    const {result} = renderHook(() => useMemberSearch())
    act(() => result.current.toggleSearch())
    act(() => result.current.onSearchInput("muster"))
    act(() => result.current.toggleSearch())
    act(() => result.current.toggleSearch())
    expect(result.current.searchActive).toBe(true)
    expect(result.current.searchQuery).toBeUndefined()
  })
})
