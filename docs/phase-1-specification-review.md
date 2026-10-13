# Phase 1 specification review and portal gap assessment

Source: QMS-ASC-PMC-SPC-CODBAPPH1-R0, Consultant Database App Development Functional Specification Phase 1, Revision 0, 22 August 2026, 47 pages. Page references below use the PDF page numbers. Reviewed against current `src/portal` implementation. This assessment records requirements; it does not implement or deploy them.

## Scope and architecture boundary

The four requested designs correspond to E1–E4 (pp. 42–46): external consultant sign-in, confidentiality acknowledgement, own-profile editing, and submission confirmation. Internal screens S1–S15 cover directory, administration, reviewers, ratings, KAM and reporting. They are part of the wider Phase 1 application, not an instruction to expose them on the external portal. S16 and other AI capabilities are Phase 2 (pp. 3, 41).

Recommended separation: Power Pages for external consultant access; the internal application for staff/reviewer workflows; a shared Dataverse model with separately authorized draft/submitted and published data. This is an implementation recommendation, not a finalized schema. The FS explicitly identifies URS Section 6 as the authoritative data dictionary (p. 47). Do not create final table/column mappings from screenshots or this FS alone.

## Portal acceptance matrix

| Area | Requirement and source | Current state / work needed |
| --- | --- | --- |
| E1 identity | Registered-email OTP; no tenant account required (p. 42); invitation from Admin/LR (p. 6) | Six-box UI exists. No OTP service or invitation validation. Existing live site access was observed redirecting to Microsoft tenant sign-in; that does not establish E1 compliance. Separate site visibility for development from final consultant authentication. |
| E2 document | Auto-addressed, dated PDF with authorized signatory signature; download (p. 43) | Button and optional static site-setting URL only. Personalized generation and document association missing. |
| E2 acknowledgement | Record name, OTP identity, timestamp; prohibit data entry/submission before acknowledgement (p. 43) | Checkbox and unavailable-service message only. No saved acknowledgement or authoritative access enforcement. |
| E3 ownership | Only consultant's own permitted profile data (pp. 4, 44–45) | No record loading or Dataverse authorization. Configure ownership relationships and table permissions with the eventual schema. |
| E3 draft | Save progress (p. 45) | No persistence. Preserve nested rows and attachment relationships as well as Identity values. |
| E3 submit | Submit to S7; publish only after LR/Admin acceptance (pp. 6, 32, 45) | Preview navigation only; live handler reports unavailable. Requires submission state and preserved published values. |
| E4 confirmation | Confirm receipt, explain review, show next revalidation date (p. 46) | Review wording exists. Actual receipt and next revalidation date missing. Show success only after persistence succeeds. |
| Exclusions | Engagements, ratings/average rating and KAM hidden from consultant; Status and Notes restricted to LR/Admin (pp. 4, 21–24, 44) | Restricted tabs not shown, but service-level access remains to be configured. Clarify read visibility of Status/Notes before exposing them. |
| Per-tab metadata | Last-updated editor/date per tab; no authoritative overall last-updated field; completeness across all fields (p. 5) | Not implemented. |
| Revalidation | 12 months per tab; exclude Blacklisted/Inactive; primary-contact invitation and LR notification; fortnightly LR reminders (p. 6) | Not implemented. Confirm how E4's single next date is derived from multiple tab dates. |
| Branding | Host Grotesk 10pt, supplied colours, responsive browser/Teams design (p. 5) | Current CSS uses Arial 14px. Font asset and final brand values needed. |

## Profile fields to replace placeholders

Identity is partly implemented; all other tabs are initial general-purpose controls, not completed specification fields.

| Section | Required implementation | FS pages |
| --- | --- | --- |
| Identity | Name max 120 characters, alias, website, firm type, required discipline/sector/region selections. A region requires an active office there or at least three completed projects there. Use canonical lists instead of hardcoded demonstration options. | 10–11, 44 |
| Financial | Effective year N and YYYY or YYYY/ZZ display; required three prior-year revenues; backlog; derived backlog/N-1 percentage; revenue share by region; USD only. | 12 |
| Legal | Required Yes/No for indemnification and lost litigation, with required details when Yes; PI coverage and conditional per-occurrence/aggregate USD amounts. | 13 |
| Offices and contacts | Repeatable offices, required region, headcount, up to three leaders selected from own contacts; contact add/view/edit window. Contact first/last name, unique work email, phone required; job title, region, type, Active/Inactive status; project associations derived. | 14–15, 28 |
| Project references | Up to 30 editable/deletable projects; name, country/region, disciplines, type, status, start year; non-hotel GFA, hotel keys, completion year when Completed; project attachment also represented in Attachments. | 16–17 |
| BIM | In-house/Outsourced capability; operator count when in-house; BIM disciplines; up to 10 project subrecords with name/location/GFA/LOD. | 19 |
| Sustainability | Certification, ESG reporting and sustainability-in-QA Yes/No controls, each with conditional required details; accredited-professional count. | 20 |
| Attachments | 25 MB maximum per file, document type, upload and delete audit; consultant can delete own files; no versioning. | 25 |
| Operator approvals | S3f allows consultant self-service and up to eight operator entries, but E3's tab list omits this section. Resolve whether nested under another section or added as a tab. | 18, 44 |

## Dataverse and workflow design inputs

The following are conceptual record groups to map to the URS or existing solution, not proposed logical names:

- Consultant firm and portal-contact ownership/authorization links.
- Canonical disciplines, sectors, regions, firm types, operators and document types, plus relationships/selections.
- Financial data, legal data, offices, contacts, project references, BIM projects, sustainability and attachments.
- Invitations, verified identity references, confidentiality document/version and acknowledgements.
- Draft/submitted changes, review decisions and the published profile. Store enough information for S7's Current versus Submitted field comparison.
- Tab-specific updated/validated metadata and revalidation schedules.
- Audit events and actor/origin metadata.

Portal changes require review; internal Data Editor changes go live immediately and are logged (pp. 6, 32). Do not route both through the same mandatory approval path. Define concurrency handling so acceptance of a portal submission cannot silently overwrite later internal edits.

Audit requirements include creation, update, approval, merge, deletion, export, link issuance, OTP sign-in, confidentiality acknowledgement and KAM access, with object/action/actor/UTC timestamp/origin; Admin-only log access (pp. 7, 40). Determine which events are provided by configured auditing and which require explicit event records. Do not assume record auditing alone covers sign-in, link issuance or access events.

Business rules must be enforced at the trusted data/service layer in addition to helpful form validation. The FS names Dataverse business rules / Power Automate (p. 7); choose and verify an appropriate enforcement mechanism for each rule during implementation. An asynchronous notification flow is not proof that an unauthorized write was prevented.

## Open decisions and missing inputs

1. URS, especially Section 6 data dictionary and the referenced workflow/security requirements. The FS explicitly complements rather than replaces it (pp. 3, 47).
2. Existing Dataverse solution/schema, logical and entity-set names, relationships, choices and consultant-contact ownership rules.
3. Canonical lists and unspecified text maximum lengths; percentage warning tolerance around 100% (pp. 7, 47).
4. Authorized signatory, approved statement wording, signature asset, document version/re-acknowledgement policy (pp. 43, 47).
5. Authentication provider and invitation design satisfying external email OTP without a tenant account; OTP expiry, resend, attempt limits and session behavior are not specified here.
6. Operator approvals placement; single confirmation revalidation date versus per-tab schedules; exact rejection/resubmission behavior and validation timestamp definitions.
7. Clarify consultant contact/project-association visibility: S4 derives Ascentis projects worked on, while external engagement data is excluded elsewhere (pp. 4, 28, 44).
8. Font asset/brand guidelines, supported file types and agreed definition of 25 MB, expected test load and external-user capacity/licensing (pp. 5, 7, 47).

## Delivery sequence

1. Resolve URS/schema and authorization mapping; agree invitation/authentication, draft/publication boundaries and unresolved requirements.
2. Implement complete E3 structured forms with client validation against confirmed field definitions; connect reference data and own-record loading.
3. Connect OTP/invitations and confidentiality generation/acknowledgement; enforce identity and preconditions.
4. Connect drafts, attachments and submissions; implement the internal S7 comparison and accept/reject workflow with auditing.
5. Add per-tab validation/revalidation, notifications and E4 next-date display.
6. Acceptance test real consultant identity, cross-consultant access denial, restricted-field denial, conditional validation, all row/file limits, retained drafts, review-before-live, rejection and concurrent internal edits. Test the latest two Edge/Chrome versions and relevant Teams contexts. Validate stated performance targets at agreed load: directory <=3s, search/filter <=2s, save <=2s; 500+ consultants and 2,000+ ratings (p. 47).

No app code, Dataverse records, authentication settings, or deployment were changed during this document review.

## Subsequent frontend implementation

The baseline gaps above were assessed before the structured-form work. Seven screenshot-guided profile screens, repeatable record editors, conditional validation, financial calculations, local file controls and a service boundary have since been implemented. Read `PROJECT_MEMORY.md` for the current checklist, remaining provisional decisions and validation/deployment status. Dataverse/authentication/review/audit requirements remain open.
