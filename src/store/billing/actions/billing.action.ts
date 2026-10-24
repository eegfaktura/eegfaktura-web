import {createAction, createAsyncThunk} from "@reduxjs/toolkit";
import {featureKey} from "../states";
import {ClearingPreviewRequest} from "../../../models/meteringpoint.model";
import {Api} from "../../../service";
import {fetchBillingRunById} from "../../billingRun/actions";

// Asynchroner Abrechnungslauf (konzept-async-billing-run.md):
// POST /api/billing liefert 202/409 + billingRunId; der Fortschritt wird
// über GET /api/billingRuns/{id} gepollt, bis der Lauf terminal ist.
const POLL_INTERVAL_MS = 2000;
const MAX_CONSECUTIVE_POLL_ERRORS = 5;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Pollt den Lauf bis zum terminalen Status und liefert danach die
// participantAmounts (Payload-Form wie der frühere synchrone Response).
// Der billingRun-Slice wird pro Tick via fetchBillingRunById aktualisiert,
// damit die Oberfläche den RUNNING-Zustand live anzeigt.
// Ein Poller endet still (BILLING_POLL_STOPPED), sobald eine andere Gemeinschaft gewählt ist oder ein neuerer
// Poller denselben Lauf übernimmt (Rückwechsel zur Gemeinschaft): höchstens ein Poller je Lauf (261024-ca13).
export const BILLING_POLL_STOPPED = "billing-poll-stopped";
const currentPoller: Record<string, object> = {};

const pollBillingRunUntilTerminal = async (
  tenant: string, billingRunId: string, dispatch: any, getState: () => any, rejectWithValue: (v: string) => any) => {

  const self = {};
  currentPoller[billingRunId] = self;
  const stopped = () => {
    const selected = getState().eeg?.selectedTenant;
    return currentPoller[billingRunId] !== self || (!!selected && selected.toUpperCase() !== tenant.toUpperCase());
  };

  let consecutiveErrors = 0;
  for (;;) {
    if (stopped()) {
      return rejectWithValue(BILLING_POLL_STOPPED);
    }
    try {
      const result = await dispatch(fetchBillingRunById({tenant, billingRunId})).unwrap();
      const run = result.billingRun;
      consecutiveErrors = 0;
      if (run.runStatus === "FAILED") {
        return rejectWithValue(run.errorSummary || "Abrechnung fehlgeschlagen.");
      }
      if (run.runStatus !== "RUNNING") {
        break; // DONE (final) oder NEW (Preview-Ende)
      }
    } catch (e) {
      if (++consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
        return rejectWithValue(
          "Der Status des Abrechnungslaufs ist derzeit nicht abrufbar. " +
          "Der Lauf läuft am Server weiter — bitte Seite später neu laden.");
      }
    }
    await delay(POLL_INTERVAL_MS);
  }

  const participantAmounts = await Api.eegService.fetchParticipantAmounts(tenant, billingRunId);
  return {billing: {abstractText: "", billingRunId, participantAmounts}};
};

export const fetchEnergyBills = createAsyncThunk(
  `${featureKey}/fetch`,
  async (arg: { tenant: string, invoiceRequest: ClearingPreviewRequest}, {dispatch, getState, rejectWithValue}) => {
    const { tenant, invoiceRequest } = arg;

    const start = await Api.eegService.startBilling(tenant, invoiceRequest);
    // 202 = von uns gestartet, 409 = läuft bereits -> an den laufenden Lauf anhängen
    if ((start.status !== 202 && start.status !== 409) || !start.billingRunId) {
      return rejectWithValue(start.abstractText || "Abrechnungslauf konnte nicht gestartet werden.");
    }
    return await pollBillingRunUntilTerminal(tenant, start.billingRunId, dispatch, getState, rejectWithValue);
  }
)

// Beim Öffnen des Panels mit bereits laufendem Lauf (z.B. von einem Kollegen
// gestartet): an den bestehenden RUNNING-Lauf anhängen, ohne neuen POST.
export const resumeEnergyBillsPolling = createAsyncThunk(
  `${featureKey}/resumePolling`,
  async (arg: { tenant: string, billingRunId: string}, {dispatch, getState, rejectWithValue}) => {
    const { tenant, billingRunId } = arg;
    return await pollBillingRunUntilTerminal(tenant, billingRunId, dispatch, getState, rejectWithValue);
  }
)

export const fetchParticipantAmounts = createAsyncThunk(
    `${featureKey}/fetchParticipantAmounts`,
    async (arg: { tenant: string, billingRunId : string}) => {
        const { tenant, billingRunId } = arg;
        const result = await Api.eegService.fetchParticipantAmounts(tenant, billingRunId);
        return { participantAmounts: result };
    }
)

export const resetParticipantAmounts = createAction(
    `${featureKey}/resetParticipantAmounts`
)
