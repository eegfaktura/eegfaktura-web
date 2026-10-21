// The grid operator accepts a change of the participation factor (EC_PRTFACT_CHANGE) only between 09:00 and
// 17:00 Austrian time; it takes effect the next calendar day. Outside the window it rejects with code 82
// „Prozessdatum falsch“ (ebUtilities EC_PRTFACT_CHANGE 1.09, section Fristen; prod logs 16.09.–20.10.2026).
export const PARTFACT_WINDOW_START = 9
export const PARTFACT_WINDOW_END = 17
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
export const PARTFACT_WINDOW_TEXT = `${hh(PARTFACT_WINDOW_START)} und ${hh(PARTFACT_WINDOW_END)} Uhr`

const viennaTime = new Intl.DateTimeFormat('de-AT', {
  timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function isInPartFactWindow(now: Date = new Date()): boolean {
  const parts = viennaTime.formatToParts(now)
  const hour = Number(parts.find(p => p.type === 'hour')?.value)
  return hour >= PARTFACT_WINDOW_START && hour < PARTFACT_WINDOW_END
}
