# Deployment Guide — avoid-nodes monorepo

## Prerequisites

- Node.js 20+
- Yarn 1.22+
- npm account with publish access
- `NPM_TOKEN` set as GitHub secret (for CI)

---

## Packages Overview

| Package | Version | Registry |
|---------|---------|----------|
| `avoid-nodes-edge` | 0.3.0 | [npm](https://www.npmjs.com/package/avoid-nodes-edge) |
| `avoid-nodes-edge-svelte` | 0.2.0 | [npm](https://www.npmjs.com/package/avoid-nodes-edge-svelte) |
| `avoid-nodes-router` | 0.2.0 | [npm](https://www.npmjs.com/package/avoid-nodes-router) |

---

## 1. Install & Build All

```bash
# Install all workspace dependencies
yarn install

# Build all packages (uses Turborepo)
yarn build
```

## 2. Build Individual Packages

```bash
# React edge router
cd packages/avoid-nodes-edge && yarn build

# Svelte edge router
cd packages/avoid-nodes-edge-svelte && yarn build

# Server-side router
cd packages/avoid-nodes-router && yarn build
```

## 3. Publish to npm

### Manual Publish (all packages)

```bash
# Login to npm (one-time)
npm login

# Publish avoid-nodes-edge
cd packages/avoid-nodes-edge
npm version patch   # or minor / major
npm publish --access public

# Publish avoid-nodes-edge-svelte
cd packages/avoid-nodes-edge-svelte
npm version patch
npm publish --access public

# Publish avoid-nodes-router
cd packages/avoid-nodes-router
npm version patch
npm publish --access public
```

### Quick Publish Script (all at once)

```bash
# From root — build all then publish each
yarn build && \
  cd packages/avoid-nodes-edge && npm publish --access public && cd ../.. && \
  cd packages/avoid-nodes-edge-svelte && npm publish --access public && cd ../.. && \
  cd packages/avoid-nodes-router && npm publish --access public && cd ../..
```

### CI/CD Auto-Publish (GitHub Actions)

The workflow at `.github/workflows/publish.yml` auto-publishes `avoid-nodes-edge` on push to `main` when files in `packages/avoid-nodes-edge/**` change. To extend this to other packages, duplicate the workflow for each package.

**Required GitHub Secret:** `NPM_TOKEN`

---

## 4. Version Bumping

```bash
# Bump all packages to the same version
cd packages/avoid-nodes-edge && npm version 0.3.0 --no-git-tag-version
cd packages/avoid-nodes-edge-svelte && npm version 0.2.0 --no-git-tag-version
cd packages/avoid-nodes-router && npm version 0.2.0 --no-git-tag-version

# Or use patch/minor/major
cd packages/avoid-nodes-edge && npm version minor --no-git-tag-version
```

---

## 5. Deploy Example Apps

### Vercel (Next.js & Vite apps)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy React demo (Vite)
cd examples-next/demo && vercel --prod

# Deploy Next.js example
cd examples-next/nextjs-latest-basic && vercel --prod

# Deploy server-side Next.js example
cd examples-server-side/nextjs-example && vercel --prod

# Deploy Svelte demo
cd examples-svelte/demo && vercel --prod
```

### Vercel Project Settings

For Next.js apps with server-side WASM (`examples-server-side/nextjs-example`):
- Framework: Next.js
- Root Directory: `examples-server-side/nextjs-example`
- Build Command: `yarn build`
- Note: `next.config.ts` has `serverExternalPackages: ["libavoid-js"]`

---

## 6. Pre-publish Checklist

- [ ] All packages build without errors: `yarn build`
- [ ] TypeScript passes: `yarn typecheck`
- [ ] Version bumped in each package's `package.json`
- [ ] WASM files copy correctly (check `postinstall` scripts)
- [ ] Test locally with examples before publishing
- [ ] Commit and push to `main` for CI auto-publish

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| WASM not found | Run `node scripts/copy-libavoid-wasm.cjs` in the example dir |
| Build fails | Delete `node_modules` and `dist`, then `yarn install && yarn build` |
| Publish 403 | Check `npm whoami` and ensure you have publish access |
| Version already published | Bump version first with `npm version patch` |
| Turbo cache stale | Run `yarn build --force` |
