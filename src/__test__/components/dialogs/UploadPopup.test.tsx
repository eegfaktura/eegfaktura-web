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

describe("upload popup: drag & drop (pilot group 2026-10-28)", () => {
  const xlsx = (name: string) => new File(["x"], name, {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})

  it("takes a dropped file like one chosen with the star", () => {
    const onDismiss = vi.fn()
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    const zone = screen.getByTestId("upload-drop-zone")
    fireEvent.dragOver(zone, {dataTransfer: {files: []}})
    expect(zone.className).toContain("drag-over")
    const file = xlsx("stammdaten.xlsx")
    fireEvent.drop(zone, {dataTransfer: {files: [file]}})
    expect(zone.className).not.toContain("drag-over")
    expect(screen.getByText("stammdaten.xlsx")).toBeTruthy()
    fireEvent.click(screen.getByText("Import"))
    const [files, sheet, type] = onDismiss.mock.calls[0][0]
    expect([files[0], sheet, type]).toEqual([file, "EEG Stammdaten", 0])
  })

  it("refuses several files at once and keeps the import empty", () => {
    const onDismiss = vi.fn()
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {dataTransfer: {files: [xlsx("a.xlsx"), xlsx("b.xlsx")]}})
    expect(screen.getByText("Bitte nur eine Datei pro Import ablegen.")).toBeTruthy()
    expect(screen.getByText("Datei hierher ziehen oder mit dem Stern auswählen")).toBeTruthy()
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss.mock.calls[0][0][0]).toBeUndefined()
  })
})
