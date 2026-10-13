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
| Field controls and multi-select widgets | `src/portal/scripts/form-fields.js` |
| Profile tables, editors, files, validation and payload collection | `src/portal/scripts/profile.js` |
| Pure calculation and validation rules | `src/portal/scripts/rules.js` |
| Future live save/submit implementation | `src/portal/scripts/services.js` |
| Dataverse scalar mappings and conversion | `src/portal/dataverse-map.json`, `src/portal/scripts/dataverse-mapping.js` |
| Illustrative sample data | `src/portal/scripts/preview.js` |
| Standalone Power Pages document | `src/portal/document.html` |

Script fragments are assembled in the order in `scripts/build-portal.cjs` and share a private initializer scope. They are not independent ES modules. Adding a fragment requires registering it in the build's script list. Add structured fields in the schema rather than copying HTML into several files.

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

Current target is CDB Development at `https://org84e19bfd.crm8.dynamics.com`, website `1f7436b8-27ab-4544-955e-b821ee733617`, enhanced data model. Live URL: https://ascentis.powerappsportals.com/.

After checks pass and deployment is requested, use the authenticated Power Platform CLI with the explicit target:

```powershell
pac pages upload --environment https://org84e19bfd.crm8.dynamics.com --path . --modelVersion 2
```

If `pac` is not on PATH, use the Power Platform extension terminal or its installed executable. Do not upload `preview.html` as a live page or enable `data-preview` on the deployed Home page. Keep existing YAML record IDs stable. Verify the uploaded site with an authorized account; anonymous HTTP checks previously reached the Microsoft sign-in gate.

Commit both source and generated files when using version control. Roll back application code by rebuilding a known-good revision and uploading to the same environment. Schema/data migrations require a separate rollback plan. Update `PROJECT_MEMORY.md` after testing or deployment.
