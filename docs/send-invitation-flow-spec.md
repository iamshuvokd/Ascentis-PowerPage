# "Send Consultant Invitation" — Power Automate flow spec

Not built by this repository — this is a spec for whoever builds it in the Power
Automate designer (no GUI/designer access from this assistant's tools). Triggered
from the internal Canvas App's "Self-service invitations" screen; sends the
consultant a secure sign-in link via Power Pages' **native** invitation mechanism
(not this repo's old custom `asc_invitation` table — see the warning below).

## Confirmed mechanics (from Microsoft's own docs, not guessed)

Source: [Invite contacts to your Power Pages site](https://learn.microsoft.com/power-pages/security/invite-contacts), fetched 2026-10-25.

- Power Pages ships a native **Invitation** entity and a classic (background,
  on-demand) Dataverse **workflow called "Send Invitation"** that actually emails
  the link. The UI path is: create an Invitation record → command bar → **Flow >
  Send Invitation**.
- The email only ever goes to the Contact's **emailaddress1** (primary), never
  emailaddress2/3.
- The Send Invitation workflow **must stay a classic/on-demand workflow** —
  Microsoft explicitly warns against converting it to a real-time workflow, calling
  that "not supported" and a cause of invitation-process issues.
- On redemption, Power Pages can optionally: assign the contact to an Account,
  assign Web Role(s), and execute another workflow — configurable per-invitation.

## ⚠️ Naming collision — read before building

This repo has an **unrelated, now-superseded, custom** `asc_invitation` table
(built 16 Sept 2026, deliberately left in place but unused since 15 Oct 2026 per
`PROJECT_MEMORY.md`). The native Invitation entity above is a **different**,
platform-provided table. Do not write to `asc_invitation` for this flow — confirm
the real native Invitation entity's logical name live (Portal Management app →
Security → Invitations, or inspect its URL/a fresh `pac solution export`) before
building anything, since this project's schema has drifted/surprised before and the
exact logical name under the enhanced data model hasn't been confirmed in this repo.

## Before building, look these up live (do not guess)

1. The native Invitation entity's exact logical name in this environment.
2. The **Send Invitation** workflow's GUID (Portal Management app → Settings →
   Processes, filter to this site, or the workflow list) — needed to invoke it
   programmatically.
3. Confirm the Contact lookup field name for `asc_consultantid` is unchanged (added
   15 Oct 2026, confirmed live then - recheck in case of drift).

## Flow design

**Trigger:** `PowerApps (V2)` (Instant cloud flow) — inputs:
- `ConsultantId` (Text/GUID) — the `asc_consultant` record to tie the invited user to
- `Email` (Text) — goes to the Contact's `emailaddress1`
- optionally `FirstName`/`LastName` if the Canvas App collects them

**Steps:**
1. **Dataverse "List rows"** on Contacts, `$filter=emailaddress1 eq '<Email>'` — check
   for an existing Contact with this email before creating a duplicate.
2. **Condition** — no rows found:
   - **Dataverse "Add a new row"** on Contacts: `Email` = `Email`,
     `asc_consultantid` (lookup) = `ConsultantId`. Capture the new Contact's ID.
   - Rows found:
   - **Dataverse "Update a row"** on the found Contact: set `asc_consultantid` =
     `ConsultantId`. Use that Contact's ID going forward.
3. **Dataverse "Add a new row"** on the native Invitation entity (exact name from
   the lookup step above): `Invited Contact` = the Contact ID from step 2, `Type` =
   Single, `Name` = a descriptive label (e.g. `"Invite - " & triggerBody()['Email']`),
   optionally `Expiry Date`, optionally `Assign to Web Roles` = Authenticated Users
   (every Table Permission in this project already includes that role, so this
   isn't strictly required for data access to work - include it anyway for
   correctness/clarity). Capture the new Invitation record's ID.
4. **Trigger the Send Invitation workflow** against that Invitation record. Two
   known ways to do this from Power Automate - confirm which is actually available
   in this environment/connector version before committing to one:
   - Dataverse connector's **"Perform an unbound action"** step, action name
     `ExecuteWorkflow`, with the workflow's GUID (from the lookup step above) and
     `EntityId` = the Invitation record's ID.
   - A raw **HTTP (Dataverse)** action to
     `/_api/workflows(<SendInvitationWorkflowId>)/Microsoft.Dynamics.CRM.ExecuteWorkflow`
     with body `{"EntityId": "<InvitationRecordId>"}`, if the unbound-action step
     above isn't available or doesn't expose this cleanly.
5. **Respond to a PowerApp or flow** (optional) — return success/failure + the
   Contact/Invitation IDs back to the Canvas App for UI feedback (e.g. "Invitation
   sent" confirmation on the Self-service invitations screen).

## Canvas App side (separate, not this repo)

The "Self-service invitations" screen needs a Power Fx call shaped like:
```
SendConsultantInvitation.Run(ConsultantRecordId, PrimaryContactEmail)
```
passing the selected consultant's GUID and the entered email - matches the trigger
inputs above. Building this button/call is in the Canvas App, out of this
repository's scope, same as the rest of that admin app.

## What this does NOT change in this repository

Nothing in `src/portal/` needs to change for this - the portal-side redemption
handling (`resolveInvitationConsultant()` reading `#account-consultant`, set by
Power Pages' own native redemption) was already built and deployed 15 Oct 2026.
This flow only adds the missing **sending** side.
