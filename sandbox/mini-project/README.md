# Reinforce.fi UI Prototype Sandbox

This is the previously built Reinforce.fi UI prototype, copied into `ovnstable-core` as an isolated experiment for team review.

It is a standalone React + TypeScript + Tailwind CSS + Vite app under `sandbox/mini-project/`. It uses mock data only and does not call wallets, exchanges, blockchains, KYC services, payment providers, or any external APIs.

**This is a sandbox / team-review project, not production code.**

## Install Dependencies

From this folder:

```bash
npm install
```

Dependencies are local to `sandbox/mini-project/` through this folder's own `package.json`. A generated `package-lock.json` is intentionally ignored to keep the review diff focused on the prototype source.

## Run Locally

From `sandbox/mini-project/`:

```bash
npm run dev
```

Then open the local Vite URL printed by the command, usually:

```text
http://127.0.0.1:5173/
```

## Validate

From `sandbox/mini-project/`:

```bash
npm run build
```

`npm test` is also available and runs the same build validation.

## Files Added

- `.gitignore` - ignores local sandbox build/install artifacts.
- `README.md` - setup, run, validation, and scope notes.
- `package.json` - local sandbox app dependencies and scripts.
- `index.html` - Vite entry point.
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js` - local sandbox tooling config.
- `src/` - Reinforce.fi UI prototype source, mock data, route recommendation logic, and reusable components.

## What This Does Not Change

- No production contracts are changed.
- No deployment scripts are changed.
- No root `package.json`, `yarn.lock`, Hardhat config, CI config, or root-level repo configuration is changed.
- No main repo build, test, or deploy flow depends on this sandbox.
- No production integrations are imported from core code.

This is for team review only and is not intended to be merged into production as-is.
