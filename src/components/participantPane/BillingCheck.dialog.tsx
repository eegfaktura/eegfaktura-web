import React, {FC, useEffect, useState} from "react";
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {alertCircle, checkmarkCircle, helpCircle, warning} from "ionicons/icons";
import moment from "moment";
import {EegParticipant} from "../../models/members.model";
import {ActiveTenant, EegTariff} from "../../models/eeg.model";
import {SelectedPeriod} from "../../models/energy.model";
import {getPeriodDates} from "../../util/FilterHelper";
import {Api} from "../../service";
import {
  activeMetersInPeriod,
  BillingCheckOverview,
  buildBillingCheckRequest,
  CheckedMeter,
  CheckStatus,
  evaluateBillingChecks,
  formatDayRanges,
  IncompleteMeter,
  L3Finding,
  kWhDiff,
} from "./BillingCheck.functions";

// Shown before the run is started: 'preview' or the final 'billing'.
export type BillingCheckMode = 'preview' | 'billing'

const statusIcon: Record<CheckStatus, { icon: string, color: string, text: string }> = {
  OK: {icon: checkmarkCircle, color: "success", text: "OK"},
  WARNING: {icon: alertCircle, color: "warning", text: "Warnung"},
  NOT_CHECKED: {icon: helpCircle, color: "medium", text: "nicht geprüft"},
}

// rounded first, so a rounding difference of -0.001 is shown as 0, not -0
const kWh = (v: number) => `${(Math.round(v * 100) / 100 + 0).toLocaleString("de-AT", {maximumFractionDigits: 2})} kWh`
const date = (t: number) => moment(t).format("DD.MM.YYYY")
const dateTime = (t: number) => moment(t).format("DD.MM.YYYY HH:mm")
const meterLabel = (m: CheckedMeter) =>
  `${m.participantName} – ${m.equipmentName ? m.equipmentName + " – " : ""}${m.meteringPoint}`

export const l3Text = (f: L3Finding) => `${meterLabel(f.meter)}: L3-Werte (${formatDayRanges([...f.days].sort())})`

export const incompleteText = (m: IncompleteMeter) => {
  if (m.firstData === null || m.lastData === null) {
    return `${meterLabel(m.meter)}: keine Energiedaten`
  }
  if (m.missingCount > 0) {
    const count = m.missingCount === 1 ? "1 Viertelstunde fehlt" : `${m.missingCount} Viertelstunden fehlen`
    return `${meterLabel(m.meter)}: ${count} (${formatDayRanges(m.missingDays)})`
  }
  // energystore without missing count: only the start and the end are known
  const gaps = []
  if (m.firstData > m.expectedStart) gaps.push(`erst ab ${dateTime(m.firstData)}`)
  if (m.lastData < m.expectedEnd) gaps.push(`nur bis ${dateTime(m.lastData)}`)
  return `${meterLabel(m.meter)}: Energiedaten ${gaps.join(" und ")}`
}

const hasWarning = (o: BillingCheckOverview) =>
  [o.tariff.status, o.l3.status, o.balance.status, o.completeness.status].includes('WARNING')

const CheckRow: FC<{ title: string, status: CheckStatus, text: string, details?: string[] }> = ({title, status, text, details}) => {
  const s = statusIcon[status]
  const header = (
    <IonItem slot="header" lines="full">
      <IonIcon slot="start" icon={s.icon} color={s.color}/>
      <IonLabel className="ion-text-wrap">
        <h2>{title}: {s.text}</h2>
        <p>{text}</p>
      </IonLabel>
    </IonItem>
  )
  if (!details || details.length === 0) {
    return header
  }
  return (
    <IonAccordionGroup>
      <IonAccordion>
        {header}
        <IonList slot="content" lines="none">
          {details.map((d, i) => <IonItem key={i}><IonLabel className="ion-text-wrap">{d}</IonLabel></IonItem>)}
        </IonList>
      </IonAccordion>
    </IonAccordionGroup>
  )
}

export const BillingCheckDialog: FC<{
  mode: BillingCheckMode,
  tenant: ActiveTenant,
  period: SelectedPeriod,
  participants: EegParticipant[],
  rates: Record<string, EegTariff>,
  onDismiss: (data?: any, role?: string) => void,
}> = ({mode, tenant, period, participants, rates, onDismiss}) => {
  const [overview, setOverview] = useState<BillingCheckOverview | undefined>()
  const [start, end] = getPeriodDates(period) as [Date, Date]

  useEffect(() => {
    const meters = activeMetersInPeriod(participants, start, end)
    let cancelled = false
    const controller = new AbortController()
    Api.energyService.fetchBillingCheck(tenant, buildBillingCheckRequest(meters, start, end), controller.signal)
      .then(res => evaluateBillingChecks(meters, rates, res))
      .catch(() => evaluateBillingChecks(meters, rates, {error: "Energiedaten konnten nicht abgefragt werden."}))
      .then(o => { if (!cancelled) setOverview(o) })
    return () => { cancelled = true; controller.abort() }
  }, [])

  const warned = !!overview && hasWarning(overview)
  const confirmText = mode === 'billing'
    ? (warned ? "Trotzdem Abrechnung durchführen" : "Abrechnung durchführen")
    : (warned ? "Trotzdem Vorschau erstellen" : "Vorschau erstellen")

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Prüfung vor der Abrechnung ({date(start.getTime())} – {date(end.getTime())})</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {mode === 'billing' && (
          <IonItem color="warning" lines="none" className="ion-margin-bottom">
            <IonIcon slot="start" icon={warning}/>
            <IonLabel className="ion-text-wrap">
              <strong>Dieser Vorgang ist unumkehrbar.</strong> Wenn Du „{confirmText}“ wählst, werden die Rechnungen
              endgültig erstellt und die fortlaufenden Rechnungsnummern vergeben. Änderungen an den Rechnungen sind
              danach nicht mehr möglich. Willst Du wirklich das angewählte Verrechnungsintervall jetzt abrechnen?
            </IonLabel>
          </IonItem>
        )}
        {!overview && <IonSpinner name="dots"/>}
        {overview && (
          <IonList>
            <CheckRow
              title="Tarif"
              status={overview.tariff.status}
              text={overview.tariff.missing.length > 0
                ? `${overview.tariff.missing.length} Zählpunkt(e) ohne Tarif.`
                : "Alle Zählpunkte im Zeitraum haben einen Tarif."}
              details={overview.tariff.missing.map(meterLabel)}
            />
            <CheckRow
              title="L3-Werte"
              status={overview.l3.status}
              text={overview.l3.reason ?? (overview.l3.findings.length > 0
                ? `${overview.l3.findings.length} Zählpunkt(e) mit vorläufigen Werten (L3).`
                : "Keine L3-Werte im Zeitraum.")}
              details={overview.l3.findings.map(f =>
                `${meterLabel(f.meter)}: ${f.count} Viertelstunde(n) an ${f.days.map(d => moment(d).format("DD.MM.")).join(", ")}`)}
            />
            <CheckRow
              title="Energiebilanz"
              status={overview.balance.status}
              text={overview.balance.reason ?? overview.balance.text ?? ""}
              details={overview.balance.totals && [
                `Produktion: ${kWh(overview.balance.totals.produced)}`,
                `Verbrauch: ${kWh(overview.balance.totals.consumed)}`,
                `Verteilt (Anteil an der Erzeugung): ${kWh(overview.balance.totals.allocated)}`,
                `Eigendeckung: ${kWh(overview.balance.totals.selfCovered)}`,
                `Überschuss: ${kWh(overview.balance.totals.surplus)}`,
                `Differenz Produktion – Verteilt: ${kWhDiff(overview.balance.difference ?? 0)}`,
              ]}
            />
            <CheckRow
              title="Vollständigkeit"
              status={overview.completeness.status}
              text={overview.completeness.reason ?? (overview.completeness.status === 'OK'
                ? "Alle Zählpunkte haben Energiedaten für ihren aktiven Zeitraum."
                : `${overview.completeness.incomplete.length} Zählpunkt(e) mit unvollständigen Energiedaten.`)}
              details={overview.completeness.incomplete.map(incompleteText)}
            />
          </IonList>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
          {/* „Abbrechen“ left and grey, „Abrechnung durchführen“ right and filled: „Abbrechen“ and „Abrechnen“ were too similar
              (pilot feedback 20.10.2026); the run is only possible once the check has finished */}
          <IonButtons slot="start">
            <IonButton color="medium" onClick={() => onDismiss(null, 'cancel')}>Abbrechen</IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton fill="solid" disabled={!overview} onClick={() => onDismiss(null, 'confirm')}>
              {overview ? confirmText : "Prüfung läuft …"}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
