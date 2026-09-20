export const COLLECTIONS = {
  USERS: "users",
  USERNAME_INDEX: "usernameIndex",
  INCIDENTS: "incidents",
  EVIDENCE: "evidence",
  REPORTS: "reports",
  RESOURCES: "resources",
  HOSPITALS: "hospitals",
  ROUTES: "routes",
  RECOMMENDATIONS: "recommendations",
  SIMULATIONS: "simulations",
  SYSTEM_EVENTS: "systemEvents",
  CITY: "city",
  ZONES: "zones",
  LIVE_INPUTS: "liveInputs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
