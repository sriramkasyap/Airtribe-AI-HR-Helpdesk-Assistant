# Employee-records “database”

The live store is MongoDB (`Employee`, `Reimbursement`, `HRPolicy`, `ConversationMemory`).  
Sample rows are seeded by `pnpm seed` from `apps/api/src/db/seeds/seed.ts`. Leave quotas live **on the employee document**.

This page is the human-readable snapshot of that seed.

## Employees

| Employee ID | Name | Email | Department | Role | Hire date | Casual | Sick | Earned | Year |
|-------------|------|-------|------------|------|-----------|--------|------|--------|------|
| `emp1` | Alice Johnson | alice@company.com | engineering | employee | 2022-03-15 | 21 | 12 | 18 | current calendar year |
| `emp2` | Bob Smith | bob@company.com | engineering | **manager** | 2020-06-01 | 15 | 8 | 10 | current calendar year |
| `emp3` | Carol White | carol@company.com | hr | employee | 2021-09-20 | 20 | 15 | 16 | current calendar year |

Log in with the employee ID only (no password). Role is read from this record at login and signed into the JWT.

## Reimbursements

| ID | Employee | Amount | Status | Type | Submitted |
|----|----------|--------|--------|------|-----------|
| `reb1` | emp1 (Alice) | 500 | pending | travel | 6 days ago |
| `reb2` | emp3 (Carol) | 200 | approved | office_supplies | 11 days ago |

## Access rules

- An `employee` may read only their own leave, profile, and reimbursements.
- A `manager` may look up any employee by `employeeId` or name.
- HR policies are readable by any authenticated user. Writes are manager-only.
