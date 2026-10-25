import {ReportNamedData} from "../../models/energy.model";
import {balanceOf, daysOfBar} from "./Balance.functions";

export type LoadSharingData = {
  name: string
  consumed: number
  produced: number
  distributed: number
  cntCons: number
  cntProd: number
  balance?: number   // Bilanzdifferenz (Balance.functions.ts); undefined if the report has no surplus
  days?: number      // days of the bar, for the rounding tolerance
}


export const transformData = (data:ReportNamedData[] | undefined, nameFunc: (n:string, i:number)=>string): LoadSharingData[] => {
  if (!data) {
    return [] as LoadSharingData[];
  }

  return data.map((r, i) => {
    return {
      name: nameFunc(r.name, i),
      consumed: r.consumed - r.distributed,
      produced: r.produced,
      distributed: r.distributed,
      cntCons: r.cntConsumer,
      cntProd: r.cntProducer,
      balance: r.unused == null ? undefined : balanceOf({...r, unused: r.unused}),
      days: daysOfBar(r.name),
    } as LoadSharingData
  })
}
