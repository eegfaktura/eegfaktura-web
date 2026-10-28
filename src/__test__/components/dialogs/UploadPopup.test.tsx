import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import UploadPopup from "../../../components/dialogs/upload.popup";

const sheetInput = (container: HTMLElement) => container.querySelector("ion-input[name=sheetName]") as HTMLElement
const typeSheet = (container: HTMLElement, value: string) =>
  act(() => { sheetInput(container).dispatchEvent(new CustomEvent("ionChange", {detail: {value}})) })

describe("upload popup: sheet name (261028-mm2)", () => {
  it("imports with the sheet name the user typed", () => {
    const onDismiss = vi.fn()
    const {container} = render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    typeSheet(container, "Mitglieder 2026")
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss).toHaveBeenCalledWith([undefined, "Mitglieder 2026", 0], "confirm")
  })

  it("keeps the default of the other import type", () => {
    const onDismiss = vi.fn()
    const {container} = render(<UploadPopup tenant="RC100100" online={false} onDismiss={onDismiss}/>)
    // offline communities start with energy data (type 1)
    typeSheet(container, "Lastgang")
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss).toHaveBeenCalledWith([undefined, "Lastgang", 1], "confirm")
  })
})
