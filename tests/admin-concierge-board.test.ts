import { describe, expect, it } from "vitest";
import type { PipelineCard } from "@/lib/admin/pipeline";
import { conciergeBoardModel } from "@/lib/concierge/board";

function card(overrides: Partial<PipelineCard> = {}): PipelineCard {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    brand: "gln",
    brandOrigin: "gln",
    clientName: "Test Client",
    trackKey: "concealed",
    trackLabel: "CONCEALED CARRY",
    serviceKey: "concierge",
    serviceLabel: "Concierge",
    stage: "document_collection",
    stageLabel: "Documents",
    nextStep: "Complete documents",
    whoseMove: "Applicant",
    days: 4,
    stalled: false,
    nypdControlled: false,
    qaSignedOff: false,
    ownerId: null,
    ownerName: null,
    ownerInitials: "—",
    isDemo: false,
    isDuplicate: false,
    duplicateLabel: null,
    pendingAmount: null,
    compLabel: null,
    lastStep: null,
    progressStep: 3,
    classification: "active",
    phase: "paperwork",
    leadGroup: "new",
    hiddenDuplicate: false,
    ...overrides,
  };
}

describe("concierge journey model", () => {
  it("keeps NYPD-controlled cases in the agency column even after sign-off", () => {
    expect(
      conciergeBoardModel.columnFor(card({ stage: "under_investigation" }), {
        bucket: "signed",
        signedOff: true,
      }),
    ).toBe("nypd");
  });

  it("places a signed pre-filing packet in the ready-to-file column", () => {
    const row = card({ stage: "application_assembled" });
    const qa = { bucket: "signed", signedOff: true };
    expect(conciergeBoardModel.columnFor(row, qa)).toBe("ready_to_file");
    expect(conciergeBoardModel.ownerFor(row, "Ready for their review & filing", qa)).toBe("Client");
  });

  it("keeps a QA-ready packet with staff until sign-off", () => {
    const row = card({ stage: "notarization" });
    const qa = { bucket: "ready", signedOff: false };
    expect(conciergeBoardModel.columnFor(row, qa)).toBe("qa");
    expect(conciergeBoardModel.ownerFor(row, null, qa)).toBe("Our move");
  });

  it("preserves canonical staff-owned concierge signals", () => {
    expect(conciergeBoardModel.ownerFor(card(), "Book the intro call")).toBe("Our move");
  });

  it("supports anyone, me, unassigned and named agent filters", () => {
    const assigned = { agentId: "agent-1" };
    expect(conciergeBoardModel.matchesAgent(assigned, "anyone", "agent-2")).toBe(true);
    expect(conciergeBoardModel.matchesAgent(assigned, "me", "agent-1")).toBe(true);
    expect(conciergeBoardModel.matchesAgent({ agentId: null }, "unassigned", "agent-1")).toBe(true);
    expect(conciergeBoardModel.matchesAgent(assigned, "agent-1", "agent-2")).toBe(true);
  });
});
