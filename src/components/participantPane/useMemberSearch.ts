import {useState} from "react";

/**
 * Search of the member list. Closing the search bar also clears its text: the bar unmounts, and a query that kept
 * filtering would hide members without any visible reason (platform#228).
 */
export const useMemberSearch = () => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined)
  const [searchActive, setSearchActive] = useState(false)

  const toggleSearch = () => {
    if (searchActive) setSearchQuery(undefined)
    setSearchActive(!searchActive)
  }

  const onSearchInput = (value: string | null | undefined) => setSearchQuery(value?.toLowerCase())

  return {searchQuery, searchActive, toggleSearch, onSearchInput}
}
