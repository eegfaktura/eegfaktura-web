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
// the tariff form is not part of this test; its props give the save handler
const rateForm = vi.hoisted(() => ({props: undefined as any}))
vi.mock("../../components/Rate.component", () => ({default: (props: any) => { rateForm.props = props; return <div/> }}))

import RateDetailPaneComponent from "../../components/RateDetailPane.component";
import {Api} from "../../service";
import {selectRate} from "../../store/rate";
import {fetchParticipantModel} from "../../store/participant";
import {fetchRatesModel} from "../../store/rate";
import "../../util/I18n";
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

describe("RateDetailPane: saving a joining fee warns first (platform#217)", () => {
  const vzp20 = {id: "v1", name: "Bezug", type: "VZP", useVat: true, vatInPercent: "20"} as EegTariff
  const active = (id: string) => ({id, firstname: id, lastname: "M", tariffId: "t1", meters: [{meteringPoint: "AT" + id, status: "ACTIVE"}]})
  const onSubmit = vi.fn()

  beforeEach(() => {
    alert.mockReset()
    onSubmit.mockReset()
    Api.eegService = {fetchJoiningFeeState: vi.fn().mockResolvedValue([])} as unknown as typeof Api.eegService
  })

  // before: the tariff as stored when the dialog opened (default: no joining fee yet)
  const save = async (data: EegTariff, participants: any[] = [], before: EegTariff = {...data, joiningFee: 0}) => {
    const r = renderWithProviders(<RateDetailPaneComponent onSubmit={onSubmit} submitId="s"/>)
    act(() => {
      r.store.dispatch(fetchParticipantModel.fulfilled({participants}, "req", {tenant: "TE100200"}))
      r.store.dispatch(fetchRatesModel.fulfilled({rates: [vzp20, before]}, "req", {tenant: "TE100200"}))
      r.store.dispatch(selectRate(before))
    })
    await act(async () => rateForm.props.onSubmit(data))
  }
  const confirmSave = () => alert.mock.lastCall![0].buttons.find((b: any) => b.role === "confirm").handler()

  it("saves a tariff whose joining fee did not change directly (review 28.10.2026: renaming does not ask again)", async () => {
    const withFee = {...tariff, joiningFee: 50}
    await save({...withFee, name: "Neu"}, [active("p1")], withFee)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(alert).not.toHaveBeenCalled()
    expect(Api.eegService.fetchJoiningFeeState).not.toHaveBeenCalled()
  })

  it("saves a tariff without a joining fee directly, without asking billing", async () => {
    await save({...tariff, joiningFee: 0})
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(alert).not.toHaveBeenCalled()
    expect(Api.eegService.fetchJoiningFeeState).not.toHaveBeenCalled()
  })

  it("names the active members never billed with energy and saves only on confirm", async () => {
    vi.mocked(Api.eegService.fetchJoiningFeeState).mockResolvedValue([{participantId: "p3", energyBilled: true, joiningFee: null}])
    await save({...tariff, joiningFee: 50}, [active("p1"), active("p2"), active("p3")])
    expect(alert.mock.lastCall![0].message).toBe("2 aktive Mitglieder mit diesem Tarif wurden in eegfaktura noch nie mit " +
      "Energie abgerechnet und bekommen die Beitrittsgebühr mit ihrer nächsten Abrechnung.")
    expect(onSubmit).not.toHaveBeenCalled()
    confirmSave()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({joiningFee: 50}))
  })

  it("saves directly when every member was billed already and the rate is in use", async () => {
    vi.mocked(Api.eegService.fetchJoiningFeeState).mockResolvedValue([{participantId: "p1", energyBilled: true, joiningFee: null}])
    await save({...tariff, joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 20}, [active("p1")])
    expect(alert).not.toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("says the count is unknown when billing cannot be reached, saving stays possible", async () => {
    vi.mocked(Api.eegService.fetchJoiningFeeState).mockRejectedValue(new Error("503"))
    await save({...tariff, joiningFee: 50}, [active("p1")])
    expect(alert.mock.lastCall![0].message).toContain("konnte nicht ermittelt werden")
    confirmSave()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("warns about a VAT rate the community does not use; a new tariff asks billing nothing (AK 9)", async () => {
    await save({...tariff, id: "", joiningFee: 50, joiningFeeUseVat: true, joiningFeeVatInPercent: 13})
    expect(alert.mock.lastCall![0].message).toBe("Dieser USt-Satz kommt in der EEG sonst nicht vor. Eine Rechnung kann " +
      "höchstens zwei verschiedene Sätze über 0 % enthalten; mit einem dritten bricht die Abrechnung ab.")
    expect(Api.eegService.fetchJoiningFeeState).not.toHaveBeenCalled()
    confirmSave()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
