import { describe, expect, it } from "vitest";
import { canTransition, OPEN_DISPUTE_STATES } from "./state-machine";

describe("discrepancy state machine", () => {
  it("allows the full happy path: detected → claim_generated → claim_filed → recovered", () => {
    expect(canTransition("detected", "claim_generated")).toBe(true);
    expect(canTransition("claim_generated", "claim_filed")).toBe(true);
    expect(canTransition("claim_filed", "recovered")).toBe(true);
  });

  it("allows claim_filed to end in rejected instead", () => {
    expect(canTransition("claim_filed", "rejected")).toBe(true);
  });

  it("allows dismissing directly from detected", () => {
    expect(canTransition("detected", "seller_dismissed")).toBe(true);
  });

  it("rejects skipping a step (detected straight to recovered)", () => {
    expect(canTransition("detected", "recovered")).toBe(false);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransition("recovered", "claim_filed")).toBe(false);
    expect(canTransition("rejected", "detected")).toBe(false);
  });

  it("treats detected/claim_generated/claim_filed as the open-dispute set", () => {
    expect(OPEN_DISPUTE_STATES).toEqual(["detected", "claim_generated", "claim_filed"]);
  });
});
