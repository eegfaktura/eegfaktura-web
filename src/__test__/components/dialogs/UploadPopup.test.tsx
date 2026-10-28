import {describe, expect, it, vi} from "vitest";
import {act, createEvent, fireEvent, render, screen} from "@testing-library/react";
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
    expect(onDismiss).toHaveBeenLastCalledWith([undefined, "Lastgang", 1], "confirm")
    // the master-data slot still holds its default
    fireEvent.click(screen.getByText("Stammdaten"))
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss).toHaveBeenLastCalledWith([undefined, "EEG Stammdaten", 0], "confirm")
  })

  it("falls back to the default when the field is emptied, and trims the name", () => {
    const onDismiss = vi.fn()
    const {container} = render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    typeSheet(container, "  ")
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss).toHaveBeenLastCalledWith([undefined, "EEG Stammdaten", 0], "confirm")
    typeSheet(container, "Mitglieder 2026 ")
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss).toHaveBeenLastCalledWith([undefined, "Mitglieder 2026", 0], "confirm")
  })
})

describe("upload popup: drag & drop (pilot group 2026-10-28)", () => {
  const xlsx = (name: string) => new File(["x"], name, {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
  const files = (...f: File[]) => ({dataTransfer: {files: f, types: ["Files"]}})

  it("takes a dropped file like one chosen with the star", () => {
    const onDismiss = vi.fn()
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    const zone = screen.getByTestId("upload-drop-zone")
    fireEvent.dragOver(zone, files())
    expect(zone.className).toContain("drag-over")
    const file = xlsx("stammdaten.xlsx")
    fireEvent.drop(zone, files(file))
    expect(zone.className).not.toContain("drag-over")
    expect(screen.getByText("stammdaten.xlsx")).toBeTruthy()
    fireEvent.click(screen.getByText("Import"))
    const [chosen, sheet, type] = onDismiss.mock.calls[0][0]
    expect([chosen[0], sheet, type]).toEqual([file, "EEG Stammdaten", 0])
  })

  it("takes a drop beside the zone too, so the browser does not open the file", () => {
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={vi.fn()}/>)
    const drop = createEvent.drop(document.body, files(xlsx("daneben.xlsx")))
    fireEvent(document.body, drop)
    expect(drop.defaultPrevented).toBe(true)
    expect(screen.getByText("daneben.xlsx")).toBeTruthy()
  })

  it("keeps the highlight while the drag moves between elements of the dialog", () => {
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={vi.fn()}/>)
    const zone = screen.getByTestId("upload-drop-zone")
    fireEvent.dragOver(zone, files())
    // jsdom has no DragEvent with relatedTarget: set it on the event
    const inside = createEvent.dragLeave(zone, files())
    Object.defineProperty(inside, "relatedTarget", {value: screen.getByText("Import")})
    fireEvent(zone, inside)
    expect(zone.className).toContain("drag-over")
    fireEvent.dragLeave(zone, files())
    expect(zone.className).not.toContain("drag-over")
  })

  it("leaves a text drag alone", () => {
    render(<UploadPopup tenant="RC100100" online={true} onDismiss={vi.fn()}/>)
    const drop = createEvent.drop(document.body, {dataTransfer: {files: [], types: ["text/plain"]}})
    fireEvent(document.body, drop)
    expect(drop.defaultPrevented).toBe(false)
  })

  it("refuses several files at once and drops a file chosen before", () => {
    const onDismiss = vi.fn()
    const {container} = render(<UploadPopup tenant="RC100100" online={true} onDismiss={onDismiss}/>)
    const input = container.querySelector("input[type=file]") as HTMLInputElement
    fireEvent.change(input, {target: {files: [xlsx("vorher.xlsx")]}})
    expect(screen.getByText("vorher.xlsx")).toBeTruthy()
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), files(xlsx("a.xlsx"), xlsx("b.xlsx")))
    expect(screen.getByText("Bitte nur eine Datei pro Import ablegen.")).toBeTruthy()
    expect(screen.getByText("Datei hierher ziehen oder mit dem Stern auswählen")).toBeTruthy()
    fireEvent.click(screen.getByText("Import"))
    expect(onDismiss.mock.calls[0][0][0]).toBeUndefined()
  })
})
