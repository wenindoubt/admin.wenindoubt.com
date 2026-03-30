export const DEAL_STAGES = [
  {
    value: "new",
    label: "New",
    description: "Fresh opportunity, no outreach yet",
    color: "bg-sky-500/15 text-sky-600 border-sky-500/25",
  },
  {
    value: "contacted",
    label: "Contacted",
    description: "Initial outreach sent, awaiting response",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  },
  {
    value: "qualifying",
    label: "Qualifying",
    description: "Evaluating fit, budget, and timeline",
    color: "bg-violet-500/15 text-violet-600 border-violet-500/25",
  },
  {
    value: "proposal_sent",
    label: "Proposal Sent",
    description: "Proposal or quote delivered, awaiting decision",
    color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/25",
  },
  {
    value: "negotiating",
    label: "Negotiating",
    description: "Active discussions on terms and pricing",
    color: "bg-orange-500/15 text-orange-600 border-orange-500/25",
  },
  {
    value: "nurture",
    label: "Nurture",
    description: "Interested but timing isn't right — follow up later",
    color: "bg-teal-500/15 text-teal-600 border-teal-500/25",
  },
  {
    value: "won",
    label: "Won",
    description: "Deal closed successfully",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  {
    value: "lost",
    label: "Lost",
    description: "Deal did not close — went with competitor or declined",
    color: "bg-rose-500/15 text-rose-600 border-rose-500/25",
  },
] as const;

export const COMPANY_LIFECYCLES = [
  {
    value: "prospect",
    label: "Prospect",
    color: "bg-sky-500/15 text-sky-600 border-sky-500/25",
  },
  {
    value: "active_client",
    label: "Active Client",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  {
    value: "former_client",
    label: "Former Client",
    color: "bg-zinc-500/15 text-zinc-600 border-zinc-500/25",
  },
] as const;

export const DEAL_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "conference", label: "Conference" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "other", label: "Other" },
] as const;

export const ACTIVITY_TYPES = [
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
] as const;

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export function stageLabel(value: string) {
  return DEAL_STAGES.find((s) => s.value === value)?.label ?? value;
}

/** Active pipeline stages (not terminal) */
export const ACTIVE_STAGES = new Set([
  "new",
  "contacted",
  "qualifying",
  "proposal_sent",
  "negotiating",
  "nurture",
]);

export function computeLifecycle(
  companyDeals: { stage: string }[],
): "prospect" | "active_client" | "former_client" {
  if (companyDeals.length === 0) return "prospect";
  if (companyDeals.some((d) => ACTIVE_STAGES.has(d.stage)))
    return "active_client";
  if (companyDeals.some((d) => d.stage === "won")) return "former_client";
  return "prospect";
}
