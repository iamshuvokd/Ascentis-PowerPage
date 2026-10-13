# Backend readiness and dependency audit

Update: the user has now supplied the DBML design and authorized schema creation. See `../backend/README.md` and `../PROJECT_MEMORY.md` for the migration, central mappings, new checks and latest deployment status. The audit below records the earlier dependency review; its deployment/schema status is historical.

## Current result

The frontend is ready for schema mapping. It is not backend-connected. This audit checked local source/configuration, dependency installation, build tests, browser execution, and current Microsoft documentation. It did not change the live environment, verify current remote permissions, or deploy the latest frontend.

## Development dependencies

| Dependency | Finding |
| --- | --- |
| Node.js | v24.19.0 installed. Project now declares Node >=20. |
| npm | 11.17.0 installed. Use `npm.cmd` in PowerShell. |
| Runtime packages | None. The portal uses browser HTML/CSS/JavaScript APIs; no runtime React, jQuery, Bootstrap or CDN dependency in the custom frontend. |
| Browser tests | Playwright 1.63.0 and playwright-core 1.63.0 pinned in lockfile. They were missing locally because earlier checks used a temporary install. Fixed with `npm.cmd ci --ignore-scripts`. |
| npm audit during installation | Reported 0 known vulnerabilities for the installed dependency tree. This is not a security certification of the portal. |
| Browser | Microsoft Edge 152.0.4191.66 installed; test suite uses the `msedge` channel. Chrome/Teams and authenticated live acceptance remain separate checks. |
| Power Platform CLI | Installed inside the VS Code Power Platform extension. CLI availability verified; fresh authentication/environment access must be checked before the next deployment. |
| Build | No package download required for build or Node unit checks. All eight checks passed during this audit. |

## Platform dependencies before connecting data

### 1. Schema and ownership

- [ ] Obtain the solution export or full schema: table logical names, EntitySetNames, primary keys, column names/types/limits, requiredness, lookups, relationship names, choice numeric values, and file-column configuration.
- [ ] Confirm how the authenticated portal Contact maps to its consultant firm and related records; distinguish contact authentication identity from business contacts entered by a consultant.
- [ ] Identify draft/submission/review tables, or agree changes to the existing model. Browser-local row IDs must map to server record IDs after creation.
- [ ] Define published-versus-submitted data, reviewer assignment and acceptance behavior before implementing writes.
- [ ] Include URS Section 6, canonical lists, field lengths and date/currency behavior if they are not fully represented by the export.

### 2. Power Pages API and permissions

The local export contains no `Webapi/` settings or table-permission files and only the default Administrator/Authenticated/Anonymous web roles. This establishes a gap in the local export, not proof that the live environment has none.

Configure selected tables and explicit permitted columns, then apply web roles and ownership-scoped table permissions. API URLs use EntitySetName; settings use table logical names. Current Microsoft documentation deprecates wildcard fields and does not support direct action/function calls through the portal API. Therefore workflow design cannot assume every Dataverse API operation is callable from `/_api`. [Microsoft Web API overview](https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview)

- [ ] Verify remote settings and permission records before creating duplicates.
- [ ] Map Read/Create/Write/Delete and association permissions for each related table, plus restricted columns where needed.
- [ ] Test two different consultant identities: cross-firm reading/writing and access to internal-only data must fail independently of the UI.
- [ ] Confirm request/session handling and anti-forgery tokens. The custom standalone template intentionally skips standard website assets. It currently loads neither jQuery nor `shell.getTokenDeferred`/`validateLoginSession`; do not paste Microsoft's sample wrapper without providing and verifying its platform dependencies. [Microsoft request/token example](https://learn.microsoft.com/en-us/power-pages/configure/web-api-http-requests-handle-errors)
- [ ] Check the chosen platform script/token integration against the actual site version and content security policy. Preserve the explicit CSS/JS rendering fix.

### 3. Authentication and invitations

- [ ] Confirm the external OTP provider, application/user flow, redirect/logout configuration and contact mapping.
- [ ] Ensure the invitation/registered-email restriction is enforced, not replaced by unrestricted registration.
- [ ] Confirm OTP expiration, retry/resend limits and session behavior; the current code-entry screen is a preview, not an authentication provider.
- [ ] Decide how the reference sign-in design maps to the chosen provider's hosted sign-in flow; a provider integration does not automatically make our six custom inputs its OTP API.

Microsoft documents email one-time passcode as a Power Pages Entra External ID user-flow option. That is a supported option to assess, not a provider already configured here. [Microsoft External ID setup](https://learn.microsoft.com/en-us/power-pages/security/authentication/entra-external-id)

### 4. Files and confidentiality

- [ ] Identify Dataverse file storage tables/columns and parent relationships. Confirm the 25 MB limit in the actual configured column and the end-to-end transfer path.
- [ ] Prove upload and download near 25 MB, including failed/retried transfers. A browser size check does not guarantee transport support; Microsoft describes chunked retrieval above 16 MB. [Microsoft file-column documentation](https://learn.microsoft.com/en-us/power-pages/configure/file-column)
- [ ] Confirm permitted extensions/MIME types, ownership and delete-own enforcement.
- [ ] Obtain the approved statement, signatory/signature asset and personalized-PDF generation mechanism; store document/version and acknowledgement identifiers.
- [ ] Require trusted acknowledgement state before allowing data entry and submission.

### 5. Services, workflow and operations

- [ ] Implement record loading, pagination where needed, scalar/choice/lookup conversion, service error handling and local-to-server ID reconciliation.
- [ ] Connect `portalService.saveDraft` and `portalService.submit` only after defining durable results and attachment completion.
- [ ] Protect against duplicate submissions and concurrent internal edits; do not publish partially saved nested records.
- [ ] Create/confirm review accept/reject automation, flow ownership, connection references and any approval/notification connectors.
- [ ] Implement per-tab updated/validated metadata, audit events, revalidation date/reminders and the E4 date response.
- [ ] Confirm site capacity/licensing, Dataverse storage capacity and administrative access for the selected services. No licensing or capacity change was made by this audit.

## What to share with the schema

Best input: the Dataverse solution/schema export plus brief notes identifying the consultant table, portal-contact ownership relationship, draft/review model and file storage. If available, include the URS data dictionary and existing flow/identity-provider configuration names. Credentials or passwords are not needed in chat.

## Resume order

1. Inspect the received schema and current remote configuration.
2. Write the exact field/relationship mapping and resolve any model gaps.
3. Establish authenticated own-record reads and permissions with two test consultants.
4. Connect acknowledgement, drafts, files and submission in that order; then reviewer publication, auditing and revalidation.
5. Run integration acceptance checks and sync to the explicit development target when requested.

Live/backend dependency status remains pending; the latest frontend has not been synced. See `PROJECT_MEMORY.md` for implementation status.
