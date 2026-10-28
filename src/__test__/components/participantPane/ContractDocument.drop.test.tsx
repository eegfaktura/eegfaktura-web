import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, createEvent, fireEvent, render, screen} from "@testing-library/react";

// the modal is not part of this test: keep what the area hands to it
const modal = vi.hoisted(() => ({props: undefined as any, present: vi.fn()}))
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonModal: (_c: unknown, props: unknown) => { modal.props = props; return [modal.present, vi.fn()] },
}))

import ContractDocumentComponent from "../../../components/participantPane/ContractDocument.component";
import {Api} from "../../../service";
import {EegParticipant} from "../../../models/members.model";

const participant = {id: "p1", firstname: "Anna", lastname: "Linz"} as EegParticipant
const files = (...f: File[]) => ({dataTransfer: {files: f, types: ["Files"]}})

describe("contract area: drop files to upload (2026-10-28)", () => {
  beforeEach(() => {
    modal.present.mockReset()
    Api.fileService = {loadContractDocumentInfos: vi.fn().mockResolvedValue([])} as unknown as typeof Api.fileService
  })

  it("opens the upload dialog with the dropped files", async () => {
    await act(async () => { render(<ContractDocumentComponent tenant="RC100100" participant={participant}/>) })
    const area = screen.getByTestId("contract-area")
    fireEvent.dragOver(area, files())
    expect(area.className).toContain("drag-over")
    const pdf = new File(["x"], "vertrag.pdf", {type: "application/pdf"})
    fireEvent.drop(area, files(pdf))
    expect(area.className).not.toContain("drag-over")
    expect(modal.present).toHaveBeenCalledTimes(1)
    // the getter is side-effect free (StrictMode calls a state initializer twice)
    expect(modal.props.initialFiles()).toEqual([pdf])
    expect(modal.props.initialFiles()).toEqual([pdf])
  })

  it("opens empty with the button after an earlier drop", async () => {
    await act(async () => { render(<ContractDocumentComponent tenant="RC100100" participant={participant}/>) })
    fireEvent.drop(screen.getByTestId("contract-area"), files(new File(["x"], "vertrag.pdf", {type: "application/pdf"})))
    fireEvent.click(screen.getByText("Hochladen"))
    expect(modal.present).toHaveBeenCalledTimes(2)
    expect(modal.props.initialFiles()).toEqual([])
  })

  it("keeps the browser from opening a file dropped beside the area", async () => {
    await act(async () => { render(<ContractDocumentComponent tenant="RC100100" participant={participant}/>) })
    const drop = createEvent.drop(document.body, files(new File(["x"], "daneben.pdf", {type: "application/pdf"})))
    fireEvent(document.body, drop)
    expect(drop.defaultPrevented).toBe(true)
    expect(modal.present).not.toHaveBeenCalled()
  })

  it("leaves a text drag alone", async () => {
    await act(async () => { render(<ContractDocumentComponent tenant="RC100100" participant={participant}/>) })
    fireEvent.drop(screen.getByTestId("contract-area"), {dataTransfer: {files: [], types: ["text/plain"]}})
    expect(modal.present).not.toHaveBeenCalled()
  })
})
