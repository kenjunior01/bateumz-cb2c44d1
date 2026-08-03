import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchRaffles from "./tools/search-raffles";
import getRaffle from "./tools/get-raffle";
import listMyTickets from "./tools/list-my-tickets";
import getMyLuckPoints from "./tools/get-my-luck-points";
import listMyNotifications from "./tools/list-my-notifications";
import markNotificationRead from "./tools/mark-notification-read";
import listBusinesses from "./tools/list-businesses";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bateu",
  title: "Bateu",
  version: "0.1.0",
  instructions:
    "Tools for Bateu, a raffle and live-prize platform. Browse active raffles and verified business organizers, and read the signed-in user's tickets, Luck Points and notifications. All data is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchRaffles,
    getRaffle,
    listMyTickets,
    getMyLuckPoints,
    listMyNotifications,
    markNotificationRead,
    listBusinesses,
  ],
});
