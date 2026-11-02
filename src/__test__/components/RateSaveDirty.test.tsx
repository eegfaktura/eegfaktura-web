import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {renderWithProviders} from "../test-utils";
import "../../util/I18n";
import RateDetailPaneComponent from "../../components/RateDetailPane.component";
import {updateRate} from "../../store/rate";
import {EegTariff} from "../../models/eeg.model";
import {Api} from "../../service";
import {useAppDispatch} from "../../store";

const tariff = {
  id: "2dda1f16-d2e7-11f1-81ad-523c3dfefa91", version: 3, name: "Bezug", type: "VZP", useVat: true, vatInPercent: 0,
  useMeteringPointFee: false, centPerKWh: 5, baseFee: 0, participantFee: 0,
} as unknown as EegTariff

const Pane = ({onDirty}: { onDirty: (d: boolean) => void }) => {
  const dispatcher = useAppDispatch()
  return <RateDetailPaneComponent submitId="s" onDirtyChange={onDirty}
                                  onSubmit={(rate) => dispatcher(updateRate({rate, tenant: "TE100300"}))}/>
}

describe("saving a tariff", () => {
  it("leaves the form clean, although the answer comes without the empty fields", async () => {
    const onDirty = vi.fn()
    // as the backend: a new version, and JSON has no undefined fields
    ;(Api as any).eegService = {
      addRate: vi.fn(async (_: string, r: EegTariff) => JSON.parse(JSON.stringify({...r, version: r.version + 1}))),
    }
    const {container} = renderWithProviders(<MemoryRouter><Pane onDirty={onDirty}/></MemoryRouter>,
      {preloadedState: {rate: {ids: [tariff.id], entities: {[tariff.id]: tariff}, selectedRate: tariff}}} as any)

    const name = container.querySelector('ion-input[name="name"]') as any
    await act(async () => {
      name.value = "Bezug2"
      fireEvent(name, new CustomEvent("ionInput", {detail: {value: "Bezug2"}}))
    })
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true))

    await act(async () => { fireEvent.submit(container.querySelector("form#s")!) })
    await waitFor(() => expect((Api as any).eegService.addRate).toHaveBeenCalled())
    await act(async () => { await new Promise(r => setTimeout(r, 200)) })

    expect(onDirty).toHaveBeenLastCalledWith(false)
    expect((container.querySelector('ion-input[name="name"]') as any).value).toBe("Bezug2")
  })
})
