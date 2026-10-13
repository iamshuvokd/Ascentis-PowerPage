# Dataverse Phase 1 implementation

Target: **CDB Development**, `https://org84e19bfd.crm8.dynamics.com`.
Existing solution: **ConsultantDatabaseSolution**, publisher **Ascentis**, prefix **asc**.

## Sources and repeatable build

- `schema/phase-1.dbml`: unchanged user-supplied design.
- `build-model.cjs`: parses that design and records the additive screen requirements.
- `schema/model.json`: generated table/column/relationship manifest.
- `schema/file-column.request.json`: prepared follow-up Web API request (not executed); send only through an authenticated administrative Dataverse client after checking whether the column exists.
- `snapshots/ConsultantDatabaseSolution-before.zip`: backup taken before this work.
- `Build-Solution.ps1`: builds the initial additive unmanaged solution package from that backup.
- `../src/portal/dataverse-map.json`: central frontend-to-column mapping.
- `../src/portal/scripts/dataverse-mapping.js`: typed review-service payload conversion.

```powershell
node backend/build-model.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File backend/Build-Solution.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File backend/Test-Solution.ps1
```

The initial package includes 25 tables (eight already existed), scalar columns, lookup relationships, and ten N:N relationships. It excludes the file column and alternate keys; see the remaining work below. It contains no business data, reference-list seed rows, credentials, security roles, plugins or flows. Deployment status is recorded in `PROJECT_MEMORY.md`; generating a ZIP does not mean it was imported.

After importing, export the solution again and run `Test-Solution.ps1 -Directory <expanded-export-directory>` to verify that the expected table/column/relationship names reached Dataverse. This checks schema presence, not business-rule enforcement or end-to-end storage.

This is an **initial migration**, not an ongoing synchronization command. For future schema changes, export a fresh backup and produce a new additive migration. Do not overwrite subsequent manual customizations using this old baseline. Do not delete/recreate tables to reconcile naming or ownership.

## Explicit mapping decisions

| Design | Implementation |
| --- | --- |
| `consultant`, `office`, etc. | Custom logical tables `asc_consultant`, `asc_office`, etc. |
| Custom business `contact` | `asc_contact`, labelled Consultant Contact; separate from native `contact`, which authenticates Power Pages users. |
| Missing primary display columns | Add `asc_name` to tables that lack it; trusted service must populate display names. |
| `id uuid` | Platform primary ID (`asc_<table>id`); do not add a second generic `id`. |
| `varchar` status/category fields | Text as supplied; controlled values still require trusted validation. They are not silently converted to Choice integers. |
| Decimal financial amounts | Decimal values interpreted as USD; no selectable currency. No exchange-rate conversion is implemented. |
| Calculated fields in notes | Storage columns only; their calculation logic is still pending. |
| Reference table ownership | Preserve the eight existing UserOwned tables. DBML calls for OrganizationOwned; do not recreate them. Set appropriate internal role privileges instead. |
| City/status and Europe revenue share | Add `asc_office.asc_city`, `asc_office.asc_status`, `asc_consultant.asc_revenuepct_europe`. |
| Consultant BIM disciplines | Add `asc_consultant_bimdiscipline` N:N; retain the supplied per-project discipline relationship. |
| Office/project countries | Frontend uses ISO alpha-2 values in the supplied text columns. |
| `asc_status` / `asc_statuscomment` on Consultant | Field security enabled in metadata; reviewer/admin field-security profiles still need configuring. |

## Frontend integration status

Forms now collect required office country and address, require contact type and BIM project fields, use integer GFA as specified, offer per-BIM-project disciplines, and use the five schema regions. The central mapping converts booleans and amounts, rejects malformed values, and excludes privileged consultant status/acknowledgement/reviewer fields.

`dataverseMapping.prepare(payload)` produces a **review-service DTO**, not a Dataverse entity PATCH. It intentionally retains reference labels and temporary child IDs separately; a trusted service must resolve canonical IDs and validate access. It is prepared and tested but not connected to a live write transport. Files remain separate browser File objects, not JSON strings.

## URS alignment — 12 new tables added (drafted, not deployed)

Local schema draft only — `schema/phase-1.dbml` and `schema/model.json` updated to 38 tables, package rebuilt and `Test-Solution.ps1` passed. **Nothing has been imported/published to Dataverse.** All new tables use the same `asc_` prefix and land in the same `ConsultantDatabaseSolution`, matching the existing tables' convention. No table was renamed.

New tables (all additive; the equivalent flattened columns on `consultant`/`office`/`rating`/`kamprofile` are left in place, not removed, pending a later cleanup decision):

| Table | Display name | Notes |
| --- | --- | --- |
| `asc_consultanttabupdate` | Consultant Tab Update | Per-tab last-updated tracking (URS §6.2) |
| `asc_financialinformation` | Financial Information | Per-year financial record, enables history (URS §6.6) |
| `asc_financialrevenueregion` | Financial Revenue by Region | Open-ended revenue-by-region rows (URS §6.6) |
| `asc_legalinformation` | Legal Information | 1:1 legal child table (URS §6.7) |
| `asc_biminformation` | BIM Information | 1:1 BIM capability table (URS §6.9) |
| `asc_sustainabilityesg` | Sustainability & ESG | 1:1 ESG table (URS §6.10) |
| `asc_officeleader` | Office Leader | Flexible named-leader child (URS §6.3), alongside existing `office.asc_leader1/2/3_id` |
| `asc_ratingscore` | Rating Score | Per-criterion score, needs `asc_ratingcriterion` seeded first (URS §6.11) |
| `asc_kamdriverrating` | KAM Driver Rating | Per-driver rating, needs `asc_kamdriver` seeded first (URS §6.13); CONFIDENTIAL |
| `asc_country` | Country | Implied by URS §6.3 "Country Lk"; existing free-text country columns left unconverted |
| `asc_ratingcriterion` | Rating Criterion | Admin-maintainable list of the 7 rating criteria — URS treats these as fixed, not one of the 8 §6.15 lists; confirm intent before relying on it |
| `asc_kamdriver` | KAM Driver | Admin-maintainable list of the 5 KAM drivers — same caveat as above |

**User decision:** create a custom `asc_appuser` table (Display "App User") rather than relying solely on native `systemuser`. Added: `asc_name`, `asc_email` (unique), `asc_role`, `asc_systemuser_id` (lookup to `systemuser`, links the profile row to the native account). The existing `asc_leadreviewer_id`, `asc_kam_id`, `asc_rater_id`, `asc_reviewedby_id` lookups on other tables still point at `systemuser` directly, not at `asc_appuser` — repointing them is a separate future decision, not done here.

## URS alignment — engagementcontact and attachment (drafted, not deployed)

Local schema draft only — `schema/phase-1.dbml` and `schema/model.json` updated, package rebuilt and `Test-Solution.ps1` passed (26 tables, 9 N:N). **Nothing has been imported/published to Dataverse.** No table has been renamed; where the URS-aligned design required a shape a plain N:N relationship cannot hold, the old relationship is deleted and a new table created — never renamed in place.

- **New table `asc_engagementcontact`** (not a rename): replaces the `asc_engagement_contact` N:N relationship, which is being deleted. A native N:N cannot carry the `Role` attribute required by URS §6.11 ("Consultant contacts & roles"), so this becomes a real table with `asc_engagement_id`, `asc_contact_id` and `asc_role`. **Before deleting the live `asc_engagement_contact` relationship**, export its existing associations (if any) and backfill `asc_engagementcontact` from that export — deleting the relationship first would lose those links permanently.
- **`asc_attachment` — additive columns only, table itself is unchanged**: added `asc_projectreference_id` (forward link to the owning project reference, per URS §6.14/§6.8), `asc_filename`, `asc_filesizemb`, `asc_uploadedby_id` (lookup to `systemuser`), `asc_uploadedon`. The existing `projectreference.asc_attachment_id` reverse link is left in place and flagged deprecated, not removed — removing it is a separate, later decision once nothing depends on it.

Remaining to execute (requires explicit go-ahead — touches the live tenant):
1. Export current solution as a fresh backup. **Done** — `backend/snapshots/ConsultantDatabaseSolution-before-14table-import.zip` (16 Sept 2026).
2. Import `backend/ConsultantDatabaseSolution-newtables-1.1.0.0.zip` (14 new tables only — see "Incremental package" note below). This adds `asc_engagementcontact` and 13 other new tables. It does **not** add the new `asc_attachment` columns or touch `asc_engagement_contact` — those are still in the full 39-table package, not the incremental one; import them separately once the 17 already-live tables' forms/views risk (below) is resolved, or via manual column-add in the maker portal.
3. Export existing `asc_engagement_contact` associations, if any exist in CDB Development.
4. Delete the old `asc_engagement_contact` N:N relationship.
5. Backfill `asc_engagementcontact` rows from the step-3 export.
6. Publish, export fresh, and rerun `Test-Solution.ps1` against the fresh export.

### Incremental package — why it exists

`backend/Build-Solution.ps1`'s baseline snapshot (`snapshots/before/`) predates the 17 custom tables already live since 10 Sept 2026 — it only contains the original 8 reference tables. Building the *full* 39-table package therefore reconstructs those 17 already-live tables from scratch and strips their `FormXml`/`SavedQueries`/`RibbonDiffXml` (correct behaviour for a first-time create, not safe to re-import onto tables that already have real live forms/views the portal depends on). Importing that full package risked resetting those. `Build-Solution.ps1 -NewTablesOnly` and `Test-Solution.ps1 -NewTablesOnly` produce/validate `ConsultantDatabaseSolution-newtables-1.1.0.0.zip` instead — verified to contain exactly the 14 new tables and nothing else (no carried-over entities, no FormXml/SavedQueries/RibbonDiffXml anywhere in the package). Use `-NewTablesOnly` for any import until the full-package path is made safe (e.g. by refreshing the baseline snapshot to the current live 25-table state first).

## Frontend↔Dataverse mapping refresh — 20 September 2026

The user manually restructured several already-live tables (converting free-text fields to lookups/picklists, renaming a column, removing a few columns). `src/portal/dataverse-map.json`/`dataverse-mapping.js` were stale against that. Updated to match live reality, staying inside the existing "review-service DTO, not a live PATCH" architecture (`docs/dataverse-integration.md`, `CONSULTANT-PORTAL.md`) — no new live writes were enabled or attempted.

**Moved from scalar `fields` to the existing per-row `references` resolution path** (same pattern already used for region/disciplines/leaders — label carried in the DTO, a trusted service resolves the GUID later, never written as a raw string):
- `contacts.region` → `asc_contact.asc_regionid`
- `offices.country` → `asc_office.asc_countryid`
- `projects.country` → `asc_projectreference.asc_countryid`
- `projects.type` → `asc_projectreference.asc_type`, now a lookup to `asc_ProjectType` — **BLOCKED**: that table is still an empty placeholder (only the default field), so labels can't resolve to anything yet.

**Column renamed to match an already-live rename** (documentation-only correction in `backend/schema/phase-1.dbml`/`model.json` — no live Dataverse change made here): `projectreference.status` now targets `asc_projectstatus`, not `asc_status`.

**Flagged as unresolved live gaps, kept mapped (not deleted) so the URS/FS requirement isn't silently dropped** — see `dataverse-map.json`'s `unresolvedLiveGaps` block:
- `offices.city` / `offices.status` — columns no longer exist live. `asc_office.asc_status` backs the region-eligibility business rule (active office); its removal is a functional regression, not just cosmetic.
- `offices.leaders` — frontend still collects up to 3 existing **Contact** records as leaders (per URS §6.3 and `form-schema.json`'s `leaders: 3` limit); the old `asc_leader1_id/2_id/3_id` lookups are gone, and the new live `asc_office.asc_officeleaderid` points at the separate `asc_officeleader` table (its own name/position/email/phone fields, not linked to Contact, and singular not up-to-three) — doesn't match either URS or the current frontend. Not wired to anything; needs a decision.
- `bimProjects.lod` — column no longer exists live, required by URS §6.9.

No table or column was removed or deleted, live or local, in this pass.

## Live write path — Consultant, Contact, BIM Project, and discipline/sector/region, 24 September 2026

`src/portal/scripts/services.js`'s `saveDraft`/`submit` call the Dataverse Web API directly using the documented no-`shell.js` token pattern (`fetch('/_layout/tokenhtml')` → parse the `__RequestVerificationToken` input → send it as a header on every write). Confirmed working end-to-end live (a real `asc_consultant` row, created from an actual portal submission, was verified in the maker portal). This is an explicit interim implementation, not the final architecture. What it writes:

- `asc_consultant` — its own scalar fields (identity/financial/legal/BIM/sustainability + revenue-by-region).
- `asc_contact` rows (collection), bound to the consultant; `asc_contacttype`/`asc_status` converted from frontend text to the live picklist option values; `asc_regionid` resolved by name if provided (optional).
- `asc_bimproject` rows (collection), bound to the consultant; `asc_lod` is deliberately stripped before sending — see below.
- Discipline/Sector/Region **N:N associations** on the consultant, via label → GUID resolution (`resolveReferenceId`) then a `$ref` POST.

**Still NOT written — genuinely blocked, not a code gap:**
- **Offices** — `asc_office.asc_officeleaderid` is a required lookup that doesn't match what the frontend collects (up to 3 existing Contacts). Every create would fail on this required field regardless of code.
- **Project references** — `asc_projectreference.asc_type` is a required lookup to `asc_ProjectType`, which has zero rows. Nothing to link to.
- **Attachments** — `asc_attachment.asc_file` (file column) still isn't provisioned.
- **Firm type** — same resolution approach as discipline/sector/region would work, just not implemented in this pass.
- **No draft/review workflow** — writes go straight to the published `asc_consultant` record; there's no staging table, no S7 accept/reject. `portalsubmission` exists in the schema but isn't wired to this.

**Required site settings** — Power Pages' Web API needs explicit opt-in per table *and per field*, separate from Table Permissions. Getting this list complete took several iterations of live 403 errors before it was right — the lesson learned: **any attribute referenced anywhere in a write body (including the base name behind an `@odata.bind`, e.g. `asc_consultant_id`) and any attribute used in a `$select`/`$filter` on a read must be listed, or the API rejects the whole call.** The final, audited list:

| Setting | Value |
|---|---|
| `Webapi/asc_consultant/enabled` | `true` |
| `Webapi/asc_consultant/fields` | `asc_name,asc_website,asc_akaname,asc_effectiveyear,asc_fiscalformat,asc_backloginhand,asc_revenuen1,asc_revenuen2,asc_revenuen3,asc_indemnified,asc_indemnitydetails,asc_litigation,asc_litigationdetails,asc_holdspi,asc_piperoccurrence,asc_piaggregate,asc_bimcapability,asc_bimoperatorcount,asc_esgcert,asc_esgcertdetails,asc_esgreporting,asc_esgframework,asc_accreditedcount,asc_esgqa,asc_esgqadetails,asc_revenuepct_middleeast,asc_revenuepct_southasia,asc_revenuepct_europe,asc_revenuepct_africa,asc_revenuepct_other` |
| `Webapi/asc_contact/enabled` | `true` |
| `Webapi/asc_contact/fields` | `asc_name,asc_firstname,asc_lastname,asc_workemail,asc_phone,asc_jobtitle,asc_contacttype,asc_status,asc_regionid,asc_consultant_id` |
| `Webapi/asc_bimproject/enabled` | `true` |
| `Webapi/asc_bimproject/fields` | `asc_name,asc_location,asc_gfa,asc_consultant_id` |
| `Webapi/asc_discipline/enabled` | `true` |
| `Webapi/asc_discipline/fields` | `asc_name,asc_disciplineid` |
| `Webapi/asc_sector/enabled` | `true` |
| `Webapi/asc_sector/fields` | `asc_name,asc_sectorid` |
| `Webapi/asc_region/enabled` | `true` |
| `Webapi/asc_region/fields` | `asc_name,asc_regionid` |

**Table Permissions**, beyond plain Read/Create/Update — Dataverse's security model requires **Append** on the *parent* (Consultant) and **Append To** on *every child/related table* for any bind/association, 1:N or N:N:
- Consultant: Read, Create, Update, **Append**
- Contact, BIM Project: Read, Create, Update, **Append To**
- Discipline, Sector, Region: Read, **Append To** (no Create/Update — these are read-only reference lookups)

- Created consultant ID is cached in `localStorage` (`ascentisLiveConsultantId`) so repeat saves become updates (`PATCH`) instead of duplicate creates — purely a client-side convenience, not real record ownership/association; a signed-in user still isn't tied server-side to "their" Consultant record.
- `npm run build` + `npm run check`: all 11 checks pass with this change.

## Required before enabling live writes

- [ ] Add `asc_attachment.asc_file` using `FileAttributeMetadata`, max size 24,415 KB (25,000,960 bytes); enforce the exact UI limit of 25,000,000 bytes in the trusted upload service. Do not substitute a text/base64 column. Test upload/download over 16 MB and partial failure cleanup.
- [ ] Create and verify alternate keys for contact email, invitation token and KAM consultant (1:1). Native lookup relationships alone do not enforce uniqueness.
- [ ] Configure external email-code identity provider and associate native authenticated contacts with authorized consultants. Never infer access from submitted email/domain or custom business contact ID.
- [ ] Add draft/bundle storage, actor/version/concurrency fields and staged attachments. `portalsubmission` has no Draft state in the supplied design.
- [ ] Build trusted acknowledgement/PDF, draft, submit and reviewer accept/reject operations. Bind actor to authenticated identity; enforce acknowledgement before entry, per-tab metadata, row limits, region eligibility, conditional fields, attachment XOR parent and delete-own rules.
- [ ] Restrict direct writes to published consultant records. External changes must remain pending until accepted. Enforce status transitions on the server; disabling a UI control is insufficient.
- [ ] Configure narrowly scoped table/column permissions, web roles and explicit Web API field lists. No portal access to notes, engagements, ratings, KAM records or invitation tokens.
- [ ] Add reviewer/admin internal roles, field security, Access Team behavior, audit configuration, calculations, per-tab validation and revalidation scheduling.
- [ ] Seed approved reference lists (illustrative screenshot values are not authoritative production reference data).
- [ ] Implement authorized loading, lookup ID resolution, draft reload and conflict handling in `services.js`; only then activate its live transport.
- [ ] Verify with two different consultant identities: cross-firm access denied, rejected writes retain form state, repeated submission idempotent, accepted updates reach published records, attachment ownership enforced.

Schema creation alone does not implement these requirements. Live save, submission and acknowledgement must continue to report unavailable until the corresponding trusted operations exist.

## Microsoft references

- [Solution customization XML schema](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/customization-solutions-file-schema)
- [Create and update table definitions](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-update-entity-definitions-using-web-api)
- [Power Pages Web API](https://learn.microsoft.com/en-us/power-pages/configure/web-api-overview)
- [File columns in Power Pages](https://learn.microsoft.com/en-us/power-pages/configure/file-column)
- [Entra External ID for Power Pages](https://learn.microsoft.com/en-us/power-pages/security/authentication/entra-external-id)

The standalone page owns its full document because the standard website header/footer is disabled. Preserve explicit CSS/JS loading. Before adding a Web API client, integrate and verify the supported session/CSRF-token mechanism; the standard `shell.getTokenDeferred` sample cannot be assumed available in this custom wrapper.
