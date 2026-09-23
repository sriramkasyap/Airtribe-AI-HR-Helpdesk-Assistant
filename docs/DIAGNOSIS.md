# Diagnosis: manager leave lookups always failed

**Failure:** As manager `emp2`, “What is Alice’s leave balance?” came back as a refusal or an unauthorized tool error, even though the product was supposed to let managers look up other employees.

**How we found it:** Manual chat after seeding `emp2` as a manager. The leave tool has an explicit manager gate (`unauthorizedIfOtherEmployee`), so a manager-named user should have succeeded.

## Root-cause category

**Identity plumbing / prompt–policy conflict** (two stacked bugs, same symptom).

1. **Auth bug.** `POST /api/v1/auth/login` ignored the employee’s `role` in Mongo and always signed `role: "employee"` into the JWT. `emp2` logged in as a manager in the UI but arrived at every tool as a regular employee. The tool correctly refused `emp1`’s leave.
2. **Prompt bug.** Even after tools were later allowed to succeed, the system prompt said “never reveal another employee’s data” with no manager exception. Turn 2 then refused to speak the tool result.

Category in course terms: **wrong identity on the request** plus **over-broad safety instruction**, not a model-quality failure.

## Fix

- Login loads the employee from Mongo and signs the real `role`. Unknown IDs return 401.
- `buildSystemPrompt` interpolates the caller’s `employeeId` and `role`. Managers are told they may share tool-authorized records; non-managers are not.
- `get_leave_balance` accepts a manager-only `name` argument so “Alice” resolves to `emp1`.

## Before / after on the fixed test set

Tests: `apps/api/src/tests/managerAccess.test.ts` and `apps/api/src/tests/security.test.ts`.

| Case | Before | After |
|------|--------|--------|
| Login `emp2` | JWT `role` was `employee` | JWT `role` is `manager` |
| Login `nope` | 200 with a token for a fake user | 401 Unknown employee ID |
| Manager `emp2` → leave of `emp1` by id | `Unauthorized` | `{ employeeId: "emp1", casualLeave: 21 }` |
| Manager `emp2` → leave of `"Alice"` by name | not supported | resolves to `emp1` |
| Employee `emp1` → leave of `emp3` | `Unauthorized` (correct) | still `Unauthorized` |
| Jailbroken plan: emp1 asks tool for `"Carol White"` | would have leaked if the tool trusted the model | `Unauthorized: only managers can look up employees by name` |

The last two rows are the regression lock: the fix widened manager access without opening employee-to-employee reads.
