# Ascentis consultant portal maintenance guide

Start with `PROJECT_MEMORY.md` for the current checklist, decisions, outstanding work and deployment status. It is the persistent project handoff for future sessions.

## Edit sources, then build

Edit `src/portal/`. Root and English Home assets, the Consultant portal web template and `preview.html` are generated; direct edits to them will be overwritten.

| Change | Source |
| --- | --- |
| Header and progress navigation | `src/portal/shell.html` |
| Screen copy and static Identity controls | `src/portal/views/` |
| Structured form fields, conditions, lists and limits | `src/portal/form-schema.json` |
| Identity reference choices and screen order | `src/portal/config.json` |
| Colours, width and responsive layout | `src/portal/styles/` |
| Field controls, themed dropdowns (`enhanceSelect`), floating menus (`placeMenu`), the themed confirm/notice modal (`portalDialog`) and multi-select widgets | `src/portal/scripts/form-fields.js` |
| Profile tables, record popups (add / edit / discard / remove), files, validation and payload collection | `src/portal/scripts/profile.js` |
| Pure calculation and validation rules | `src/portal/scripts/rules.js` |
| Future live save/submit implementation | `src/portal/scripts/services.js` |
| Dataverse scalar mappings and conversion | `src/portal/dataverse-map.json`, `src/portal/scripts/dataverse-mapping.js` |
| Illustrative sample data | `src/portal/scripts/preview.js` |
| Standalone Power Pages document | `src/portal/document.html` |

Script fragments are assembled in the order in `scripts/build-portal.cjs` and share a private initializer scope. They are not independent ES modules. Adding a fragment requires registering it in the build's script list. Add structured fields in the schema rather than copying HTML into several files.

## UI conventions (do not undo)

- **Dropdowns**: on devices with a mouse every single-select is upgraded by `enhanceSelect()` to a themed button + listbox. The native `<select>` stays in the DOM (visually hidden) as the source of truth for the value, validation and the Dataverse mapping; phones/tablets keep the native picker. Labels must point at the visible button (`label.htmlFor`), never wrap or target the hidden select - otherwise a label click opens the browser's own list at the wrong place. Do not wrap a select in a `<label>`.
- **Floating menus** (dropdown lists, multi-picker checklists) are `position:fixed` and placed by `placeMenu()`, so scrolling popups and panels never clip them.
- **Never use `window.confirm` / `window.alert`**: use `portalDialog({...})` (themed modal; the browser test asserts no native dialog is raised).
- **Record popups** (project, BIM project, contact, office, shareholder, operator approval): title + close (x), fields, sticky action bar. A *new* record shows Cancel + "Add <name>" (x/Cancel/Esc discard it, asking first if something was typed); an *existing* record shows Remove + "Save <name>" (x just closes); locked tabs are view-only ("Close"). Choice lists inside a popup are inline checkboxes.
- **Tabs** lock when their latest submission is Submitted, Accepted or Rejected (`isLockedTabStatus`); only Draft/Seeded stay editable. Delete (trash) icons and fields in locked tabs are inert.
- No automatic "Maximum N characters." hint; `maxlength` still enforces limits.

## Build and checks

Node.js 20 or newer is required. The normal build and unit checks need no downloaded packages.

```powershell
npm.cmd run build
npm.cmd run check
```

`npm.cmd` avoids PowerShell script execution-policy issues. `node build-preview.cjs` remains a compatibility shortcut. Paths resolve from the scripts, so the build is independent of the terminal's working directory.

The build writes the main and English Home HTML/CSS/JavaScript, the full Consultant portal web template and the standalone preview. It validates JavaScript syntax and explicitly replaces known Liquid expressions for the preview. The check command also detects stale generated files, broken accessibility references, preview leakage, missing standalone assets and validation-rule regressions.

For interaction or layout changes, install the pinned development dependency and run the browser suite. It uses the installed Microsoft Edge browser; no Playwright browser download is needed.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run check:browser
```

Alternatively, set `ASCENTIS_PLAYWRIGHT_PATH` to an existing Playwright module directory. The browser suite prints its temporary screenshot directory. It covers all tabs, calculations, conditional requirements, modal editors, region eligibility, leaders/contact validation, files, row limits, preview saving/confirmation, mobile overflow and the actual generated standalone template. It substitutes Liquid locally; it does not verify an authenticated Power Pages response or write to Dataverse.

Open `preview.html` in a browser to inspect the screens. Select Update profile in the bottom-right selector, then use the eight tabs. Table rows and office cards open editors; contact names open modal editors. New data remains in the current browser session. The labelled preview's sample attachments are metadata only; real selected files can be downloaded locally but are not uploaded. The preview draft snapshot disappears on reload.

## Dataverse boundary

The supplied schema, initial migration and remaining integration requirements are tracked in `backend/README.md`. `dataverseMapping.prepare(payload)` converts entered scalars to the schema's types and keeps reference labels/temporary IDs separate. It prepares a review-service DTO; do not send it as an entity PATCH or use it to bypass review.

`collectProfile()` in `profile.js` prepares `schemaVersion`, `identity`, `sections`, `collections`, `revenueByRegion` and `files`. Record IDs are temporary local keys; values are strings/arrays until explicitly mapped and converted. Files are a separate list containing browser File objects, document type and optional local project ID. Do not send this object unchanged as a Dataverse table payload.

`portalService.saveDraft(payload)` and `portalService.submit(payload)` in `services.js` are the asynchronous integration boundary. Live implementations currently reject with a clear unavailable-service message. The preview adapter keeps a session-memory draft and returns an explicitly marked example submission response. The submit response can provide `nextRevalidationDate`; absent a confirmed date, the UI shows Available after review.

When integrating: load only the authenticated consultant's permitted data, map canonical IDs, validate on the trusted service side, upload files and await completion, enforce ownership and concurrency, and return success only after durable persistence. Use per-tab metadata and separate submitted/published data as described in `docs/dataverse-integration.md`. Pending operations disable the action buttons and show status; failures retain entered values. Never put credentials in source files.

## Standalone document requirement

The page template intentionally uses `adx_usewebsiteheaderandfooter: false`. Therefore `src/portal/document.html` owns the complete HTML document, viewport and explicit compiled CSS/JavaScript. Reducing it to page copy alone caused the earlier unstyled/blank live screen. Preserve this build output and its regression test.

## Deployment

Targets (all in tenant `6a2777d4-...`, website id `1f7436b8-27ab-4544-955e-b821ee733617`, enhanced data model):

| Environment | Dataverse URL | Portal |
| --- | --- | --- |
| Development | `https://org84e19bfd.crm8.dynamics.com` | ascentis.powerappsportals.com |
| Testing | `https://org3db46cb7.crm8.dynamics.com` | test-ascentis.powerappsportals.com |
| Production | `https://org7fc54203.crm8.dynamics.com` | consultant.powerappsportals.com |

**Always deploy with `scripts/deploy-clean.ps1`, never with `pac pages upload --path .` from the repo root.** The root upload also picks up the old exported sites under `backend/exports/live-pages-check-*`, whose stale `sitesetting.yml` silently reverted Production settings (open registration, Web API field lists, caption) on every upload. The script copies only the site folders to a temporary directory (without the unused `GREY-(1)` theme file that blocks uploads) and uploads from there:

```powershell
npm.cmd run build
npm.cmd run check
npm.cmd run check:browser
powershell -ExecutionPolicy Bypass -File scriptsdeploy-clean.ps1 -Environment https://org7fc54203.crm8.dynamics.com
```

After every upload: do a fresh read-only `pac pages download` into a NEW empty folder and confirm the code files match the repo, `OpenRegistrationEnabled` is `false`, no `Webapi/*` setting differs from the repo, and the `asc_invitation` Web API is still disabled; then Clear cache in Power Pages Management and test in an incognito window. The repo `sitesetting.yml` is applied on every upload, so a setting that must stay a certain way in an environment has to have that value in the repo file.

`pac pages upload` can fail part-way with a `System.TimeoutException` when Dataverse is busy (a solution import or schema change); nothing is lost - wait and re-run. Do not upload `preview.html` as a live page or enable `data-preview` on the deployed Home page. Keep existing YAML record IDs stable. Table permissions that come from the managed solution cannot be deleted (only deactivated).

Commit both source and generated files when using version control. Roll back application code by rebuilding a known-good revision and uploading with the same script. Schema/data migrations require a separate rollback plan. Update `PROJECT_MEMORY.md` after testing or deployment.

## Persistence model (decided 23 Nov 2026)
- **Save draft / Submit write only to `asc_portalsubmission` (one row per tab: `asc_after` JSON, `asc_before`, status Draft/Submitted) and `asc_auditlog`.** The portal no longer writes the live tables (consultant, contacts, shareholders, offices, projects, operator approvals, BIM, child tables, junctions); the reviewer app moves accepted data there. The old writer functions in `services.js` (`saveConsultant`, `saveContacts`, `saveProjects`, ...) are intentionally not called by `saveAll`.
- **Files are the exception** (a file cannot live in JSON): each upload is an `asc_attachment` row (+ `asc_attachedfile`), tied to the consultant, Draft until Submit. Project files are named `<project name> | <file name>` in `asc_name` (no project lookup, because the portal creates no project row); the project popup matches them by that name. Removing a saved file deactivates the row (`statecode=1`).
- The confidentiality acknowledgement is stored in the Identity submission JSON (`confidentialityAcknowledgedBy/On`) and the audit log, not on `asc_consultant`.
- The form is rebuilt from the latest `asc_portalsubmission` row per tab; live tables are still READ (for `asc_before`).
