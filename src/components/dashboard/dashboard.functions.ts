import {ReportNamedData} from "../../models/energy.model";

export type LoadSharingData = {
  name: string
  consumed: number
  produced: number
  distributed: number
  cntCons: number
  cntProd: number
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
    } as LoadSharingData
  })
}
