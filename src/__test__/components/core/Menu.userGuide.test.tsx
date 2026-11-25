import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import React from "react";
import "../../../util/I18n";

vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))

import {UserGuideMenuItem} from "../../../components/Menu";
import {SETTLEMENT_INTERVAL_HELP_URL} from "../../../components/dialogs/SettlementIntervalChange.dialog";

// Support request 25.11.2026: the side menu links the user guide.
describe("menu: Handbuch", () => {
  it("opens the published user guide in a new tab", () => {
    render(<UserGuideMenuItem/>)
    const item = screen.getByText("Handbuch").closest("ion-item") as HTMLElement
    expect(item.getAttribute("href")).toBe("https://eegfaktura.github.io/eegfaktura-user-guide/")
    expect(item.getAttribute("target")).toBe("_blank")
    expect(item.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("the chapter links of the pages use the same address", () => {
    expect(SETTLEMENT_INTERVAL_HELP_URL)
      .toBe("https://eegfaktura.github.io/eegfaktura-user-guide/05-abrechnung/#abrechnungszeitraum-wechseln")
  })
})
