# Decision log

## 2026-09-23 21:59 — Fill mid-term deliverable gaps

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Low | Mapped Phase 2’s six prompt components to Role, Allowed evidence, Output contract, Behavior rules, Failure behavior, Examples | `prompt.ts`, `docs/PROMPTS.md` | Those were the six labeled blocks in the original starter prompt; the assignment PDF was not in the repo | unlinked |
| Medium | Cost uses the starter rates $0.002 / $0.004 per 1M tokens, overridable by env | `cost.ts` | Restores the deleted `calculateCost` numbers so the formula is visible even if live OpenRouter prices differ | partially linked |
| Medium | Demo is a curl transcript, not a GIF or a stream toggle in the web UI | `docs/DEMO.md` | The UI is streaming-only; non-stream + classification JSON is what the rubric asks to show | partially linked |
| High | Seed loads policy markdown from `docs/policies/` so the “database” and the submitted policy files cannot drift | `seed.ts` | Phase 3 asks for the policy documents and the records the tools read | linked |
| High | Diagnosis write-up is the manager JWT-role bug, not a new failure hunt | `docs/DIAGNOSIS.md` | Already had before/after tests in `managerAccess.test.ts` | linked |

## 2026-09-21 19:20 — Manager-only HR policies tab + CRUD

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Low | Hard-delete policies instead of soft-delete / archive | `policy.ts` DELETE | User asked to delete; no archive requirement was stated | unlinked |
| Medium | Store role in `localStorage` (`hr_role`) from login response rather than decoding JWT on the client | `client.ts`, `AppShell`, `RequireManager` | Login already returns `role`; avoids adding a JWT parser just for nav gating | partially linked |
| Medium | Shared `AppShell` for Chat + Policies with manager-only Policies nav | `AppShell.tsx` | Keeps header/logout consistent without duplicating chrome | unlinked |
| High | Gate writes with `requireManager` on POST/PATCH/DELETE; GET stays any authenticated user | `policy.ts`, `requireManager.ts` | Matches chat-tool read access while restricting management to managers | linked |
| High | Guardrails scan only `req.body.message`, not method/path | `guardrails.ts` | `/delete/i` previously blocked legitimate `DELETE /policy/:id` | linked |

## 2026-09-21 18:31 — Ponytail audit: strip dead code and lockfile bloat

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Medium | Left `LLMOutput` defined in both shared-types and `llm.service` rather than forcing one import | `llm.service.ts`, `shared-types` | Service uses a slightly tighter classification union at parse time; merging now risks a wider type churn for little line savings | unlinked |
| High | Deleted unused helpers/utils/barrels, `sendChat`, logger wrappers, `calculateCost`, `concurrently`, root jest + npm/nested lockfiles | repo-wide | Verified zero callers via grep; pnpm workspace already owns the root lockfile | linked |
| High | One `unauthorizedIfOtherEmployee` helper + tools `ToolContext` re-export from shared-types | `tools/access.ts`, `tools/types.ts` | Three tools repeated the same manager gate; `models` on ToolContext was never populated | linked |

## 2026-09-21 18:12 — Fix manager leave-balance access

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Medium | Managers may resolve leave targets by partial name (`name` arg) as well as `employeeId` | `getLeaveBalance.ts`, `toolExecutor.ts`, `prompt.ts` | Users ask by name more often than ID; name lookup is manager-only to preserve privacy | partially linked |
| High | Inject caller role/employeeId into the system prompt and allow managers to share other employees' tool data | `prompt.ts`, `llm.service.ts` | Blanket "never reveal another employee's data" made the model refuse even when tools would authorize | linked |
| High | Login JWT now loads the employee from Mongo and signs the real `role` (rejects unknown IDs) | `routes/auth.ts` | Login previously hard-coded `role: 'employee'`, so managers failed the tool auth check as if they were regular employees | linked |

## 2026-09-21 18:10 — Merge leave balances into the Employee document

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Medium | Keep `year` on the embedded `leaveBalance` subdoc rather than dropping it | `Employee.ts`, `shared-types` | Seed and tool already treated leave as current-year only, but year is useful metadata if quotas reset annually without restoring a second collection | partially linked |
| High | Embed leave quotas on `Employee` and delete the `LeaveBalance` collection/model | `Employee.ts`, `getLeaveBalance.ts`, `seed.ts` | Lookups were already effectively 1:1 (`findOne` by employeeId with no year filter); a separate table added join cost with no multi-row use | linked |

## 2026-09-21 18:07 — Proper chat UI with role bubbles and markdown

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Medium | Teal/slate visual system (Fraunces + Manrope) instead of a design-system package | `apps/web/src/styles/app.css`, `index.html` | App had no existing design system; a small CSS-variable sheet keeps the chat readable without adding a UI kit | unlinked |
| High | `react-markdown` + `remark-gfm` for bubble content (no raw HTML) | `MarkdownContent.tsx`, `Chat.tsx` | Assistant replies include lists/tables/emphasis; GFM covers common HR-policy formatting while default sanitization avoids XSS | unlinked |
| High | User bubbles right/teal, assistant bubbles left/white with labels | `Chat.tsx`, `app.css` | Fixes the reported inability to tell speakers apart via alignment, color, and role labels | unlinked |

## 2026-09-21 17:52 — Fix logout redirect loop between login and root

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Medium | Exported `AppRoutes` separately so auth redirect behavior can be tested with `MemoryRouter` without mounting `BrowserRouter` | `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx` | The loop only shows up across navigation; unit-testing the route tree needs a controllable history | unlinked |
| High | Replaced inline `getToken() ? <Navigate/> : <Login/>` on `/login` with a `GuestOnly` route component that checks the token on every render | `apps/web/src/App.tsx` | `App` wraps `BrowserRouter`, so location changes do not re-run `App()`; the login element stayed as a stale authenticated redirect and fought `RequireAuth` after `clearToken()` | unlinked |

## 2026-09-21 15:40 — Build the tool-executor feature set and get the app running

| Confidence | Decision | Where | Reasoning | Spec link |
|---|---|---|---|---|
| Low | Web chat page uses the structured (non-streaming) API response instead of the SSE stream, so it can render `toolsUsed` and clickable follow-up suggestions | `apps/web/src/pages/Chat.tsx` | Tool-grounded two-turn responses are complete before rendering, and structured data gives a much richer UI than raw token chunks; `streamChatResponse` remains available and fully unit-tested if streaming UI is wanted later | unlinked |
| Low | Chat streaming endpoint now emits the *composed* response in 24-char chunks rather than raw LLM tokens | `apps/api/src/routes/chat.ts` | Grounding answers in tool results requires the full second LLM turn before the first byte can be sent; chunked SSE keeps the wire format and client parser unchanged | unlinked |
| Low | Missing `OPENROUTER_API_KEY` short-circuits instantly with a 503 `LLM_UNAVAILABLE` ("Assistant is not configured") instead of 3 retries with backoff | `apps/api/src/services/llm.service.ts`, `apps/api/src/routes/chat.ts` | Retrying a config error wastes ~12s per request and hides the real cause from the caller | unlinked |
| Medium | Tool composition is a second LLM turn seeded with executed tool results (JSON in `<tool_results>` tags) rather than a multi-step agent loop | `apps/api/src/services/llm.service.ts` (`composeWithToolResults`) | One extra turn is deterministic, cheap, and capped at 5 tool calls/turn; a full agent loop adds latency and failure modes the prompt contract doesn't support | unlinked |
| Medium | Tool failures are captured per-call (`ok:false`, error text) and never abort the chat turn | `apps/api/src/services/toolExecutor.ts` | One bad tool call shouldn't kill the whole response; the LLM turn 2 prompt explicitly instructs honesty about failed tools | unlinked |
| Medium | Added `.env` at repo root (Mongo localhost, empty OPENROUTER_API_KEY placeholder) and `import 'dotenv/config'` in the API entrypoint | `.env`, `apps/api/src/index.ts` | `.env.example` existed but nothing loaded env files, so the server could never be configured without shell exports; key intentionally left blank so chat degrades gracefully until a real key is set | unlinked |
| Medium | Unknown LLM-requested tool names are executed as a graceful `Unknown tool` failure result rather than rejected before dispatch | `apps/api/src/services/toolExecutor.ts` | Keeps the executor total (no throw paths) and lets turn 2 explain the failure; the tool-name allowlist is enforced by the switch itself | unlinked |
| High | Root `eslint.config.mjs` (typescript-eslint flat config) replaces the misnamed legacy config in `packages/config`; workspaces lint via upward config discovery | `eslint.config.mjs`, `apps/web/package.json` | The old file was `.eslintrc`-format JSON saved as `eslint.config.js` and eslint wasn't installed in most workspaces; a single root flat config is the standard monorepo pattern | unlinked |
| High | Mongoose pinned to v8 (`^8.10.3`) and models rewritten to classic v8 idioms instead of migrating to v9 | `apps/api/package.json`, `apps/api/src/db/models/*` | The codebase was authored against v8 patterns; pinning collapses the model churn and v9 offers no features this app needs | unlinked |
