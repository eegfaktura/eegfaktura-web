import {SelectedPeriod} from "../../models/energy.model";
import {MONTHNAME} from "../../models/eeg.model";
import {GetWeek} from "../../util/Helper.util";


export const calcXAxisNameV2 = (code: string, i: number) => {
  const ce = code.split(':')
  switch (ce[0]) {
    case 'D':
      return `${ce[2]}`
    case 'M':
      const i = Number(ce[2])
      return i > 0 && i <= 12 ? `${MONTHNAME[i].substring(0, 3)}` : `${i}`
    case 'W':
      return `${ce[2]} KWo`
    default:
      return `${ce[0]}:${ce[2]}`
  }
}

export const calcXAxisHourNameV2 = (code: string, i: number) => {
  return `${i.toString().padStart(2, '0')}:00`
}