export const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "qualifying", label: "Qualifying", color: "bg-purple-100 text-purple-800" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-indigo-100 text-indigo-800" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-100 text-orange-800" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
  { value: "churned", label: "Churned", color: "bg-gray-100 text-gray-800" },
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
