import {describe, it, expect} from "vitest";
import {Metering} from "../../models/meteringpoint.model";
import {meteringDisplayName} from "../../util/FilterHelper";
import {partFactMeterLabel} from "../../components/processDetails/ProcessChangeParticipantFactor.component";
import {registerMeterLabel} from "../../components/processDetails/ProcessRegisterMeter.component";
import {requestValuesMeterLabel} from "../../components/processDetails/ProcessRequestValues.component";
import i18n from "../../util/I18n";

// the German texts of the meter form's direction toggle
const t = i18n.getFixedT("de", "common")

const meter = (direction: string, equipmentName?: string) => ({
  meteringPoint: "AT0030000000000000000000000000001",
  direction,
  equipmentName,
  processState: "ACTIVE",
  partFact: 40,
}) as unknown as Metering

describe("metering point labels in the process selections (#222)", () => {
  it("shows the direction before the metering point", () => {
    expect(meteringDisplayName(meter("CONSUMPTION"), t)).toBe("Verbraucher - AT0030000000000000000000000000001")
    expect(meteringDisplayName(meter("GENERATION"), t)).toBe("Erzeuger - AT0030000000000000000000000000001")
  })

  it("keeps the equipment name when set", () => {
    expect(meteringDisplayName(meter("GENERATION", "PV Dach"), t))
      .toBe("Erzeuger - PV Dach - AT0030000000000000000000000000001")
    expect(meteringDisplayName(meter("CONSUMPTION", ""), t)).toBe("Verbraucher - AT0030000000000000000000000000001")
  })

  it("change participation factor appends the factor", () => {
    expect(partFactMeterLabel(meter("GENERATION", "PV Dach"), t))
      .toBe("Erzeuger - PV Dach - AT0030000000000000000000000000001 - 40%")
  })

  it("register meter and request values append the process state", () => {
    expect(registerMeterLabel(meter("CONSUMPTION"), t)).toBe("Verbraucher - AT0030000000000000000000000000001 ACTIVE")
    expect(requestValuesMeterLabel(meter("GENERATION", "PV Dach"), t))
      .toBe("Erzeuger - PV Dach - AT0030000000000000000000000000001 ACTIVE")
  })
})
