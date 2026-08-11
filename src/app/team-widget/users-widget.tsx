"use client";

// The WorkOS drop-in User Management widget. Given an org-scoped auth token
// (minted server-side), it renders the whole members table — list, search,
// invite, role change, remove — with no custom UI code. Compare with the
// hand-built version in src/app/team/.
import "@workos-inc/widgets/styles.css";
import { UsersManagement, WorkOsWidgets } from "@workos-inc/widgets";

export function UsersWidget({ authToken }: { authToken: string }) {
  return (
    <WorkOsWidgets>
      <UsersManagement authToken={authToken} />
    </WorkOsWidgets>
  );
}
