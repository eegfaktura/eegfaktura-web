import {EegNotification} from "../models/eeg.model";
import {ReactNode} from "react";


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
          return <p>Die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden für die <strong><u>Online
            Registrierung</u></strong> angefordert.</p>
        case 'ANFORDERUNG_PT':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>Energiedaten
            angefordert.</u></strong></p>
        case 'ANTWORT_ECON':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die <strong><u>Online
            Registrierung</u></strong> gestartet.</p>
        case 'ANTWORT_PT':
          return <p>Die <strong><u>ENERGIEDATENANFRAGE</u></strong> für die
            Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde
            angenommen.</p>
        case 'ABLEHNUNG_ECON':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die <strong><u>Online
            Registrierung</u></strong> abgelehnt. ({n.message.responseCode})</p>
        case 'ABSCHLUSS_ECON':
          return <p>Die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden vom Netzbetreiber in <strong><u>deine
            EEG aufgenommen.</u></strong></p>
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
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurde die Anfrage auf <strong>ÄNDERUNG
            TEILNAHMEFAKTOR</strong> abgelehnt.</p>
        case 'ANFORDERUNG_CPF':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>Änderungen des
            Teilnahmefaktors
            angefordert.</u></strong></p>
        case 'ANTWORT_CPF':
          return <p>Für die Zählpunkte <strong>{n.message.meteringPoint}</strong> wurden <strong><u>die Änderungen des
            Teilnahmefaktors
            angenommen.</u></strong></p>
      }
      break
    }
    case "EXCEL_IMPORT":
      return (<p>Excel Stammdaten importiert </p>)
  }
  return ""
}