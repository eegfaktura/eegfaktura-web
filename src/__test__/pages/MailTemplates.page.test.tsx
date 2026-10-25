import {describe, expect, it, vi} from "vitest";
import {screen, waitFor} from "@testing-library/react";
import React from "react";
import "../../util/I18n";
import {renderWithProviders} from "../test-utils";
import MailTemplatesPage from "../../pages/MailTemplates.page";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import {Api} from "../../service";
import {MailTemplateList} from "../../service/mailtemplate.service";

const item = (key: string, name: string) => ({
  key, name, description: "", customized: false, defaultChanged: false, source: "backend" as const,
})

const page = (tenant: string) => (
  <EegContext.Provider value={{tenant, isAdmin: () => true} as unknown as EegState}>
    <MailTemplatesPage/>
  </EegContext.Provider>
)

describe("MailTemplatesPage", () => {
  it("ignores a late list answer for the previous community", async () => {
    let resolveOld: (r: MailTemplateList) => void = () => undefined
    const fetchList = vi.fn((tenant: string) => tenant === "RC100100"
      ? new Promise<MailTemplateList>(r => { resolveOld = r })
      : Promise.resolve({items: [item("zp-active", "Mail der neuen EEG")], failed: []}))
    Api.mailTemplateService = {fetchList} as unknown as typeof Api.mailTemplateService

    const {rerender} = renderWithProviders(page("RC100100"))
    rerender(page("RC200200"))
    await waitFor(() => expect(screen.getByText("Mail der neuen EEG")).toBeTruthy())

    resolveOld({items: [item("zp-active", "Mail der alten EEG")], failed: []})
    await new Promise(r => setTimeout(r, 0))
    expect(screen.queryByText("Mail der alten EEG")).toBeNull()
    expect(screen.getByText("Mail der neuen EEG")).toBeTruthy()
  })

  it("does not show the previous community's load failure for the next one", async () => {
    const fetchList = vi.fn((tenant: string) => tenant === "RC100100"
      ? Promise.resolve({items: [item("zp-active", "Mail der alten EEG")], failed: ["billing" as const]})
      : new Promise<MailTemplateList>(() => undefined))
    Api.mailTemplateService = {fetchList} as unknown as typeof Api.mailTemplateService

    const {rerender} = renderWithProviders(page("RC100100"))
    await waitFor(() => expect(screen.getByText("Mail der alten EEG")).toBeTruthy())
    expect(screen.getByText("Die Rechnungs-Mail konnte nicht geladen werden.")).toBeTruthy()
    rerender(page("RC200200"))
    await waitFor(() => expect(screen.queryByText("Mail der alten EEG")).toBeNull())
    expect(screen.queryByText("Die Rechnungs-Mail konnte nicht geladen werden.")).toBeNull()
  })
})
