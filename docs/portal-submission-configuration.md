# Portal Submission table (`asc_portalsubmission`) — Power Pages configuration

Staging area for consultant portal edits. The live `asc_consultant` record is never written directly from the portal — only through this table, reviewed internally before going live. Work through the steps below one at a time; check each off before moving on.

## Schema gap — resolved 2026-09-28

`asc_portalsubmission` was actually already live before this fix (contrary to this doc's original premise/model.json's stale `"existing": false"`) - discovered during a project-wide primary-column audit the same day, alongside the primary-column-naming pattern found on `asc_biminformation`/`asc_contact`/`asc_ConsultationCategory`. Since fixing the primary column required a delete + recreate regardless, the missing fields below were folded into that same rebuild rather than left for a separate pass:

- [x] Add `asc_submittedby_id` (Lookup -> `asc_contact`, optional) — required for Contact-scoped Table Permissions in Step 2.
- [x] Add `asc_rejectreason` (Multiline text - 4000 chars, this build tooling's standard text-column limit, not exactly the 500 originally specified here; still well within bounds).
- [x] `Draft` added as a valid `asc_status` value (now: Draft / Submitted / Accepted / Rejected) - documented only, Dataverse option-set enforcement isn't built (see biminformation's picklist note elsewhere in this project - same limitation).
- [x] Primary column fixed to `asc_number` (autonumber, display "Number") in the same rebuild, matching the convention applied to biminformation/contact/consultationcategory.

## Target field list

| Field | Type | Behavior |
| --- | --- | --- |
| `asc_consultant` | Lookup -> `asc_consultant` | required |
| `asc_tab` | Choice (8 portal tabs) | required |
| `asc_before` | Multiline text (JSON snapshot) | auto |
| `asc_after` | Multiline text (JSON snapshot) | auto |
| `asc_status` | Choice: Draft / Submitted / Accepted / Rejected | required |
| `asc_submittedby` | Lookup -> Contact | auto |
| `asc_reviewedby` | Lookup -> systemuser | auto |
| `asc_revieweddate` | DateTime | auto |
| `asc_rejectreason` | Multiline (500) | conditional, on Reject |

Ownership: User or team. Row-level security via Dataverse Access Team.

## Target lifecycle

1. Consultant edits a tab in portal, clicks Save draft.
2. System looks for existing row where consultant = this contact's consultant, tab = this tab, status = Draft. If found, update it (`asc_after` = new JSON). If not found, create new row, status = Draft.
3. Consultant clicks Submit for review -> same row: status Draft -> Submitted. Row becomes read-only to the consultant from this point.
4. Internal Lead Reviewer/Admin reviews in Review queue (S7), compares `asc_before` vs `asc_after`.
5. Accept -> copy `asc_after` values into live `asc_consultant` record, set that tab's last-updated field, status -> Accepted. Reject -> status -> Rejected, `asc_rejectreason` required.
6. Next time consultant edits that tab (even after Accept/Reject), a NEW row is created. Old rows stay forever as history, never reused, never deleted.
7. At most one Draft row can exist per consultant+tab at any time.

## Configuration steps — do one by one

### Step 1 — Web role

- [x] Created the "Consultant Primary Contact" web role in `webrole.yml` (`adx_webroleid: 3f7c9f0a-6b6e-4a3c-9c2c-3a8e9f3a2b41`), not assigned to Authenticated/Anonymous. Nothing in this project currently assigns individual signed-in contacts to it (no such mechanism exists anywhere in this repo) — it exists per this step, but is not yet how real users get their access; see Step 2's note.

### Step 2 — Table Permission

- [x] Added `table-permissions/Portal-Submission----Authenticated-Test-Access.tablepermission.yml` following the existing pattern. Create/Read/Write = true, Delete = false, AppendTo = true (needed so `asc_consultant_id` can be set via `@odata.bind` on create — the existing `asc_consultant` table permission already has the matching `Append = true` on its side, so no change was needed there).
- [x] **Scope deviated from the doc: Global (756150000), not Contact.** Investigated first and found Contact scope cannot actually be built as specified: `asc_submittedby_id` targets `asc_contact` (this project's own custom business-contact table), not the native Power Pages Contact entity that Contact-scope Table Permissions resolve against (the signed-in visitor's own portal identity) — there is no relationship from `asc_portalsubmission` to native Contact for `adx_contactrelationship` to reference. Building one would mean adding a further lookup column (a schema change beyond this doc's own scope) or repointing `asc_submittedby_id`, neither done here without asking first. Used Global scope instead, matching every other table permission in this project (none are per-owner yet — a pre-existing, already-documented gap, not a new one). `asc_submittedby_id` is deliberately never written by the code added here as a result.
- [x] Assigned to both "Authenticated Users" (so this is actually exercised by real signed-in users today, matching how every other table permission in this project works — nothing currently maps contacts to the new role) and "Consultant Primary Contact" from Step 1 (for whenever real per-role assignment exists).
- [ ] Server-side enforcement blocking Write once `asc_status <> Draft` — not built; no Dataverse plugin project exists in this repository and this machine has no .NET SDK to compile one, and a Power Automate/classic-workflow build needs GUI designer access this session doesn't have. **2026-10-07: confirmed with the project owner — Global Table Permission scope stays as-is, and this write-lock is meant to be the real security boundary instead of Contact scope.** Spec handed off for a colleague to build: see `docs/portal-submission-automation-spec.md` Part A.
- [x] Added `Webapi/asc_portalsubmission/enabled` and `Webapi/asc_portalsubmission/fields` site settings (`sitesetting.yml`) — required in addition to the Table Permission per this project's established Power Pages Web API lesson (see `backend/README.md`).

### Steps 3–4 — Save draft / Submit for review + find-or-create resolution

This portal is not built on native Power Pages Basic/Entity Forms at all — `document.html` is a single custom SPA page, and every other write (`asc_consultant`, `asc_contact`, `asc_bimproject`, the junction tables) already goes through `src/portal/scripts/services.js` calling the Web API directly via JS, not through Basic Forms. Built the equivalent of Steps 3–4 in that same style rather than introducing a second, inconsistent mechanism:

- [x] `services.js` now has `recordPortalSubmissions(consultantId, payload, status)`, called from the existing `saveDraft`/`submit` flow. Since this portal has one whole-profile Save draft/Submit action rather than a per-tab button, it upserts one `asc_portalsubmission` row per one of the 8 tabs on every save, each with that tab's own slice of the form as `asc_after` — same "one row per consultant+tab" data shape the doc describes, just driven by the existing single Save/Submit action instead of eight separate ones.
- [x] Find-or-create implemented client-side (`findDraftSubmissionId`) — the doc's **Option A**, done in JS/Web API instead of Liquid/FetchXML+Entity Form (this portal has neither): `$filter` on `asc_tab`/`asc_status` (plain text columns — reliable here, unlike `$filter` on a lookup's `_value` annotation, a separately-confirmed limitation elsewhere in this file) plus a client-side match on `_asc_consultant_id_value`, since the Table Permission is Global scope, not per-consultant. The same same-tab-opened-twice race the doc flags for Option A applies here too; not solved (Option B would need a Custom API/Flow, out of reach the same way the plugin in Step 5 is).
- [x] **This is additive, not a replacement of the live write path.** The doc's own premise ("the live `asc_consultant` record is never written directly from the portal") is not yet true here and was **not** flipped: `saveConsultant`/`saveContacts`/`saveBimProjects` still write straight to the published tables, exactly as before. Cutting that over to a staging-only flow would need an internal Accept action that copies `asc_after` back into the live record on Accept — that's part of S7, which is internal-only (`CONSULTANT-PORTAL.md`: external scope is E1–E4, internal S1–S15 are separate) and out of this repository. Doing so now, without that Accept flow existing anywhere, would silently stop submitted data from ever reaching `asc_consultant`. Every `recordPortalSubmissions` call is wrapped so a failure here never breaks the existing, tested write path.
- [x] Automated test: `tests/portal-submission.test.cjs` (added to `npm run check`) covers the pure tab-slicing logic (`tabSnapshot`) against both the live payload shape and the `existingRecord` shape, plus the null/first-time-consultant case. The network-dependent half (`findDraftSubmissionId`/`saveTabSubmission`) can only be exercised live, the same limitation every other function in `services.js` already has (no browser tool available in this session).

### Step 5 — Before-snapshot capture

- [x] **Interim only, explicitly not the real requirement.** `recordPortalSubmissions` stamps `asc_before` from `existingRecord` — the live values already loaded client-side at page-load time (`loadExistingRecordSync`), sliced per tab the same way as `asc_after`. This is exactly the client-side approach this step warns against: not atomic with row creation, and tamperable in principle (though bounded in practice — the browser can only submit values it already legitimately read). A real fix needs a Dataverse plugin or Power Automate flow, and no plugin-registration project exists anywhere in this repository to build one — genuinely out of reach this session, not skipped by choice.
- [x] **2026-10-07: deliberately staying client-side, not deferred/forgotten.** Reconsidered as part of the automation spec handoff (`docs/portal-submission-automation-spec.md` Part B) — a no-code classic workflow is a poor fit for building the nested per-tab JSON this needs (loops across `asc_consultant`/`asc_contact`/`asc_bimproject`), and a real plugin still isn't buildable here. Recommendation given to whoever builds the rest of the automation: leave as-is unless a .NET-capable environment becomes available for a real plugin.

### Step 6 — S7 Accept/Reject (copies `asc_after` into the live record)

- [ ] **Not built here.** 2026-10-07: confirmed with the project owner the review screen is a separate app, not part of this Power Pages site — this repository does not own any UI for it. The Dataverse-side automation (the actual "copy `asc_after` back into `asc_consultant`/related tables on Accept, require a reason on Reject" logic) still needs building by whoever has Power Automate/classic-workflow access — full spec with exact field mappings and known blockers (Offices, Project references, Attachments all still can't be written live, same gaps the portal's own direct writes already hit): `docs/portal-submission-automation-spec.md` Parts A, C, D.
- [ ] Until Part C above exists and is live, the direct writes in `saveConsultant`/`saveContacts`/`saveBimProjects`/`saveConsultantReferences` (`services.js`) must stay as the only path data reaches the live record — do not remove them, or every submission gets silently stranded in the staging table with no way to reach `asc_consultant`.

## Open decisions

- [x] Option A vs B for Step 4: Option A, done in JS against the Web API (see above) rather than Liquid/FetchXML, matching this portal's actual architecture.
- [x] Schema gap (Step 0) was already confirmed resolved before this pass (see the section above).
- [x] **2026-10-07, confirmed with the project owner:** keep Global Table Permission scope (no new lookup to native Contact) — the write-lock (Step 2) is the real security boundary instead.
- [x] **2026-10-07, confirmed with the project owner:** the S7 review/Accept-Reject screen is a separate app, not built in this repository. This repo's remaining job is to keep `asc_portalsubmission`'s schema/data correct and hand off a precise automation spec — done, see `docs/portal-submission-automation-spec.md`.
- [x] **2026-10-07, confirmed with the project owner:** Attachments staging stays metadata-only (file bytes still blocked by the pre-existing, unrelated `asc_attachment.asc_file` gap — see `backend/README.md`). Not revisited until that's resolved.
- [ ] Server-side write-lock (Step 2) and the Accept/Reject automation (Step 6) both need a Dataverse plugin or Power Automate/classic-workflow build — this repository/session can't build either (no .NET SDK, no designer GUI access). Spec handed off in `docs/portal-submission-automation-spec.md` for whoever has that access.
