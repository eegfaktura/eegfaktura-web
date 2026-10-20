import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {BillingCheckDialog} from "../../../components/participantPane/BillingCheck.dialog";
import {Api} from "../../../service";
import {ActiveTenant} from "../../../models/eeg.model";
import {SelectedPeriod} from "../../../models/energy.model";

const tenant = {tenant: "RC100100", ecId: "AT00800000000RC100100000000000001", rcNr: "RC100100"} as ActiveTenant
const period = {type: "YM", year: 2026, segment: 9} as SelectedPeriod

describe("BillingCheckDialog buttons (pilot feedback 20.10.2026)", () => {
  it("keeps the run disabled while the check runs, then enables it; „Zurück“ cancels", async () => {
    let resolve: (v: unknown) => void = () => {}
    Api.energyService = {fetchBillingCheck: vi.fn(() => new Promise(r => { resolve = r }))} as unknown as typeof Api.energyService
    const onDismiss = vi.fn()
    render(<BillingCheckDialog mode="billing" tenant={tenant} period={period} participants={[]} rates={{}} onDismiss={onDismiss}/>)

    const running = screen.getByText("Prüfung läuft …").closest("ion-button")!
    expect(running.getAttribute("disabled")).toBe("true")

    resolve({periodStart: 0, periodEnd: 0, meters: [], totals: {produced: 0, consumed: 0, allocated: 0, selfCovered: 0, surplus: 0}})
    await waitFor(() => expect(screen.getByText("Abrechnen")).toBeTruthy())
    expect(screen.getByText("Abrechnen").closest("ion-button")!.getAttribute("disabled")).toBe("false")

    fireEvent.click(screen.getByText("Zurück"))
    expect(onDismiss).toHaveBeenCalledWith(null, 'cancel')
  })

  it("enables the run also when the check fails (result „nicht geprüft“)", async () => {
    Api.energyService = {fetchBillingCheck: vi.fn(() => Promise.reject(new Error("down")))} as unknown as typeof Api.energyService
    render(<BillingCheckDialog mode="preview" tenant={tenant} period={period} participants={[]} rates={{}} onDismiss={vi.fn()}/>)
    await waitFor(() => expect(screen.getByText(/Vorschau erstellen/)).toBeTruthy())
    expect(screen.getByText(/Vorschau erstellen/).closest("ion-button")!.getAttribute("disabled")).toBe("false")
  })
})
