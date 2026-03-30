import { describe, expect, it } from "vitest";
import { computeLifecycle, stageLabel } from "./constants";

describe("stageLabel", () => {
  it("returns label for known stages", () => {
    expect(stageLabel("new")).toBe("New");
    expect(stageLabel("contacted")).toBe("Contacted");
    expect(stageLabel("qualifying")).toBe("Qualifying");
    expect(stageLabel("proposal_sent")).toBe("Proposal Sent");
    expect(stageLabel("negotiating")).toBe("Negotiating");
    expect(stageLabel("nurture")).toBe("Nurture");
    expect(stageLabel("won")).toBe("Won");
    expect(stageLabel("lost")).toBe("Lost");
  });

  it("returns value as-is for unknown stages", () => {
    expect(stageLabel("unknown_stage")).toBe("unknown_stage");
  });
});

describe("computeLifecycle", () => {
  it("returns prospect for empty deals array", () => {
    expect(computeLifecycle([])).toBe("prospect");
  });

  it("returns active_client when any deal is in an active stage", () => {
    expect(computeLifecycle([{ stage: "new" }])).toBe("active_client");
    expect(computeLifecycle([{ stage: "contacted" }])).toBe("active_client");
    expect(computeLifecycle([{ stage: "qualifying" }])).toBe("active_client");
    expect(computeLifecycle([{ stage: "proposal_sent" }])).toBe(
      "active_client",
    );
    expect(computeLifecycle([{ stage: "negotiating" }])).toBe("active_client");
    expect(computeLifecycle([{ stage: "nurture" }])).toBe("active_client");
  });

  it("returns former_client when only won deals (no active)", () => {
    expect(computeLifecycle([{ stage: "won" }])).toBe("former_client");
    expect(computeLifecycle([{ stage: "won" }, { stage: "won" }])).toBe(
      "former_client",
    );
  });

  it("returns prospect when only lost deals", () => {
    expect(computeLifecycle([{ stage: "lost" }])).toBe("prospect");
    expect(computeLifecycle([{ stage: "lost" }, { stage: "lost" }])).toBe(
      "prospect",
    );
  });

  it("returns active_client when mix of active + terminal deals", () => {
    expect(computeLifecycle([{ stage: "qualifying" }, { stage: "won" }])).toBe(
      "active_client",
    );
    expect(computeLifecycle([{ stage: "new" }, { stage: "lost" }])).toBe(
      "active_client",
    );
  });

  it("returns former_client for won + lost mix (no active)", () => {
    expect(computeLifecycle([{ stage: "won" }, { stage: "lost" }])).toBe(
      "former_client",
    );
  });
});
