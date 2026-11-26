export const env = {
  /** Address that receives new leads and project requests (stored in the outbox). */
  salesInbox: () => process.env.SALES_INBOX_EMAIL ?? "sales@phoniex.local",
};
