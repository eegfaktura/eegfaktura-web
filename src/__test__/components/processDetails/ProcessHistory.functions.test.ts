import { describe, it, expect } from "vitest";
import {mergeProtocolEntries, REVOKE_PROTOCOLS} from "../../../components/processDetails/ProcessHistory/ProcessHistory.functions";

describe("revoke history", () => {
  it("queries the revocations by the member (CM_REV_CUS) as well", () => {
    expect(REVOKE_PROTOCOLS).toEqual(["CM_REV_IMP", "CM_REV_SP", "CM_REV_CUS"]);
  });

  it("merges the conversations of all revoke protocols", () => {
    const merged = mergeProtocolEntries(REVOKE_PROTOCOLS, {
      CM_REV_IMP: {c1: ["imp"]},
      CM_REV_CUS: {c2: ["cus"]},
      CR_MSG: {c3: ["other"]},
    });
    expect(merged).toEqual({c1: ["imp"], c2: ["cus"]});
    expect(mergeProtocolEntries(REVOKE_PROTOCOLS, undefined)).toEqual({});
  });
});
