# AI HR Helpdesk Assistant

A monorepo HR helpdesk demo: employees sign in with an employee ID, ask HR questions in a chat UI, and an LLM plans **deterministic tools** (leave balance, reimbursements, policies, profile) against MongoDB. Answers stream over SSE.

```
apps/web  →  Vite + React (port 5173)
apps/api  →  Express + TypeScript (port 3000)
packages/shared-types → shared TypeScript types
packages/config → shared tsconfig base
```

---

## Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | 18+ recommended (repo uses modern TypeScript / Vite) |
| **pnpm** | Required — `packageManager` is `pnpm@10`. Install: `npm install -g pnpm@10` |
| **MongoDB** | Local (`mongodb://localhost:27017/...`) or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| **OpenRouter API key** | Needed for real chat answers. Without it, login/seed/health work; chat returns a clear “not configured” error |

---

## 1. Clone and install

```bash
git clone <this-repo-url>
cd AI-HR-Helpdesk-Assistant

pnpm install
```

This installs all workspace packages (`apps/*`, `packages/*`) via the root `pnpm-workspace.yaml`.

> Use **pnpm**, not `npm install`. The repo is a pnpm + Turborepo workspace; npm will not wire workspaces correctly.

---

## 2. Configure environment

Copy the example env file to the **repo root** (the API loads `../../.env` relative to `apps/api`):

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hr-helpdesk
OPENROUTER_API_KEY=sk-or-v1-your-real-key
JWT_SECRET=change-me-to-a-strong-secret-at-least-32-chars-long
FRONTEND_URL=http://localhost:5173
SESSION_TTL_HOURS=24
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Mongo connection string (local or Atlas) |
| `OPENROUTER_API_KEY` | For chat | OpenRouter key; chat fails gracefully if missing |
| `JWT_SECRET` | Yes | Signs login JWTs |
| `PORT` | No | API port (default `3000`) |
| `FRONTEND_URL` | No | CORS allow-origin (default `*` if unset; use `http://localhost:5173` for the Vite app) |
| `SESSION_TTL_HOURS` | No | Documented for conversation TTL; seed/default memory uses a 24h window |
| `OPENROUTER_MODEL` | No | Overrides default model `z-ai/glm-5.3-flash` |

**Local Mongo example:** start MongoDB, then set  
`MONGODB_URI=mongodb://localhost:27017/hr-helpdesk`.

**Atlas example:** paste your `mongodb+srv://...` URI from the Atlas UI.

---

## 3. Seed sample data

Employees, leave balances (embedded on each employee), reimbursements, and HR policies must exist before login works:

```bash
pnpm seed
```

You should see: `Database seeded successfully`.

### Seeded users (log in with these IDs)

| Employee ID | Name | Role | Notes |
|-------------|------|------|--------|
| `emp1` | Alice Johnson | employee | Own leave/reimbursements only |
| `emp2` | Bob Smith | **manager** | Can look up other employees’ leave (by ID or name) |
| `emp3` | Carol White | employee | Has an approved reimbursement in seed |

Re-run `pnpm seed` anytime to reset sample data (wipes employees / reimbursements / policies and drops any legacy `leavebalances` collection).

---

## 4. Run locally

### Option A — API + web together (recommended)

From the repo root:

```bash
pnpm dev
```

Turborepo starts both apps in parallel:

- **API:** http://localhost:3000  
- **Web:** http://localhost:5173  

The Vite dev server proxies `/api` → `http://localhost:3000`, so the browser calls `/api/v1/...` without CORS headaches beyond `FRONTEND_URL`.

### Option B — Run apps separately

```bash
# Terminal 1 — API
pnpm --filter @ai-hr/api dev

# Terminal 2 — Web
pnpm --filter @ai-hr/web dev
```

### Option C — API only (curl / Postman)

```bash
pnpm --filter @ai-hr/api dev
curl -s http://localhost:3000/health
```

---

## 5. Use the app

1. Open http://localhost:5173  
2. Sign in with `emp1`, `emp2`, or `emp3`  
3. Ask HR questions, for example:
   - “How many casual leaves do I have left?”
   - “What is the remote work policy?”
   - “Show my reimbursement status”
4. As **manager** `emp2`, try: “What is Alice’s leave balance?”
5. As **manager** `emp2`, open the **Policies** tab to view, add, edit, or delete HR policies (employees do not see this tab).

Log out from the header when switching users (JWT + role are stored in `localStorage` as `hr_token` / `hr_role`). After role/seed changes, log out and log back in so you get a fresh token.

---

## 6. Verify the API

### Health

```bash
curl -s http://localhost:3000/health | jq
```

### Login

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"employeeId":"emp1"}' | jq
```

Save `data.token` and call protected routes with `Authorization: Bearer <token>`.

### Streaming chat

```bash
TOKEN='<paste-jwt-here>'

curl -N -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"How many casual leaves do I have?","stream":true}'
```

SSE events include `status`, `tool`, `token`, `suggestions`, and `done`.

### Useful REST routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/login` | No | `{ "employeeId": "emp1" }` → JWT |
| `POST` | `/api/v1/chat` | Yes | Chat (`stream: true` for SSE) |
| `GET` | `/api/v1/employee` | Yes | List employees |
| `GET` | `/api/v1/employee/:id` | Yes | Profile (managers can view others) |
| `GET` | `/api/v1/policy` | Yes | List policies (`?topic=leave`) |
| `GET` | `/api/v1/policy/:id` | Yes | Policy by id |
| `POST` | `/api/v1/policy` | Manager | Create policy |
| `PATCH` | `/api/v1/policy/:id` | Manager | Update policy |
| `DELETE` | `/api/v1/policy/:id` | Manager | Delete policy |
| `GET` | `/health` | No | Liveness / DB check |

---

## 7. Tests, lint, build

```bash
# All packages via Turbo
pnpm test
pnpm typecheck
pnpm lint
pnpm build

# Single package
pnpm --filter @ai-hr/api test
pnpm --filter @ai-hr/web test
```

API tests that need Mongo skip or degrade if Mongo isn’t reachable; unit tests for tools/LLM parsing run without a live OpenRouter key.

---

## Architecture (local flow)

```
Browser (Vite :5173)
  └─ POST /api/v1/*  (proxied)
       └─ Express API (:3000)
            ├─ JWT auth + guardrails
            ├─ LLM (OpenRouter) — plan tools, then stream answer
            ├─ Tools → MongoDB (Employee + embedded leaveBalance, Reimbursement, HRPolicy, ConversationMemory)
            └─ SSE tokens back to the chat UI
```

Leave balances live **on the Employee document** (`leaveBalance`), not a separate collection. Managers get `role: "manager"` in the JWT from the database at login.

For diagrams of the full system (request path, streaming chat, tools, data model), see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Course deliverables

| Artifact | Where |
|----------|--------|
| Architecture (request–response, deterministic tools, memory, logging) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| System prompts labeled by the six Phase 2 components | [docs/PROMPTS.md](./docs/PROMPTS.md) · `apps/api/src/services/prompt.ts` |
| Phase 3 policy documents | [docs/policies/](./docs/policies/) (seeded into Mongo) |
| Employee-records “database” | [docs/employee-records.md](./docs/employee-records.md) · `pnpm seed` |
| Demo transcript (6 required beats) | [docs/DEMO.md](./docs/DEMO.md) |
| Security test notes | [docs/SECURITY.md](./docs/SECURITY.md) |
| Sample Phase 7 logs + cost | [docs/sample-logs.md](./docs/sample-logs.md) |
| Diagnosis write-up | [docs/DIAGNOSIS.md](./docs/DIAGNOSIS.md) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unknown employee ID` on login | Run `pnpm seed`; use `emp1` / `emp2` / `emp3` |
| Chat says assistant is not configured | Set a real `OPENROUTER_API_KEY` in root `.env`, restart API |
| Mongo connection errors | Confirm Mongo is running / Atlas IP allowlist; check `MONGODB_URI` |
| CORS / network errors from the browser | Set `FRONTEND_URL=http://localhost:5173` and use the Vite proxy (don’t call `:3000` from the browser for `/api` unless you update CORS) |
| Manager can’t see another employee’s leave | Log out and log in again as `emp2` after seeding (old tokens may still say `role: employee`) |
| Leave fields missing in Compass/Atlas | Re-seed — schema embeds `leaveBalance` on employees |
| `pnpm: command not found` | `npm install -g pnpm@10` |
| Port already in use | Change `PORT` in `.env` and Vite `server.port` / proxy target in `apps/web/vite.config.ts` to match |

---

## Project scripts (root)

| Script | What it does |
|--------|----------------|
| `pnpm install` | Install workspace deps |
| `pnpm dev` | Run API + web in parallel |
| `pnpm seed` | Seed Mongo with sample HR data |
| `pnpm test` | Run all package tests |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Typecheck packages |
| `pnpm lint` | Lint packages |
| `pnpm clean` | Remove `node_modules`, Turbo cache, `dist` |

---

## Optional: production-style API start

```bash
pnpm --filter @ai-hr/shared-types build
pnpm --filter @ai-hr/api build
pnpm --filter @ai-hr/api start   # node dist/index.js — still needs root .env / env vars
```
