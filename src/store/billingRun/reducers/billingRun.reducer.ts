import {createReducer} from "@reduxjs/toolkit";
import {initialState} from "../states";
import {billingRunSendmail, fetchBillingRun, fetchBillingRunById} from "../actions";

export const reducer = createReducer(initialState, builder =>
    builder
        .addCase(fetchBillingRun.pending, state => {
            return { ...state, isFetching: true, errorMessage : null };
        })
        .addCase(fetchBillingRun.fulfilled, (state, action) => {
            const { billingRunList   } = action.payload;
            return { ...state, billingRun: billingRunList[0], isFetching: false, errorMessage : null }
        })
        .addCase(fetchBillingRun.rejected, state => {
            return { ...state, isFetching: false, errorMessage : 'Fehler beim Laden der Abrechnungsdaten' };
        })
        .addCase(fetchBillingRunById.pending, state => {
            return { ...state, isFetching: true, errorMessage : null };
        })
        .addCase(fetchBillingRunById.fulfilled, (state, action) => {
            const { billingRun   } = action.payload;
            return { ...state, billingRun: billingRun, isFetching: false, errorMessage : null }
        })
        .addCase(fetchBillingRunById.rejected, state => {
            return { ...state, isFetching: false, errorMessage : 'Fehler beim Laden der Abrechnungsdaten.' };
        })
        .addCase(billingRunSendmail.pending, state => {
            return { ...state, isFetching: true, errorMessage : null };
        })
        .addCase(billingRunSendmail.fulfilled, (state, action) => {
            const { billingRun   } = action.payload;
            return { ...state, isFetching: false, errorMessage : null }
        })
        .addCase(billingRunSendmail.rejected, state => {
            // the billing pane shows the refusal with billing's reason itself (web 261030-mm1)
            return { ...state, isFetching: false, errorMessage : null };
        })
);