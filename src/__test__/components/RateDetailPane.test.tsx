import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
// the tariff form is not part of this test
vi.mock("../../components/Rate.component", () => ({default: () => <div/>}))

import RateDetailPaneComponent from "../../components/RateDetailPane.component";
import {Api} from "../../service";
import {selectRate} from "../../store/rate";
import {fetchParticipantModel} from "../../store/participant";
import {EegTariff} from "../../models/eeg.model";

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
})
