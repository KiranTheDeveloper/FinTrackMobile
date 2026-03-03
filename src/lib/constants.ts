export const STATUS_LABELS: Record<string, string> = {
  NEW_ENQUIRY: "New Enquiry",
  KYC_PENDING: "KYC Pending",
  KYC_RECEIVED: "KYC Received",
  PRODUCT_PROPOSED: "Proposed",
  QUOTE_SHARED: "Quote Shared",
  CONFIRMATION_RECEIVED: "Confirmed",
  DEAL_CLOSED: "Deal Closed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  DROPPED: "Dropped",
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW_ENQUIRY:           { bg: "#1e3a5f", text: "#93c5fd" },
  KYC_PENDING:           { bg: "#3b2f00", text: "#fde047" },
  KYC_RECEIVED:          { bg: "#3b2000", text: "#fcd34d" },
  PRODUCT_PROPOSED:      { bg: "#3b1a00", text: "#fb923c" },
  QUOTE_SHARED:          { bg: "#2e1a4a", text: "#c084fc" },
  CONFIRMATION_RECEIVED: { bg: "#1a1f4a", text: "#818cf8" },
  DEAL_CLOSED:           { bg: "#0d2e2e", text: "#2dd4bf" },
  IN_PROGRESS:           { bg: "#0d2e3b", text: "#67e8f9" },
  COMPLETED:             { bg: "#0d2e1a", text: "#4ade80" },
  ON_HOLD:               { bg: "#1e293b", text: "#94a3b8" },
  DROPPED:               { bg: "#3b0d0d", text: "#f87171" },
};

export const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LIFE:   { bg: "#1e3a5f", text: "#93c5fd", border: "#1d4ed8" },
  HEALTH: { bg: "#3b0d0d", text: "#f87171", border: "#b91c1c" },
  MF:     { bg: "#0d2e1a", text: "#4ade80", border: "#15803d" },
  ITR:    { bg: "#3b1a00", text: "#fb923c", border: "#c2410c" },
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS);

export const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  primary: "#3b82f6",
  primaryDark: "#1d4ed8",
  danger: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
};

export function formatDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date();
}
