export interface EdaHistory {
  conversationId: string
  date: Date
  protocol: string
  processType: string
  message: Record<string, any>
  responseCode?: string
  meteringPoint?: string
  meteringPoints?: string[]
  meteringFrom?: Date
  meteringTo?: Date
}

export class EdaHistoryEntry {
  public constructor(
  public Tenant: string,
  public conversationId: string,
  public date: Date,
  public direction: string,
  public issuer: string,
  public message: Record<string, any>,
  public processType: string,
  public protocol: string) {}

}

export class EdaResponseCode {
  static getMessage(code: number): string {
    switch(code) {
      case 37:
        return "Stornierung nicht möglich"
      case 55:
        return "Zählpunkt nicht dem Lieferanten zugeordnet"
      case 56:
        return "Zählpunkt nicht gefunden"
      case 57:
        return "Zählpunkt nicht versorgt"
      case 70:
        return "Änderung/Anforderung akzeptiert"
      case 76:
        return "Ungültige Anforderungsdaten"
      case 82:
        return "Prozessdatum falsch"
      case 86:
        return "konkurrierende Prozesse"
      case 90:
        return "Kein Smart Meter"
      case 94:
        return "Keine Daten im angeforderten Zeitraum vorhanden"
      case 99:
        return "Meldung erhalten"
      case 104:
        return "Falsche Energierichtung"
      case 156:
        return "ZP bereits zugeordnet"
      case 157:
        return "ZP bereits einem Betreiber zugeordnet"
      case 158:
        return "ZP ist nicht teilnahmeberechtigt"
      case 159:
        return "Zu Prozessdatum ZP inaktiv bzw. noch kein Gerät eingebaut"
      case 160:
        return "Verteilmodell entspricht nicht der Vereinbarung"
      case 172:
        return "Kunde hat Datenfreigabe abgelehnt"
      case 173:
        return "Kunde hat auf Datenfreigabe nicht reagiert (Timeout)"
      case 174:
        return "Angefragte Daten nicht lieferbar"
      case 175:
        return "Zustimmung erteilt"
      case 176:
        return "Zustimmung erfolgreich entzogen"
      case 177:
        return "Keine Datenfreigabe vorhanden"
      case 178:
        return "Consent existiert bereits"
      case 180:
        return "ConsentID abgelaufen"
      case 181:
        return "Gemeinschafts-ID nicht vorhanden"
      case 182:
        return "Noch kein fernauslesbarer Zähler eingebaut"
      case 183:
        return "Summe der gemeldeten Aufteilungsschlüssel übersteigt 100%"
      case 184:
        return "Kunde hat optiert"
      case 185:
        return "Zählpunkt befindet sich nicht im Bereich der Energiegemeinschaft"
      case 187:
        return "ConsentID und Zählpunkt passen nicht zusammen"
      case 188:
        return "Teilnahmefaktor von 100 % würde überschritten werden"
      case 189:
        return "Zählpunkt ist der Gemeinschafts-ID nicht zugeordnet"
      case 196:
        return "Teilnahme-Limit wird überschritten"
    }
    return code.toString()
  }

}