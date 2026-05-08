# Sandbox Mini Project

This is a small, isolated sandbox project for team review inside `ovnstable-core`.

It is intentionally self-contained under `sandbox/mini-project/` and does not import or modify production contracts, deployment scripts, root workspace configuration, CI configuration, or Hardhat settings.

**This is a sandbox / team-review project, not production code.**

## Install Dependencies

This project has no third-party runtime dependencies. From this folder, run:

```bash
npm install --package-lock=false
```

The install command is optional for runtime behavior today, but it gives teammates the normal local Node project setup flow without adding files to the sandbox.

## Run Locally

From `sandbox/mini-project/`:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

You can also inspect the static entry point directly at `public/index.html`.

## Validate

From `sandbox/mini-project/`:

```bash
npm test
```

The test checks JavaScript syntax and verifies the expected sandbox files are present.

## Files Added

- `.gitignore` - ignores local sandbox-only generated files.
- `package.json` - local scripts for running and validating the sandbox.
- `server.js` - tiny local static file server using Node built-ins only.
- `public/index.html` - static sandbox UI.
- `public/styles.css` - sandbox-only styling.
- `public/app.js` - sandbox-only mock interaction logic.
- `test/smoke.test.js` - minimal smoke test for teammate review.
- `README.md` - setup, run, validation, and scope notes.

## What This Does Not Change

- No production contracts are changed.
- No deployment scripts are changed.
- No root `package.json`, `yarn.lock`, Hardhat config, or CI config is changed.
- No main repo build, test, or deploy flow depends on this sandbox.

This is for team review only and is not intended to be merged into production as-is.
