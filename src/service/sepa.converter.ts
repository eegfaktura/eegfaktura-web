import * as XLSX from 'xlsx';
import {create} from 'xmlbuilder2';
import {Eeg} from "../models/eeg.model";
import moment from "moment";
import {SelectedPeriod} from "../models/energy.model";
import {Api} from "./index";
import {debitInstrument} from "../util/MandateReference.util";
import {toLocalISODate} from "../util/Helper.util";

export {debitInstrument}

interface SepaModelItem {
  Amount: number,
  Iban: string,
  MandateRef: string,
  MandateDate: string,
  Name: string,
  EndToEndId: string,
  InvoiceIds: string[],
  DebitType?: string,
}

interface SepaModel {
  Transfer: Array<SepaModelItem>,
  Debit: Array<SepaModelItem>
}

const roundToTwoDecimalPlaces = (num: number) => Math.round(num * 100) / 100



const replaceUmlaute = (str: string)=>  {
  const umlautMap : { [key: string]: string } = {
    '\u00dc': 'UE',
    '\u00c4': 'AE',
    '\u00d6': 'OE',
    '\u00fc': 'ue',
    '\u00e4': 'ae',
    '\u00f6': 'oe',
    '\u00df': 'ss',
  }
  return str
    .replace(/[\u00dc|\u00c4|\u00d6][a-z]/g, (a: string) => {
      const big = umlautMap[a.slice(0, 1)];
      return big.charAt(0) + big.charAt(1).toLowerCase() + a.slice(1);
    })
    .replace(new RegExp('['+Object.keys(umlautMap).join('|')+']',"g"),
      (a) => umlautMap[a]
    );
}

// Zeichen, die Banken in SEPA-Texten (Namen, Verwendungszweck) annehmen: EPC-Basiszeichensatz plus
// Umlaute/ß (in AT/DE akzeptiert, bisher ohne Probleme exportiert). Andere Akzente werden abgelegt
// (René -> Rene), & wird zu +, alles Uebrige wird zu einem Leerzeichen.
const SEPA_TRANSLIT: { [key: string]: string } = {
  'ł': 'l', 'Ł': 'L', 'ø': 'o', 'Ø': 'O', 'đ': 'd', 'Đ': 'D', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE',
}

export const toSepaText = (str: string | undefined | null, maxLength = 70): string =>
  Array.from((str ?? '').replace(/&/g, '+'))
    .map(c => (c.charCodeAt(0) < 128 || /[ÄÖÜäöüß]/.test(c))
      ? c
      : (SEPA_TRANSLIT[c] ?? c.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
    .join('')
    .replace(/[^A-Za-z0-9ÄÖÜäöüß/\-?:().,'+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim()

// Einzugsart je Mitglied (platform#143): "Kein SEPA" (NONE) zahlt ohne Lastschrift. Eine leere Einzugsart
// wird ebenfalls nicht eingezogen (unset), weil niemand sie bewusst gewaehlt hat; diese Mitglieder werden
// im Dialog aufgelistet. CORE und B2B kommen in getrennte Lastschrift-Dateien, weil eine Firmenlastschrift
// mit B2B-Mandat nicht als CORE eingereicht werden darf. Gutschriften (Ueberweisung) sind davon nicht
// betroffen.
export const splitDebitByType = (debit: SepaModelItem[]) => ({
  core: debit.filter(item => debitInstrument(item.DebitType) === 'CORE'),
  b2b: debit.filter(item => debitInstrument(item.DebitType) === 'B2B'),
  skipped: debit.filter(item => debitInstrument(item.DebitType) === 'NONE'),
  unset: debit.filter(item => debitInstrument(item.DebitType) === 'UNSET'),
})

// Zeilen ohne IBAN (z.B. Mitglieder ohne Bankkonto, die auf Rechnung zahlen) koennen weder in die
// Lastschrift noch in die Ueberweisung: Sie werden aus beiden Dateien genommen und im Dialog zur
// manuellen Abwicklung aufgelistet. Angezeigt wird wie bei "Kein SEPA" der Kontoeigner, ohne Bankkonto
// ersatzweise der Empfänger-Name.
export const splitRowsByIban = (records: any[]) => {
  const hasIban = (item: any) => String(item['Empfänger Konto IBAN'] ?? '').replace(/\s/g, '').length > 0
  const name = (item: any) => item['Empfänger Kontoeigner'] || item['Empfänger Name'] || item['Nummer']
  return {
    withIban: records.filter(hasIban),
    withoutIban: Array.from(new Set(records.filter(item => !hasIban(item)).map(name))) as string[],
  }
}

const buildFileName = (fileName: string, tenant: string, activePeriod: SelectedPeriod) => {
  return `${activePeriod.year}-${tenant}_${activePeriod.type}_${activePeriod.segment}-${fileName}`;
}

const summerizeSepaModel = async (rows: Record<string, Array<any>>) => {
  return new Promise<SepaModelItem[]>((resolve) => {
    resolve(Object.entries(rows).map(([iban, item]) =>
      (!!item ? item.reduce((result, item) => {
        if (!result) {
          result = {
            Amount: 0,
            Iban: item['Empfänger Konto IBAN'],
            MandateRef: item['Empfänger Mandatsreferenz'],
            MandateDate: item['Empfänger Mandatsausstellung'],
            Name: item['Empfänger Kontoeigner'],
            EndToEndId: item['Abrechnung'],
            InvoiceIds: [],
            DebitType: item['Empfänger Einzugsart'],
          } as SepaModelItem
        }

        if (item['Dokumenttyp'] === 'Rechnung') {
          result.Amount += Number(item['Rechnungsbetrag Brutto'])
        } else {
          result.Amount -= Number(item['Rechnungsbetrag Brutto'])
        }
        result.InvoiceIds.push(item['Nummer'])

        return result
      }, undefined) : {}) as SepaModelItem))
  })
    .then(records => records.reduce((result, item) => {
      item.Iban = item.Iban.replaceAll(' ', '');
      if (item.Amount > 0) {
        item.Amount = roundToTwoDecimalPlaces(Math.abs(item.Amount));
        result.Debit.push(item);
      } else if (item.Amount < 0) {
        item.Amount = roundToTwoDecimalPlaces(Math.abs(item.Amount));
        result.Transfer.push(item);
      }
      return result;
    }, {Transfer: [], Debit: []} as SepaModel))
}

const createSepaModel = async (rows: Record<string, Array<any>>) => {
  return new Promise<SepaModel>((resolve) => {
    const sepaModel = {Transfer: [], Debit: []} as SepaModel
    Object.entries(rows).forEach(([iban, item]) =>
    (!!item ? item.forEach(item => {
      const sepaModelItem : SepaModelItem = {
        Amount: Number(item['Rechnungsbetrag Brutto']),
        Iban: item['Empfänger Konto IBAN'],
        MandateRef: item['Empfänger Mandatsreferenz'],
        MandateDate: item['Empfänger Mandatsausstellung'],
        Name: item['Empfänger Kontoeigner'],
        EndToEndId: item['Abrechnung'],
        InvoiceIds: [item['Nummer']],
        DebitType: item['Empfänger Einzugsart'],
      } as SepaModelItem

      if (item['Dokumenttyp'] === 'Rechnung') {
        sepaModel.Debit.push(sepaModelItem);
      } else {
        sepaModel.Transfer.push(sepaModelItem);
      }
    }) : {} as SepaModel) as SepaModel)
    resolve(sepaModel);
  })
}

export const ConvertExcelToXML = async (tenant: string, billingRunId: string,
                                        eeg: Eeg, collectionDate: Date,
                                        activePeriod: SelectedPeriod,
                                        batch: boolean, summerize: boolean) => {

  if (!eeg.accountInfo.bic) {
    throw new Error("E_BIC_MISSING")
  }

  if (!eeg.accountInfo.iban) {
    throw new Error("E_IBAN_MISSING")
  }

  try {
    let withoutIban: string[] = []
    const invoiceFile = await Api.eegService.exportBillingExcelForSepa(tenant, billingRunId)
      .then((response) => response.arrayBuffer())
      .then(buffer => XLSX.read(buffer, {type: 'binary', cellText: false, cellDates: true}))
      .then(workbook => workbook.Sheets[workbook.SheetNames[0]])
      .then(sheet => XLSX.utils.sheet_to_json(sheet, {raw: false, dateNF: 'yyyy-mm-dd'}) as any[])
      .then(records => {
        const split = splitRowsByIban(records)
        withoutIban = split.withoutIban
        return split.withIban
      })
      .then(records => records.reduce((result, item) => {
        const key = `${item['Empfänger Konto IBAN']}|${debitInstrument(item['Empfänger Einzugsart'])}|${item['Empfänger Mandatsreferenz'] ?? ''}`;
        (result[key] = result[key] || []).push(item);
        return result;
      }, {} as Record<string, Array<any>>))
      .then((rows: Record<string, Array<any>>) => (summerize ? summerizeSepaModel(rows) : createSepaModel(rows)))
      // .then(r => {
      //   console.log(r)
      //   return r
      // })
      // .then((rows: Record<string, Array<any>>) => Object.entries(rows).map(([iban, item]) =>
      //   !!item ? item.reduce((result, item) => {
      //     if (!result) {
      //       result = {
      //         Amount: 0,
      //         Iban: item['Empfänger Konto IBAN'],
      //         MandateRef: item['Empfänger Mandatsreferenz'],
      //         MandateDate: item['Empfänger Mandatsausstellung'],
      //         Name: item['Empfänger Name'],
      //         EndToEndId: item['Abrechnung'],
      //       } as SepaModelItem
      //     }
      //
      //     if (item['Dokumenttyp'] === 'Rechnung') {
      //       result.Amount += Number(item['Rechnungsbetrag Brutto'])
      //     } else {
      //       result.Amount -= Number(item['Rechnungsbetrag Brutto'])
      //     }
      //
      //     return result
      //   }, undefined) : {}) as SepaModelItem[])
      // .then(records => records.reduce((result, item) => {
      //   item.Iban = item.Iban.replaceAll(' ', '');
      //   if (item.Amount > 0) {
      //     item.Amount = roundToTwoDecimalPlaces(Math.abs(item.Amount));
      //     result.Debit.push(item);
      //   } else if (item.Amount < 0) {
      //     item.Amount = roundToTwoDecimalPlaces(Math.abs(item.Amount));
      //     result.Transfer.push(item);
      //   }
      //   return result;
      // }, {Transfer: [], Debit: []} as SepaModel))

    const {core, b2b, skipped, unset} = splitDebitByType(invoiceFile.Debit)
    // Ohne Gläubiger-ID gibt es keine Lastschrift-Datei, die Gutschrift-Datei schon (platform#143).
    // Eine Datei ohne Buchung entfällt: pain.008/pain.001 verlangen mindestens eine Transaktion.
    const creditorId = !!eeg.accountInfo.creditorId
    const files: {content: string, name: string}[] = []
    if (creditorId && core.length > 0) {
      files.push({content: await createSepaDirectDebit(core, eeg, activePeriod, collectionDate, batch, 'CORE'), name: buildFileName("SEPA_Direct_Debit", tenant, activePeriod)})
    }
    if (creditorId && b2b.length > 0) {
      files.push({content: await createSepaDirectDebit(b2b, eeg, activePeriod, collectionDate, batch, 'B2B'), name: buildFileName("SEPA_Direct_Debit_B2B", tenant, activePeriod)})
    }
    if (invoiceFile.Transfer.length > 0) {
      files.push({content: await createSepaCreditTransfer(invoiceFile.Transfer, eeg, activePeriod, collectionDate, batch), name: buildFileName("SEPA_Credit_Transfer", tenant, activePeriod)})
    }
    return {
      files,
      skippedDebit: skipped.map(item => item.Name),
      unsetDebit: Array.from(new Set(unset.map(item => item.Name).filter(n => !!n))),
      withoutIban,
      missingCreditorId: !creditorId && core.length + b2b.length > 0,
    }
  } catch (error) {
    console.log(error);
    throw new Error("E_SEPA_DOWNLOAD")
  }
}

// unique per export (second precision) and per file kind: banks refuse a reused MsgId
const createMsgId = (num: number) => `MSG-${moment().format('YYYYMMDDHHmmss')}-${zeroPad(num, 5)}`
const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')

const buildEndToEndId = (endToEndId: string, collectionDate: Date, activePeriod: SelectedPeriod) => {
  return `${endToEndId}-${moment(collectionDate).format('YYYYMMDD')}-${activePeriod.year}-${activePeriod.type}${zeroPad(activePeriod.segment, 3)}`;
}


const getIdFromSettlementInterval = (settlementInterval: 'MONTHLY' | "ANNUAL" | "BIANNUAL" | "QUARTER") => {
  switch (settlementInterval) {
    case 'ANNUAL': return 'Y'
    case 'BIANNUAL': return 'HY'
    case 'QUARTER': return 'QY'
    case 'MONTHLY': return 'MY'
  }
}

// G = credit transfer (Gutschriften), C = direct debit CORE, B = direct debit B2B
export type PmtInfKind = 'G' | 'C' | 'B'

// Payment information id, at most 35 characters. Austrian banks take its first 16 characters as the
// "Bestandskontrollnummer" and refuse a file whose first 16 characters were used before. These start
// with the file kind and the export time (to the second), so every file is unique there; name, year and
// period of the billing follow. Before, the id started with the name and year ("EEGSTRASSH-2026-…"), and
// the bank took only the first file of a year.
export const createPmtInfId = (eeg: Eeg, period: SelectedPeriod, kind: PmtInfKind, now: Date = new Date()) => {
  // year of the billed period: an annual run in January belongs to the previous year
  const year = period.year
  const paymentInterval = getIdFromSettlementInterval(eeg.settlementInterval).toString() + zeroPad(period.segment, 3);
  const nameId = replaceUmlaute(eeg.name).replaceAll(' ', '').toUpperCase().slice(0,10)

  return `${kind}${moment(now).format('YYMMDDHHmmss')}-${nameId}-${year}-${paymentInterval}`
}

// Remittance text (Ustrd, max 140 characters). With "Mitglieder zusammenfassen" one booking can carry
// many documents; the full list "Rechnung202600135 / Rechnung202600136 / …" then exceeded 140 characters
// and was cut off silently (support ticket 6610818).
// - If the full list fits, it is used unchanged.
// - Otherwise numbers of the same document type and length are written once with their common prefix
//   (at least three digits stay): "Rechnung202600135/136/138 / Gutschrift202600070/082". A number of
//   another length is written in full with its type, so a short form is never ambiguous.
// - If that still does not fit, the longest groups give up their last numbers first (every document
//   type keeps at least its first one) and the rest is counted: "… (+3 weitere)".
// Only a single document number longer than the limit is cut.
export const compactReference = (invoiceIds: string[], maxLength = 140): string => {
  const ids = Array.from(new Set(invoiceIds.map(i => String(i ?? '').trim()).filter(i => i !== '')))
  const plain = toSepaText(ids.join(' / '), 1000)
  if (plain.length <= maxLength) return plain

  // groups in order of first appearance: one per document type and number length
  const groups = new Map<string, { type: string, numbers: string[] }>()
  const other: string[] = []
  for (const id of ids) {
    const m = id.match(/^(\D*)(\d+)$/)
    if (!m) { other.push(id); continue }
    const key = `${m[1]}#${m[2].length}`
    if (!groups.has(key)) groups.set(key, {type: m[1], numbers: []})
    groups.get(key)!.numbers.push(m[2])
  }
  const parts = [...groups.values()].map(g => {
    let common = 0
    while (common < g.numbers[0].length - 1 && g.numbers.every(n => n[common] === g.numbers[0][common])) common++
    const cut = Math.max(0, Math.min(common, g.numbers[0].length - 3))
    return g.numbers.map((n, i) => i === 0 ? `${g.type}${n}` : n.slice(cut))
  })
  other.forEach(o => parts.push([o]))

  const render = (list: string[][], dropped: number) => toSepaText(
    list.map(tokens => tokens.join('/')).join(' / ') + (dropped > 0 ? ` (+${dropped} weitere)` : ''), 1000)

  let dropped = 0
  let text = render(parts, 0)
  while (text.length > maxLength) {
    const longest = parts.reduce((best, tokens, i) => tokens.length > parts[best].length ? i : best, 0)
    if (parts[longest].length <= 1) break
    parts[longest].pop()
    dropped++
    text = render(parts, dropped)
  }
  return text.length <= maxLength ? text : toSepaText(text, maxLength)
}

const createRef = (item: SepaModelItem): string => compactReference(item.InvoiceIds, 140)

const createSepaCreditTransfer = async (model: SepaModelItem[], eeg: Eeg, period: SelectedPeriod, collectionDate: Date, batch: boolean) => {

  const sum = model.reduce((sum, r) => sum + r.Amount, 0)

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', { xmlns: 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03' })
      .ele('CstmrCdtTrfInitn')
        .ele('GrpHdr')
          .ele('MsgId').txt(createMsgId(1)).up()
          .ele('CreDtTm').txt(new Date().toISOString()).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('InitgPty')
            .ele('Nm').txt(toSepaText(eeg.name)).up()
          .up()
        .up()
        .ele('PmtInf')
          .ele('PmtInfId').txt(createPmtInfId(eeg, period, 'G')).up()
          .ele('PmtMtd').txt('TRF').up()
          .ele('BtchBookg').txt((batch ? "true" : "false")).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('PmtTpInf')
            .ele('SvcLvl')
              .ele('Cd').txt('SEPA').up()
            .up()
          .up()
          .ele('ReqdExctnDt').txt(toLocalISODate(collectionDate)).up()
          .ele('Dbtr')
            .ele('Nm').txt(toSepaText(eeg.accountInfo.owner)).up()
          .up()
          .ele('DbtrAcct')
            .ele('Id')
              .ele('IBAN').txt(eeg.accountInfo.iban.replaceAll(' ', '')).up()
            .up()
            .ele('Ccy').txt('EUR').up()
          .up()
          .ele('DbtrAgt')
            .ele('FinInstnId')
              .ele('BIC').txt(eeg.accountInfo.bic!).up()
            .up()
          .up()
          .ele('ChrgBr').txt('SLEV').up();

// Add transactions
  model.forEach((r: SepaModelItem, index: number) => {
    doc
      .ele('CdtTrfTxInf')
        .ele('PmtId')
          .ele('EndToEndId').txt(buildEndToEndId('GUTS', collectionDate, period)).up()
        .up()
        .ele('Amt')
          .ele('InstdAmt', { Ccy: 'EUR' }).txt((r.Amount).toFixed(2)).up()
        .up()
      .ele('Cdtr')
        .ele('Nm').txt(toSepaText(r.Name)).up()
      .up()
      .ele('CdtrAcct')
        .ele('Id')
          .ele('IBAN').txt(r.Iban.replaceAll(' ', '')).up()
        .up()
      .up()
      .ele('RmtInf')
        .ele('Ustrd').txt(createRef(r)).up()
        // .ele('Strd')
        //   .ele('CdtrRefInf')
        //     .ele('Tp')
        //       .ele('CdOrPrtry')
        //         .ele('Cd').txt('SCOR').up()
        //       .up()
        //     .up()
        //     .ele('Ref').txt(createRef(r)).up()
        //   .up()
        // .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}

export const createSepaDirectDebit = async (model: SepaModelItem[], eeg: Eeg, period: SelectedPeriod, collectionDate: Date, batch: boolean,
                                     instrument: 'CORE' | 'B2B') => {

  const sum = model.reduce((sum, r) => sum + r.Amount, 0)

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', { xmlns: 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02' })
      .ele('CstmrDrctDbtInitn')
        .ele('GrpHdr')
          .ele('MsgId').txt(createMsgId(instrument === 'B2B' ? 3 : 2)).up()
          .ele('CreDtTm').txt(new Date().toISOString()).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('InitgPty')
            .ele('Nm').txt(toSepaText(eeg.name)).up()
          .up()
        .up()
        .ele('PmtInf')
          .ele('PmtInfId').txt(createPmtInfId(eeg, period, instrument === 'B2B' ? 'B' : 'C')).up()
          .ele('PmtMtd').txt('DD').up()
          .ele('BtchBookg').txt((batch ? "true" : "false")).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('PmtTpInf')
            .ele('LclInstrm')
              .ele('Cd').txt(instrument).up()
            .up()
            .ele('SeqTp').txt('RCUR').up()
          .up()
          .ele('ReqdColltnDt').txt(toLocalISODate(collectionDate)).up()
          .ele('Cdtr')
            .ele('Nm').txt(toSepaText(eeg.accountInfo.owner)).up()
          .up()
          .ele('CdtrAcct')
            .ele('Id')
              .ele('IBAN').txt(eeg.accountInfo.iban.replaceAll(' ', '')).up()
            .up()
            .ele('Ccy').txt('EUR').up()
          .up()
          .ele('CdtrAgt')
            .ele('FinInstnId')
              .ele('BIC').txt(eeg.accountInfo.bic!).up()
            .up()
          .up();


// Add transactions
  model.forEach((r: SepaModelItem, index: number) => {
    doc
      .ele('DrctDbtTxInf')
        .ele('PmtId')
          .ele('EndToEndId').txt(buildEndToEndId('RECH',collectionDate, period)).up()
        .up()
        .ele('InstdAmt', { Ccy: 'EUR' }).txt((r.Amount).toFixed(2)).up()
        .ele('DrctDbtTx')
          .ele('MndtRltdInf')
            .ele('MndtId').txt(r.MandateRef).up()
            .ele('DtOfSgntr').txt(r.MandateDate).up()
          .up()
          .ele('CdtrSchmeId')
            .ele('Id')
              .ele('PrvtId')
                .ele('Othr')
                  .ele('Id').txt(eeg.accountInfo.creditorId!).up()
                .up()
              .up()
            .up()
          .up()
        .up()
        .ele('DbtrAgt')
          .ele('FinInstnId')
            .ele('Othr')
              .ele('Id').txt('NOTPROVIDED').up()
            .up()
          .up()
        .up()
        .ele('Dbtr')
          .ele('Nm').txt(toSepaText(r.Name)).up()
        .up()
        .ele('DbtrAcct')
          .ele('Id')
            .ele('IBAN').txt(r.Iban.replaceAll(' ', '')).up()
          .up()
        .up()
        .ele('RmtInf')
          // .ele('Strd')
          //   .ele('CdtrRefInf')
          //     .ele('Tp')
          //       .ele('CdOrPrtry')
          //         .ele('Cd').txt('SCOR').up()
          //       .up()
          //     .up()
          //     .ele('Ref').txt(createRef(r)).up()
          //   .up()
          // .up()
          .ele('Ustrd').txt(createRef(r)).up()
        .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}