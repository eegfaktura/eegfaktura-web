import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, waitFor} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";

const toaster = vi.fn()
const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonToast: () => [toaster],
  useIonAlert: () => [alert],
}))

import EegBillingConfigCardComponent from "../../../components/EegBillingConfigCard.component";
import {Api} from "../../../service";
import {EegContext} from "../../../store/hook/Eeg.provider";

const config = {id: "bc1", tenantId: "TE100200", footerText: "alt", headerImageFileDataId: "img1"}

const changeFooter = async (container: HTMLElement) => {
  const input = container.querySelector('ion-input[name="footerText"]') as HTMLIonInputElement
  await act(async () => {
    input.value = "neu"
    input.dispatchEvent(new CustomEvent("ionInput", {detail: {value: "neu"}}))
  })
  await act(async () => { fireEvent.blur(container.querySelector("form")!) })
}

const toasts = () => toaster.mock.calls.map(c => c[0])

describe("EegBillingConfigCard (261024-ca15)", () => {
  beforeEach(() => {
    toaster.mockReset()
    alert.mockReset()
    vi.stubGlobal("URL", Object.assign(URL, {createObjectURL: () => "blob:logo"}))
    Api.eegService = {
      fetchBillingConfigByTenantId: vi.fn().mockResolvedValue(config),
      getImageBillingConfig: vi.fn().mockResolvedValue(new Blob()),
      updateBillingConfig: vi.fn().mockRejectedValue(new Error("Bad Gateway")),
      deleteImageBillingConfig: vi.fn().mockResolvedValue({...config, headerImageFileDataId: undefined}),
    } as unknown as typeof Api.eegService
  })
  afterEach(() => vi.unstubAllGlobals())

  const render = async () => {
    const eeg = {tenant: "TE100200", isAdmin: () => true, getTenants: () => []} as any
    const r = renderWithProviders(<EegContext.Provider value={eeg}><EegBillingConfigCardComponent/></EegContext.Provider>)
    await waitFor(() => expect(r.container.querySelector("form")).toBeTruthy())
    return r
  }

  it("a failed save shows only the error, not \"Änderung gespeichert\"", async () => {
    const {container} = await render()
    await changeFooter(container)

    await waitFor(() => expect(Api.eegService.updateBillingConfig).toHaveBeenCalled())
    await waitFor(() => expect(toasts().map(t => t.message)).toContain("Fehler beim Ändern der Abrechnungseinstellungen."))
    expect(toasts().map(t => t.message)).not.toContain("Änderung gespeichert")
  })

  it("a successful save still shows \"Änderung gespeichert\"", async () => {
    vi.mocked(Api.eegService.updateBillingConfig).mockResolvedValue({...config, footerText: "neu"} as any)
    const {container} = await render()
    await changeFooter(container)
    await waitFor(() => expect(toasts().map(t => t.message)).toContain("Änderung gespeichert"))
  })

  it("asks before deleting the logo and deletes only on confirm", async () => {
    const {container} = await render()
    const remove = container.querySelector("ion-chip ion-icon:last-of-type")!
    fireEvent.click(remove)

    expect(alert).toHaveBeenCalledTimes(1)
    expect(alert.mock.lastCall![0].message).toBe("Soll das Bild für das Logo gelöscht werden?")
    expect(Api.eegService.deleteImageBillingConfig).not.toHaveBeenCalled()
    await act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(Api.eegService.deleteImageBillingConfig).toHaveBeenCalledTimes(1)
  })
})
