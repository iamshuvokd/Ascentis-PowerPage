# Dataverse integration plan

This describes the trusted operations still required. The supplied DBML, initial migration and current deployment status are now tracked in `../backend/README.md` and `../PROJECT_MEMORY.md`. Scalar mappings are implemented in `src/portal/dataverse-map.json`; live endpoints and scoped permissions remain pending.

Keep transport and Dataverse field mapping in a dedicated service module when connecting the portal. Screen handlers should collect values, call that service, and render the result. Do not scatter table names or HTTP calls across views. Do not put credentials in JavaScript or configuration files.

| Operation | Current handler | Required result before advancing |
| --- | --- | --- |
| Send and verify email code | `scripts/signin.js` | Authenticated identity/session from the configured identity provider |
| Read/download confidentiality PDF | `scripts/confidentiality.js` | Approved document URL; current site setting is `ConsultantPortal/ConfidentialityPdfUrl` |
| Record acknowledgement | `scripts/confidentiality.js` | Server-confirmed record ID, statement version, authenticated contact and timestamp |
| Load profile and choices | `scripts/profile.js` initialization | Authorized firm record, related selections, acknowledgement state and concurrency version |
| Save draft | `scripts/profile.js` save-draft handler | Persisted draft ID/version and timestamp |
| Upload attachments | `scripts/profile.js` attachment input | Authorized file records associated with the draft |
| Submit for review | `scripts/profile.js` form submit handler | Persisted submission ID/status and server receipt |

Use stable IDs as selection values once choices are loaded from Dataverse; current preview labels are not database identifiers. The central field mapping translates names such as `firmName`, `website`, and `alias`; lookup labels such as `firmType` still require canonical ID resolution by the trusted service.

The server must determine record ownership from the authenticated user, enforce acknowledgement and region eligibility, and enforce review transitions. Browser visibility and validation are usability controls. Apply Power Pages table permissions to the contact/account relationship. Preserve the current published profile until a reviewer approves changes; agree whether drafts use separate tables or versioned records.

For asynchronous writes, disable the triggering control while pending, prevent duplicate submissions, restore controls on failure, retain entered values, and display useful error messages. Advance to Submission received only after a confirmed server response. Resolve concurrency conflicts explicitly instead of overwriting a newer record.

Before implementing, provide the exported schema or a mapping of tables, columns, relationships, choice values, authentication provider, review statuses, attachment storage, and consultant-to-firm ownership. Verify the chosen Power Pages APIs against current Microsoft documentation during implementation.

Frontend update: structured forms and validation now exist in `form-schema.json`, `form-fields.js`, `rules.js`, and `profile.js`. The service boundary is implemented as `portalService.saveDraft(payload)` / `portalService.submit(payload)` in `services.js`, with live rejection and labelled preview responses. Use `PROJECT_MEMORY.md` for current completion status and provisional field/list decisions. Older statements about placeholder textareas in this plan describe the pre-implementation baseline.

## Attachments (24 Oct 2026)

Consultant-level files are stored in `asc_attachment` (row) + `asc_attachedfile` (file column, uploaded via `PUT /_api/asc_attachments(id)/asc_attachedfile`). Project-level files are blocked until `asc_projectreference` is writable; files over 16 MB are skipped (single-call limit). See `PROJECT_MEMORY.md`.
