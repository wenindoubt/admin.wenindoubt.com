export const LEAD_STATUSES = [
  {
    value: "new",
    label: "New",
    color: "bg-sky-500/15 text-sky-600 border-sky-500/25",
  },
  {
    value: "contacted",
    label: "Contacted",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  },
  {
    value: "qualifying",
    label: "Qualifying",
    color: "bg-violet-500/15 text-violet-600 border-violet-500/25",
  },
  {
    value: "proposal_sent",
    label: "Proposal Sent",
    color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/25",
  },
  {
    value: "negotiating",
    label: "Negotiating",
    color: "bg-orange-500/15 text-orange-600 border-orange-500/25",
  },
  {
    value: "won",
    label: "Won",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  },
  {
    value: "lost",
    label: "Lost",
    color: "bg-rose-500/15 text-rose-600 border-rose-500/25",
  },
  {
    value: "churned",
    label: "Churned",
    color: "bg-zinc-500/15 text-zinc-600 border-zinc-500/25",
  },
] as const;

export const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "conference", label: "Conference" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "other", label: "Other" },
] as const;

export const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
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
