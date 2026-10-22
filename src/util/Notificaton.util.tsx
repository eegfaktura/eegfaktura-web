import {EegNotification} from "../models/eeg.model";
import {ReactNode} from "react";
import EnergyRequestSummaryComponent from "../components/notification/EnergyRequestSummary.component";
import {EnergyRequestSummary} from "../components/notification/EnergyRequestSummary.functions";
import {PARTFACT_WINDOW_TEXT} from "./PartFactWindow.util";


export function buildNotificationText(type: string, process: string, notification: object): ReactNode {

  switch (process) {
    case "EDA_PROCESS": {
      const n = notification as EegNotification
      switch (n.message.type) {
        case 'ZUSTIMMUNG_ECON':
          return (<p>Die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden vom <strong><u>Mitglied
              erfolgreich bestätigt.</u></strong></p>
          )
        case 'ANFORDERUNG_ECON':
          return <p>Die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden für die <strong><u>Online-Registrierung</u></strong> angefordert.</p>
        case 'ANFORDERUNG_PT':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>Energiedaten
            angefordert.</u></strong></p>
        case 'ANTWORT_ECON':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die <strong><u>Online-Registrierung</u></strong> gestartet.</p>
        case 'ANTWORT_PT':
          return <p>Die <strong><u>ENERGIEDATENANFRAGE</u></strong> für die
            Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde
            angenommen.</p>
        case 'ABLEHNUNG_ECON':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die <strong><u>Online-Registrierung</u></strong> abgelehnt. ({n.message.responseCode})</p>
        case 'ABSCHLUSS_ECON':
          return <p>Die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden vom Netzbetreiber in <strong><u>deine
            EEG aufgenommen.</u></strong></p>
        case 'ZUSAMMENFASSUNG_PT':
          return <EnergyRequestSummaryComponent summary={n.message.properties as EnergyRequestSummary}/>
        case 'ABLEHNUNG_PT':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die ENERGIEDATENANFRAGE
            abgelehnt. ({n.message.responseCode})</p>
        case 'AUFHEBUNG_CCMC':
        case 'AUFHEBUNG_CCMS':
        case 'AUFHEBUNG_CCMI':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die DATENFREIGABE aufgehoben.
            ({n.message.responseCode})</p>
        case 'ANTWORT_CCMS':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die Anfrage auf <strong>AUFHEBUNG
            der DATENFREIGABE</strong> bestätigt.</p>
        case 'ABLEHNUNG_CCMS':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die Anfrage auf <strong>AUFHEBUNG
            der DATENFREIGABE</strong> abgelehnt.</p>
        case 'ABLEHNUNG_CPF':
          return buildPartFactRejectionText(n.message.meteringPoint, n.message.responseCode)
        case 'ANFORDERUNG_CPF':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>Änderungen des
            Teilnahmefaktors
            angefordert.</u></strong></p>
        case 'ANTWORT_CPF':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>die Änderungen des
            Teilnahmefaktors
            angenommen.</u></strong></p>
        case 'Mail': {
          // Notices about the community's customised mails (E_MAIL_TEMPLATE: default sent instead,
          // I_MAIL_TEMPLATE_DEFAULT: new default available) carry a complete text; the mail was sent.
          const templateNotices = (n.message.logMessages ?? []).filter(m => (m.message_code ?? "").includes("_MAIL_TEMPLATE"))
          if (templateNotices.length > 0) {
            return <p><strong><u>E-Mail-Texte:</u></strong> {templateNotices.map(m => m.message).join(" ")}</p>
          }
          // Fehlgeschlagener Mailversand (z. B. ungültige Empfänger-Adresse) —
          // ohne diesen Zweig erschien die Notification als leere Zeile.
          return <p><strong><u>Mailversand fehlgeschlagen:</u></strong> {
            (n.message.logMessages ?? []).map(m => `${m.metering_point} — ${m.message}`).join("; ")
          }</p>
        }
      }
      break
    }
    case "EXCEL_IMPORT": {
      const n = notification as EegNotification
      const hints = n.message?.logMessages ?? []
      if (hints.length > 0) {
        return (<p>Excel Stammdaten importiert — <strong>Hinweise:</strong> {
          hints.map(m => `${m.metering_point}: ${m.message}`).join("; ")
        }</p>)
      }
      return (<p>Excel Stammdaten importiert </p>)
    }
  }
  return ""
}

// The backend stores the rejection without metering points ([]; for a list it adds empty entries) but with the
// reason as text; „Prozessdatum falsch“ (code 82) means the request reached the grid operator outside the time
// window (see PartFactWindow.util).
function buildPartFactRejectionText(meteringPoint: string | string[], responseCode: string | string[]): ReactNode {
  const reason = String(responseCode)
  const meters = String(meteringPoint).split(",").map(m => m.trim()).filter(m => m && m !== "-").join(", ")
  return (
    <p>
      {meters
        ? <>Für die Zählpunkte <strong>{meters}</strong> wurde die Anfrage auf <strong>ÄNDERUNG
          TEILNAHMEFAKTOR</strong> abgelehnt</>
        : <>Die Anfrage auf <strong>ÄNDERUNG TEILNAHMEFAKTOR</strong> wurde abgelehnt</>}
      {reason !== "-" ? <> ({reason})</> : null}.
      {reason.includes("Prozessdatum falsch") && <> Der Netzbetreiber nimmt Änderungen nur zwischen
        {PARTFACT_WINDOW_TEXT} an. Bitte fordere die Änderung in dieser Zeit erneut an.</>}
    </p>
  )
}
