import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

const alert = vi.fn()
const toaster = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
  useIonToast: () => [toaster],
}))
// the tariff form is not part of this test
vi.mock("../../components/Rate.component", () => ({default: () => <div/>}))

import RateDetailPaneComponent from "../../components/RateDetailPane.component";
import {Api} from "../../service";
import {selectRate} from "../../store/rate";
import {fetchParticipantModel} from "../../store/participant";
import {EegTariff} from "../../models/eeg.model";
import {TariffService} from "../../service/tariff.service";
import {AuthService} from "../../service/auth.service";

const tariff = {id: "t1", name: "Standard", type: "EEG"} as EegTariff

describe("RateDetailPane: archive a tariff (261024-ca16)", () => {
  beforeEach(() => {
    alert.mockReset()
    Api.tariffService = {archiveTariff: vi.fn().mockResolvedValue(undefined)} as unknown as typeof Api.tariffService
  })

  const render = (participants: any[]) => {
    const r = renderWithProviders(<RateDetailPaneComponent onSubmit={vi.fn()} submitId="s"/>)
    act(() => {
      r.store.dispatch(fetchParticipantModel.fulfilled({participants}, "req", {tenant: "TE100200"}))
      r.store.dispatch(selectRate(tariff))
    })
    fireEvent.click(screen.getByText("Tarif löschen"))
    return r
  }

  it("asks first and archives only on confirm", async () => {
    render([])
    expect(alert).toHaveBeenCalledTimes(1)
    expect(alert.mock.lastCall![0].message).toBe("Soll der Tarif „Standard“ gelöscht werden?")
    expect(Api.tariffService.archiveTariff).not.toHaveBeenCalled()
    await act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    expect(Api.tariffService.archiveTariff).toHaveBeenCalledWith(undefined, "t1")
  })

  it("does not offer the archive while a metering point uses the tariff", () => {
    render([{id: "p1", firstname: "Anna", lastname: "Muster", tariffId: "t2", meters: [{meteringPoint: "AT001", tariff_id: "t1"}]}])
    expect(alert.mock.lastCall![0].header).toBe("Tarif löschen nicht möglich")
    expect(alert.mock.lastCall![0].message).toContain("AT001 (Anna Muster)")
    expect(Api.tariffService.archiveTariff).not.toHaveBeenCalled()
  })

  it("a tariff the backend refuses as in use (400, code 4002) gets a German message (review: backend#106)", async () => {
    const service = new TariffService({} as AuthService)
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token")
    Api.tariffService = service
    const body = JSON.stringify({error: {code: 4002, error: "Tariff is currently used", message: "Tariff is currently used"}})
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {status: 400, statusText: "Bad Request"})))
    toaster.mockReset()
    render([])
    await act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role: "confirm"}}))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(toaster.mock.lastCall![0].message)
      .toBe("Der Tarif wird noch von Mitgliedern oder Zählpunkten verwendet und kann nicht gelöscht werden.")
    vi.unstubAllGlobals()
  })
})
