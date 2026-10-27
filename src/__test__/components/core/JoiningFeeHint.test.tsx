import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import React from "react";
import "../../../util/I18n";
import JoiningFeeHint from "../../../components/core/JoiningFeeHint.component";
import {Api} from "../../../service";
import {EegTariff} from "../../../models/eeg.model";

// platform#217: hint at the member's tariff assignment

const HINT = "Dieses Mitglied wurde schon abgerechnet – die Beitrittsgebühr wird ihm nicht mehr verrechnet."
const tariff = (joiningFee: number) => ({id: "t1", name: "Mitglied", type: "EEG", joiningFee}) as EegTariff
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe("JoiningFeeHint", () => {
  beforeEach(() => {
    Api.eegService = {
      fetchJoiningFeeState: vi.fn().mockResolvedValue([{participantId: "p1", energyBilled: true, joiningFee: null}]),
    } as unknown as typeof Api.eegService
  })

  it("shows for a member billed with energy when a tariff with a fee is chosen", async () => {
    render(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(50)}/>)
    await flush()
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(Api.eegService.fetchJoiningFeeState).toHaveBeenCalledWith("TE100200")
  })

  it("asks billing nothing and shows nothing for a tariff without a fee", async () => {
    render(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(0)}/>)
    await flush()
    expect(screen.queryByText(HINT)).toBeNull()
    expect(Api.eegService.fetchJoiningFeeState).not.toHaveBeenCalled()
  })

  it("does not show for a member without a final document or when billing fails", async () => {
    render(<JoiningFeeHint tenant="TE100200" participantId="p2" tariff={tariff(50)}/>)
    await flush()
    expect(screen.queryByText(HINT)).toBeNull()

    vi.mocked(Api.eegService.fetchJoiningFeeState).mockRejectedValue(new Error("503"))
    render(<JoiningFeeHint tenant="TE100201" participantId="p1" tariff={tariff(50)}/>)
    await flush()
    expect(screen.queryByText(HINT)).toBeNull()
  })

  it("loads once per member, also across re-renders with new tariff objects and tariff changes", async () => {
    const {rerender} = render(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(50)}/>)
    await flush()
    rerender(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(50)}/>)
    rerender(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(0)}/>)
    expect(screen.queryByText(HINT)).toBeNull()
    rerender(<JoiningFeeHint tenant="TE100200" participantId="p1" tariff={tariff(30)}/>)
    await flush()
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(Api.eegService.fetchJoiningFeeState).toHaveBeenCalledTimes(1)
  })
})
