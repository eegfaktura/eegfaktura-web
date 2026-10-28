import {createReducer} from "@reduxjs/toolkit";
import {metaAdapter, initialState, reportAdapter, participantReportAdapter} from "../states";
import {clearEnergyState, fetchEnergyReportV2, setSelectedPeriod} from "../actions";
import {SelectedPeriod} from "../../../models/energy.model";

const reportIdToPeriod = (id: string):SelectedPeriod => {
  const [type, year, month] = id.split('/')
  return {type: type as 'YH' | "YQ" | 'YM' | 'Y', year: Number(year), segment: Number(month)}
}

export const reducer = createReducer(initialState, builder =>
  builder
    .addCase(setSelectedPeriod, (state, action) => {
      return {...state, selectedPeriod: action.payload}
    })
    .addCase(fetchEnergyReportV2.pending, (state, action) => {
      state.reportRequestId = action.meta.requestId
      state.reportError = undefined
      state.reportLoading = true
    })
    .addCase(fetchEnergyReportV2.fulfilled, (state, action) => {
      // an older request answering after a newer one (e.g. without and then with ZVT time windows) is ignored
      if (state.reportRequestId && action.meta.requestId !== state.reportRequestId) return
      const {report} = action.payload
      // state.selectedPeriod = reportIdToPeriod(report.id)
      state.totalConsumption = report.totalConsumption
      state.totalProduction = report.totalProduction
      participantReportAdapter.setAll(state.participantReports, report.participantReports)
      metaAdapter.setAll(state.meta, report.meta)
      state.reportError = undefined
      state.reportLoading = false
    })
    .addCase(fetchEnergyReportV2.rejected, (state, action) => {
      if (state.reportRequestId && action.meta.requestId !== state.reportRequestId) return
      participantReportAdapter.removeAll(state.participantReports)
      metaAdapter.removeAll(state.meta)
      state.reportError = action.error.message || "unbekannter Fehler"
      state.reportLoading = false
    })
    .addCase(clearEnergyState, (state, action) => {
      // a request still running for the previous selection must not fill the cleared store
      state.reportRequestId = "cleared"
      state.reportError = undefined
      state.reportLoading = false
      participantReportAdapter.removeAll(state.participantReports)
      metaAdapter.removeAll(state.meta)
    })
);
