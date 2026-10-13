# Portal Submission automation — build spec for Power Automate / classic workflows

For whoever builds the automation on `asc_portalsubmission` next (the review/Accept-Reject app is being
built separately, outside this repository — this doc only covers the Dataverse-side automation this
table needs). Written 2026-10-07 after confirming every value below against a fresh `pac solution export`
of `ConsultantDatabaseSolution` — nothing here is guessed. If you change any of the option sets or columns
mentioned, re-export and update this doc (and `src/portal/scripts/services.js`'s matching constants —
search for `PORTAL_SUBMISSION_STATUS_VALUES` / `PORTAL_SUBMISSION_TAB_VALUES`).

No Dataverse plugin project exists in this repository and the machine this portal's code is edited on has
no .NET SDK, so a real synchronous C# plugin can't be built from there. Everything below is scoped to
**no-code Dataverse tooling**: classic ("real-time") workflows for anything that must run synchronously and
be able to reject a save, and Power Automate cloud flows for anything async. This repo already has working
precedent for cloud flows — see `ASC-Ratingapproved-updateengagementandconsultant` in the solution, which
fires on `asc_rating` status changes and updates Engagement/Consultant. Use it as a reference for connector
choice, trigger shape, and naming.

## Confirmed live facts (don't re-derive, don't guess)

**Table:** `asc_portalsubmission` (entity set `asc_portalsubmissions`, primary key `asc_portalsubmissionid`)

**`asc_status`** — Choice, global option set `asc_powerpagestatuschoice`:
| Value | Label |
|---|---|
| 751050000 | Draft |
| 751050001 | Submited *(sic — live typo, not corrected)* |
| 751050002 | Accepted |
| 751050003 | Rejected |

**`asc_tab`** — Choice, global option set `asc_consultantprofiletabchoice`. This option set is shared with
something broader than this portal (12 options; the portal only uses 8). The portal's own tab names don't
all match the option labels — use the **live option value**, not the label, when filtering/branching:

| Value | Live label | Portal tab | `asc_after` JSON shape |
|---|---|---|---|
| 751050000 | Overview | Identity | flat object: `{firmName, website, firmType, alias, disciplines:[], sectors:[], regions:[]}` |
| 751050001 | Financial | Financial | flat object, see table below |
| 751050002 | Legal | Legal | flat object, see table below |
| 751050003 | Offices & contacts | Offices & contacts | `{offices:[...], contacts:[...]}` |
| 751050004 | Project references | Project references | array of row objects |
| 751050005 | Operator approvals | *(not a portal tab — never written by the portal)* | — |
| 751050006 | BIM | BIM | `{bim:{...}, bimProjects:[...]}` |
| 751050007 | Sustainability & ESG | Sustainability | flat object, see table below |
| 751050008 | Engagements & Ratings | *(not a portal tab)* | — |
| 751050009 | Notes | *(not a portal tab)* | — |
| 751050010 | Attachments | Attachments | array of `{documentType, projectId, name}` — **metadata only, no file bytes** (see Known gaps below) |
| 751050011 | KAM | *(not a portal tab)* | — |

**Other columns actually in use:**
- `asc_consultant_id` (lookup → `asc_consultant`, required) — which consultant this row belongs to.
- `asc_before` / `asc_after` (ntext, JSON) — snapshots; shapes above, exactly as produced by
  `tabSnapshot()` in `src/portal/scripts/services.js`.
- `asc_isreview` (bit, required) — always `false` from the portal. Purpose beyond that isn't defined by
  the portal side; leave it alone unless you're deliberately repurposing it.
- `asc_submittedon` (datetime, optional) — stamped by the portal with the client's UTC time when Status
  moves to Submitted. Not authoritative/tamper-proof (client-set) — if you need a trustworthy submitted
  timestamp, prefer `asc_after`'s row `ModifiedOn` or add your own server-stamped field instead of trusting
  this one for anything security-sensitive.
- `asc_submittedby_id` (lookup → `asc_contact`) — **never written by the portal.** Deliberately not wired
  up; see `docs/portal-submission-configuration.md` Step 2 for why (the lookup targets this project's
  custom business-contact table, not native Contact, so it can't back a Contact-scope Table Permission).
- `asc_reviewedby_id` (lookup → `systemuser`), `asc_revieweddate` (datetime), `asc_rejectreason` (ntext,
  required only when rejecting) — not written by anything yet. These are exactly what your Accept/Reject
  automation should set.

**Table Permission:** Global scope (not per-owner), Create/Read/Write/AppendTo, assigned to "Authenticated
Users" and "Consultant Primary Contact" web roles. This was a deliberate decision (confirmed with the
project owner 2026-10-07) — Contact scope can't resolve against `asc_submittedby_id` (see above), and
rather than add a new lookup column just to enable it, the write-lock below (Part A) is meant to be the
real security boundary instead of table-permission scoping.

## Part A — Write-lock: reject any write once Status ≠ Draft

**Build as:** a classic ("real-time") Dataverse workflow on `asc_portalsubmission`, **Update** message,
**Pre-operation** stage, **synchronous**. Not a Power Automate cloud flow — cloud flows run async, after
the change has already committed, so they can't actually reject a save. A real-time workflow (or a plugin,
which isn't buildable here) is the only no-code-adjacent way to synchronously block a write.

**Logic:**
1. Read the **pre-image** value of `asc_status` (the value before this update, not the value being set).
2. If the pre-image status is NOT Draft (751050000):
   - **Exception needed for your own reviewer identity.** Whatever account/flow performs the Accept/Reject
     transition (Part C below) needs to still be able to write this row — add a condition that allows the
     update through when the calling user is your review automation's service account / application user
     (however Part C ends up authenticating), and blocks everyone else. Pin this down concretely once you
     know which identity Part C runs as; don't leave it as a blanket block or Accept/Reject will also fail.
   - Otherwise, throw an error (classic workflows support "Stop Workflow" with a custom error message) —
     this surfaces to the caller as a failed write, which is what blocks the portal's own update attempt.
3. **Reject-reason validation** (folds naturally into this same synchronous workflow, same trigger): if the
   *new* `asc_status` value being set is Rejected (751050003), require `asc_rejectreason` to be non-empty;
   stop the workflow with an error otherwise.

## Part B — Before-snapshot: capture `asc_before` server-side (optional — read the caveat first)

The documented gap (`docs/portal-submission-configuration.md` Step 5) is that `asc_before` is currently
stamped client-side from data the browser already has loaded — not atomic with row creation, not
tamper-proof. The theoretically correct fix is a server-side read on Create that ignores any
client-supplied `asc_before`.

**Caveat before you build this:** `asc_before`'s shape is a real per-tab JSON object (see the shape table
above) assembled from several source tables for some tabs (BIM pulls from `asc_consultant` *and*
`asc_bimproject`; Offices & contacts from `asc_office` *and* `asc_contact`). Classic workflows are a poor
fit for building nested JSON strings with loops over child records — this is realistically plugin/Custom
API territory, which this project can't build right now (no .NET SDK available). **Recommendation: leave
`asc_before` client-side as currently implemented and documented, rather than attempt a partial/fragile
no-code JSON-building workflow.** Revisit if/when a real plugin becomes buildable (e.g. a dev machine with
the .NET SDK becomes available).

## Part C — Accept: copy `asc_after` into the live record

**Build as:** a Power Automate cloud flow, same shape as `ASC-Ratingapproved-updateengagementandconsultant`.

**Trigger:** Dataverse connector, "When a row is added, modified, or deleted" on `asc_portalsubmission`,
filtered to `asc_status eq 751050002` (Accepted).

**Steps:**
1. Parse `asc_after` as JSON (the flow's native Parse JSON action). The schema depends on the row's
   `asc_tab` value — branch on it (switch/condition action) using the **numeric values** from the table
   above, not labels.
2. For the **object-shaped tabs** (Identity/Overview, Financial, Legal, Sustainability & ESG, and the
   `bim` half of the BIM tab) — these are simple, low-risk field copies straight onto `asc_consultant`.
   Exact JSON-key → column mapping (from `src/portal/dataverse-map.json`, the same source the portal's own
   write code uses — don't re-derive this by hand, read it from there if it changes):

   | Tab | JSON key → `asc_consultant` column |
   |---|---|
   | Identity (751050000) | `firmName`→`asc_name`, `website`→`asc_website`, `alias`→`asc_akaname`. `firmType`/`disciplines`/`sectors`/`regions` are label arrays/strings needing lookup resolution (see step 4) — don't write them as plain text. |
   | Financial (751050001) | `effectiveYear`→`asc_effectiveyear`, `yearFormat`→`asc_fiscalformat`, `backlog`→`asc_backloginhand`, `revenue1/2/3`→`asc_revenuen1/2/3` |
   | Legal (751050002) | `indemnified`→`asc_indemnified`, `indemnityDetails`→`asc_indemnitydetails`, `litigation`→`asc_litigation`, `litigationDetails`→`asc_litigationdetails`, `insured`→`asc_holdspi`, `perOccurrence`→`asc_piperoccurrence`, `aggregate`→`asc_piaggregate` |
   | Sustainability & ESG (751050007) | `certified`→`asc_esgcert`, `certificationDetails`→`asc_esgcertdetails`, `reporting`→`asc_esgreporting`, `frameworkDetails`→`asc_esgframework`, `professionals`→`asc_accreditedcount`, `qa`→`asc_esgqa`, `qaDetails`→`asc_esgqadetails` |
   | BIM (751050006), `bim` key only | `capability`→`asc_bimcapability`, `operators`→`asc_bimoperatorcount` |

   **Start with just these** — they're a straightforward Update action per tab, no loops, no lookups.

3. For the **array-shaped tabs** (Offices & contacts' `contacts` array, BIM's `bimProjects` array, Project
   references) — these need a loop (Apply to each) matching each row to an existing live record or creating
   a new one, mirroring what `saveContacts()`/`saveBimProjects()` already do in `services.js`. This is real
   integration work, not a one-line copy — treat as a separate phase after the object tabs above are
   working and tested. Field maps (same source, `dataverse-map.json`'s `collections`):
   - Contacts (`asc_contact`): `firstName`→`asc_firstname`, `lastName`→`asc_lastname`, `email`→`asc_workemail`, `phone`→`asc_phone`, `jobTitle`→`asc_jobtitle`, `contactType`→`asc_contacttype`, `status`→`asc_status`.
   - BIM Projects (`asc_bimproject`): `name`→`asc_name`, `location`→`asc_location`, `gfa`→`asc_gfa`. **Do not write `lod`** — `asc_bimproject.asc_lod` doesn't exist live (known gap, see `dataverse-map.json`'s `unresolvedLiveGaps`); sending it will fail the whole row.
   - Project references (`asc_projectreference`): **do not build this yet** — `asc_projectreference.asc_type` is a required lookup to `asc_ProjectType`, which the portal itself can't write to either (documented blocker in `services.js`'s own header comment). Wiring Accept for this tab before that's resolved will just fail every time.
   - Offices (the `offices` array inside the Offices & contacts tab): **do not build this yet either** — `asc_office.asc_officeleaderid` is a required lookup that doesn't match what the portal collects (see `dataverse-map.json`'s `unresolvedLiveGaps.offices.leaders`). Same category of blocker as Project references.
4. `firmType`/`disciplines`/`sectors`/`regions` (Identity tab) are label text, not IDs — resolve each label
   to a GUID the same way the portal does (`GET` the reference table filtered by `asc_name eq '<label>'`,
   use the returned ID) before binding. Disciplines/sectors/regions go into the dedicated junction tables
   (`asc_consultantdisciplines`/`asc_consultantsectorses`/`asc_consultantregionses`), not a direct lookup —
   see `services.js`'s `createConsultantJunctionRow` for the exact pattern (two `@odata.bind` fields:
   `asc_consultantid` and the target).
5. Attachments (751050010): nothing to apply yet — the portal only stages file **metadata**, not the file
   itself (see Known gaps below). Skip this tab in the Accept flow for now.
6. After applying whatever the tab needs, update the triggering `asc_portalsubmission` row itself:
   `asc_reviewedby_id` (the reviewer — however your review app identifies who clicked Accept),
   `asc_revieweddate` = `utcNow()`. `asc_status` is already Accepted (that's what triggered the flow) —
   don't re-set it, just don't overwrite it on the way through.

## Part D — Reject

Already covered by Part A's synchronous workflow (reject-reason validation runs the moment Status is set
to Rejected — no separate async flow needed for this one). If you want an additional action on Reject
(e.g. notify the consultant), add a second Power Automate flow triggered on `asc_status eq 751050003`, but
nothing in this table's write path requires it.

## Known gaps — don't try to work around these here

- **Attachments are metadata-only.** `asc_attachment.asc_file` (the actual file-storage column) was never
  provisioned — blocked since 2026-09-10 by an authentication issue getting the metadata request through
  (`backend/Add-FileColumn.ps1` is the prepared-but-unrun fix). Building real file staging on top of a
  table that can't store files yet would be cosmetic. Confirmed with the project owner 2026-10-07: leave
  Attachments staging as metadata-only until that's resolved, don't build around it here.
- **Offices and Project references can't be written live at all yet**, by the portal or by this automation
  — both blocked by pre-existing required-lookup gaps unrelated to this staging table (see step 3 above).
  Don't build Accept-flow support for these tabs before those are fixed; it'll just fail every time.
- **`asc_submittedby_id` is never populated.** Don't build logic that depends on it being set.

## When this is live, update

- `docs/portal-submission-configuration.md`'s checklist (Steps 2, 4, 5).
- `PROJECT_MEMORY.md`, per this project's own continuity convention (see `AGENTS.md`).
