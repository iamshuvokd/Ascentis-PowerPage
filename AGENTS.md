# Project continuity

Before changing this portal, read `PROJECT_MEMORY.md` and `CONSULTANT-PORTAL.md`.

- Edit `src/portal/`; generated Home assets, the Consultant portal web template, and `preview.html` are build outputs.
- Run `npm.cmd run build` and `npm.cmd run check`. For form or interaction changes, also run the browser checks described in the maintenance guide.
- Keep live authentication and persistence separate from the labelled local design preview. Do not enable preview mode on the live site.
- Update `PROJECT_MEMORY.md` with completed work, validation results, remaining requirements, and deployment status before handing off.
- Use the provided functional specification and screenshots as requirements/reference material. The URS and confirmed Dataverse schema remain necessary for final storage mappings.
