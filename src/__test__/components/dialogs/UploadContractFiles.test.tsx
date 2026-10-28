import {describe, expect, it, vi} from "vitest";
import {createEvent, fireEvent, render, screen} from "@testing-library/react";
import UploadContractFilesDialog, {isContractFile} from "../../../components/dialogs/UploadContractFiles.dialog";
import {EegParticipant} from "../../../models/members.model";

const participant = {id: "p1", firstname: "Petra", lastname: "Eins"} as EegParticipant
const file = (name: string, type: string) => new File(["x"], name, {type})
const files = (...f: File[]) => ({dataTransfer: {files: f, types: ["Files"]}})

describe("contract upload: drag & drop (2026-10-28)", () => {
  it("adds dropped PDF, JPEG and PNG files to the list and uploads them", () => {
    const onDismiss = vi.fn()
    render(<UploadContractFilesDialog participant={participant} onDismiss={onDismiss} uploadButtonText="Hochladen"/>)
    const zone = screen.getByTestId("contract-drop-zone")
    fireEvent.dragOver(zone, files())
    expect(zone.className).toContain("drag-over")
    const pdf = file("vertrag.pdf", "application/pdf"), png = file("ausweis.png", "image/png")
    fireEvent.drop(zone, files(pdf, png))
    expect(zone.className).not.toContain("drag-over")
    expect(screen.getByText("vertrag.pdf")).toBeTruthy()
    expect(screen.getByText("ausweis.png")).toBeTruthy()
    fireEvent.click(screen.getByText("Hochladen"))
    const [data, role] = onDismiss.mock.calls[0]
    expect(role).toBe("confirm")
    expect((data as FormData).getAll("docfiles").map(f => (f as File).name)).toEqual(["vertrag.pdf", "ausweis.png"])
  })

  it("refuses other file types with a hint and keeps the accepted ones", () => {
    render(<UploadContractFilesDialog participant={participant} onDismiss={vi.fn()}/>)
    fireEvent.drop(screen.getByTestId("contract-drop-zone"), files(file("brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), file("scan.jpg", "image/jpeg")))
    expect(screen.getByText("scan.jpg")).toBeTruthy()
    expect(screen.queryByText("brief.docx")).toBeNull()
    expect(screen.getByText(/brief\.docx nicht übernommen/)).toBeTruthy()
  })

  it("takes a drop beside the dialog, so the browser does not open the file", () => {
    render(<UploadContractFilesDialog participant={participant} onDismiss={vi.fn()}/>)
    const drop = createEvent.drop(document.body, files(file("daneben.pdf", "application/pdf")))
    fireEvent(document.body, drop)
    expect(drop.defaultPrevented).toBe(true)
    expect(screen.getByText("daneben.pdf")).toBeTruthy()
  })

  it("leaves a text drag alone", () => {
    render(<UploadContractFilesDialog participant={participant} onDismiss={vi.fn()}/>)
    const drop = createEvent.drop(document.body, {dataTransfer: {files: [], types: ["text/plain"]}})
    fireEvent(document.body, drop)
    expect(drop.defaultPrevented).toBe(false)
  })

  it("decides by the type, or by the extension when the browser gives none", () => {
    expect(isContractFile(file("a.PDF", ""))).toBe(true)
    expect(isContractFile(file("a.jpeg", ""))).toBe(true)
    expect(isContractFile(file("a.txt", ""))).toBe(false)
    expect(isContractFile(file("a.pdf", "text/plain"))).toBe(false)
  })
})
