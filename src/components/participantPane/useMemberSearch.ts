import {useRef, useState} from "react";

/**
 * Search of the member list. Closing the search bar also clears its text: the bar unmounts, and a query that kept
 * filtering would hide members without any visible reason (platform#228). The bar debounces its input, so an input
 * can arrive after the bar was closed; it is dropped (a ref, not the render's closure, knows the bar is closed).
 */
export const useMemberSearch = () => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined)
  const [searchActive, setSearchActive] = useState(false)
  const open = useRef(false)

  const toggleSearch = () => {
    open.current = !open.current
    if (!open.current) setSearchQuery(undefined)
    setSearchActive(open.current)
  }

  const onSearchInput = (value: string | null | undefined) => {
    if (open.current) setSearchQuery(value?.toLowerCase())
  }

  return {searchQuery, searchActive, toggleSearch, onSearchInput}
}
