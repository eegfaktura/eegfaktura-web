import * as XLSX from 'xlsx';
import {create} from 'xmlbuilder2';
import {Eeg} from "../models/eeg.model";
import moment from "moment";
import {SelectedPeriod} from "../models/energy.model";
import {Api} from "./index";

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

// Mitglieder mit Einzugsart "Kein SEPA" (NONE) zahlen auf Rechnung: nicht in die Lastschrift-Datei.
// Gutschriften (Ueberweisung) sind davon nicht betroffen.
export const splitDebitByMandate = (debit: SepaModelItem[]) => ({
  debit: debit.filter(item => item.DebitType !== 'NONE'),
  skipped: debit.filter(item => item.DebitType === 'NONE'),
})

// Zeilen ohne IBAN (z.B. Mitglieder ohne Bankkonto, die auf Rechnung zahlen) koennen weder in die
// Lastschrift noch in die Ueberweisung: Sie werden aus beiden Dateien genommen und im Dialog zur
// manuellen Abwicklung aufgelistet.
export const splitRowsByIban = (records: any[]) => {
  const hasIban = (item: any) => String(item['Empfänger Konto IBAN'] ?? '').replace(/\s/g, '').length > 0
  const name = (item: any) => item['Empfänger Name'] || item['Empfänger Kontoeigner'] || item['Nummer']
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

  if (eeg.accountInfo.iban.length === 0) {
    throw new Error("E_IBAN_MISSING")
  }

  if (!eeg.accountInfo.creditorId) {
    throw new Error("E_NO_CREDITOR_ID");
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
        (result[item['Empfänger Konto IBAN']] = result[item['Empfänger Konto IBAN']] || []).push(item);
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

    const {debit, skipped} = splitDebitByMandate(invoiceFile.Debit)
    return {
      debit: {content: await createSepaDirectDebit(debit, eeg, activePeriod, collectionDate, batch), name: buildFileName("SEPA_Direct_Debit", tenant, activePeriod)},
      transfer: {content: await createSepaCreditTransfer(invoiceFile.Transfer, eeg, activePeriod, collectionDate, batch), name: buildFileName("SEPA_Credit_Transfer", tenant, activePeriod)},
      skippedDebit: skipped.map(item => item.Name),
      withoutIban,
    }
  } catch (error) {
    console.log(error);
    throw new Error("E_SEPA_DOWNLOAD")
  }
}

const createMsgId = (num: number) => `MSG-${moment().format('YYYYMMDD')}-${zeroPad(num, 5)}`
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

const createPmtInfId = (eeg: Eeg, period: SelectedPeriod) => {
  const year = new Date().getFullYear()
  const paymentInterval = getIdFromSettlementInterval(eeg.settlementInterval).toString() + zeroPad(period.segment, 3);
  const nameId = replaceUmlaute(eeg.name).replaceAll(' ', '').toUpperCase().slice(0,10)

  return `${nameId}-${year}-${paymentInterval}`
}

const createRef = (item: SepaModelItem): string => {
  return toSepaText(`${item.InvoiceIds.join(' / ')}`, 140)
}

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
          .ele('PmtInfId').txt(createPmtInfId(eeg, period)).up()
          .ele('PmtMtd').txt('TRF').up()
          .ele('BtchBookg').txt((batch ? "true" : "false")).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('PmtTpInf')
            .ele('SvcLvl')
              .ele('Cd').txt('SEPA').up()
            .up()
          .up()
          .ele('ReqdExctnDt').txt(collectionDate.toISOString().slice(0, 10)).up()
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

const createSepaDirectDebit = async (model: SepaModelItem[], eeg: Eeg, period: SelectedPeriod, collectionDate: Date, batch: boolean) => {

  const sum = model.reduce((sum, r) => sum + r.Amount, 0)

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', { xmlns: 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02' })
      .ele('CstmrDrctDbtInitn')
        .ele('GrpHdr')
          .ele('MsgId').txt(createMsgId(2)).up()
          .ele('CreDtTm').txt(new Date().toISOString()).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('InitgPty')
            .ele('Nm').txt(toSepaText(eeg.name)).up()
          .up()
        .up()
        .ele('PmtInf')
          .ele('PmtInfId').txt(createPmtInfId(eeg, period)).up()
          .ele('PmtMtd').txt('DD').up()
          .ele('BtchBookg').txt((batch ? "true" : "false")).up()
          .ele('NbOfTxs').txt(model.length.toString()).up()
          .ele('CtrlSum').txt(sum.toFixed(2)).up()
          .ele('PmtTpInf')
            .ele('LclInstrm')
              .ele('Cd').txt('CORE').up()
            .up()
            .ele('SeqTp').txt('RCUR').up()
          .up()
          .ele('ReqdColltnDt').txt(collectionDate.toISOString().slice(0, 10)).up()
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