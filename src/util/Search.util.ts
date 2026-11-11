// Search ignores case and accents („über“ finds „Uberschuss“): used by the tariff list and the community picker.
export const foldForSearch = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
