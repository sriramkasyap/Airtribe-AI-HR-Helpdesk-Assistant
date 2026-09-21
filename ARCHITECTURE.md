# Architecture

Complete architecture of the AI HR Helpdesk Assistant, as Mermaid diagrams.  
Companion to the [README](./README.md) local-setup guide.

---

## 1. System overview

```mermaid
flowchart TB
  subgraph Client["apps/web — Vite + React (:5173)"]
    Login["Login page<br/>employeeId → JWT"]
    ChatUI["Chat page<br/>bubbles + markdown"]
    ClientAPI["api/client.ts<br/>streamChat / login"]
    SSEParse["api/sse.ts<br/>SSE event parser"]
    Login --> ClientAPI
    ChatUI --> ClientAPI
    ClientAPI --> SSEParse
  end

  subgraph Edge["Dev proxy"]
    Proxy["Vite proxy<br/>/api → :3000"]
  end

  subgraph API["apps/api — Express + TypeScript (:3000)"]
    MW["Middleware stack"]
    Routes["REST routes /api/v1"]
    Services["Services"]
    Tools["Deterministic tools"]
    Models["Mongoose models"]
  end

  subgraph External["External services"]
    OpenRouter["OpenRouter LLM<br/>z-ai/glm-5.3-flash"]
    Mongo["MongoDB<br/>local or Atlas"]
  end

  subgraph Shared["packages/"]
    Types["shared-types"]
    Config["config / tsconfig.base"]
  end

  ChatUI --> Proxy --> Routes
  Login --> Proxy
  ClientAPI -.->|Bearer JWT| MW
  MW --> Routes
  Routes --> Services
  Services -->|plan + stream| OpenRouter
  Services --> Tools
  Tools --> Models --> Mongo
  Services --> Models
  Client -.-> Types
  API -.-> Types
  API -.-> Config
  Client -.-> Config
```

---

## 2. Monorepo layout

```mermaid
flowchart LR
  Root["AI-HR-Helpdesk-Assistant"]

  Root --> Apps
  Root --> Packages
  Root --> Tooling

  subgraph Apps["apps/"]
    Web["web<br/>React UI, Vitest"]
    Api["api<br/>Express API, Jest"]
  end

  subgraph Packages["packages/"]
    ST["shared-types<br/>Employee, LeaveBalance, LLM types"]
    CFG["config<br/>tsconfig.base.json"]
  end

  subgraph Tooling["tooling"]
    PNPM["pnpm workspaces"]
    Turbo["Turborepo<br/>dev / test / build"]
    Env[".env at repo root"]
  end

  Web --> ST
  Api --> ST
  Web --> CFG
  Api --> CFG
  Env -->|dotenv via apps/api/src/env.ts| Api
```

---

## 3. HTTP middleware & routes

```mermaid
flowchart TB
  Req["Incoming request"]

  Req --> Helmet["helmet"]
  Helmet --> CORS["cors<br/>FRONTEND_URL"]
  CORS --> JSON["express.json"]
  JSON --> Rate["globalRateLimit<br/>100 / 15 min"]
  Rate --> ReqId["requestIdMiddleware"]

  ReqId --> Health{"path?"}
  Health -->|/health| HealthR["health router<br/>DB ping"]
  Health -->|/api/v1/*| API["api router"]

  API --> AuthPub{"route?"}
  AuthPub -->|/auth/*| AuthRoutes["POST /login<br/>public"]
  AuthPub -->|other| Gate["authMiddleware<br/>JWT Bearer"]
  Gate --> Guard["guardrailsMiddleware"]
  Guard --> Protected

  subgraph Protected["Protected routes"]
    Chat["POST /chat"]
    Emp["GET /employee<br/>GET /employee/:id"]
    Pol["GET /policy<br/>GET /policy/:id"]
  end

  AuthRoutes --> EmployeeLookup["EmployeeModel.findOne"]
  EmployeeLookup --> SignJWT["SignJWT<br/>employeeId + role"]
```

---

## 4. Auth & role model

```mermaid
sequenceDiagram
  actor User
  participant Web as apps/web
  participant Auth as POST /api/v1/auth/login
  participant DB as MongoDB Employee
  participant Chat as Protected routes

  User->>Web: Enter employeeId (emp1/emp2/emp3)
  Web->>Auth: { employeeId }
  Auth->>DB: findOne({ id })
  alt unknown ID
    Auth-->>Web: 401 Unknown employee ID
  else found
    Note over Auth: role comes from DB<br/>employee | manager
    Auth-->>Web: { token, expiresAt }
    Web->>Web: localStorage hr_token
  end

  User->>Web: Ask HR question
  Web->>Chat: Authorization: Bearer JWT
  Chat->>Chat: Verify JWT → req.user<br/>{ employeeId, role }

  Note over Chat: employee → own records only<br/>manager → others by id or name
```

---

## 5. Streaming chat pipeline

```mermaid
sequenceDiagram
  actor User
  participant UI as Chat.tsx
  participant Client as streamChat()
  participant Route as POST /chat?stream=true
  participant Mem as MemoryService
  participant LLM as LLMService
  participant OR as OpenRouter
  participant Exec as executeToolCalls
  participant Tools as HR tools
  participant DB as MongoDB

  User->>UI: Send message
  UI->>Client: streamChat({ message, sessionId })
  Client->>Route: POST /api/v1/chat stream:true

  Route->>Mem: createSession / append user msg
  Route->>Mem: getHistory
  Route-->>Client: SSE status: understanding

  Route->>LLM: classifyAndPlan(message, context, history)
  LLM->>OR: Turn 1 — JSON plan + toolCalls
  OR-->>LLM: structured plan
  LLM-->>Route: plan

  alt plan has toolCalls
    Route-->>Client: SSE status: tools
    Route->>Exec: executeToolCalls(plan.toolCalls, context)
    loop each tool
      Exec->>Tools: get_leave_balance / profile / ...
      Tools->>DB: read
      DB-->>Tools: data or auth error
      Tools-->>Exec: ToolResult
      Route-->>Client: SSE tool { name, ok }
    end
    Route-->>Client: SSE status: composing
    Route->>LLM: streamAnswer(..., executedTools)
    LLM->>OR: Turn 2 — prose grounded in tool results
    loop tokens
      OR-->>LLM: token
      LLM-->>Route: yield token
      Route-->>Client: SSE token
      Client-->>UI: append to assistant bubble
    end
  else no tools
    Route-->>Client: chunk plan.response as tokens
  end

  Route->>Mem: append assistant reply
  Route-->>Client: SSE suggestions + done
  UI->>UI: render markdown + follow-ups
```

---

## 6. LLM turns & prompts

```mermaid
flowchart LR
  subgraph Turn1["Turn 1 — classifyAndPlan"]
    P1["buildPrompt<br/>+ caller role/employeeId"]
    OR1["OpenRouter<br/>JSON contract"]
    Plan["LLMOutput<br/>classification, toolCalls,<br/>response, followUps"]
    P1 --> OR1 --> Plan
  end

  subgraph Exec["Tool execution"]
    Plan --> TE["toolExecutor<br/>normalizeArgs<br/>max 5 calls"]
    TE --> Results["ExecutedTool[]<br/>{ name, ok, summary }"]
  end

  subgraph Turn2["Turn 2 — streamAnswer / compose"]
    Results --> P2["buildAnswerPrompt<br/>+ tool_results"]
    P2 --> OR2["OpenRouter<br/>plain prose SSE"]
    OR2 --> Answer["User-facing answer"]
  end
```

---

## 7. Deterministic tools

```mermaid
flowchart TB
  TE["executeToolCall(name, args, context)"]

  TE --> N{tool name}

  N -->|get_leave_balance| LB["getLeaveBalance"]
  N -->|get_employee_profile| EP["getEmployeeProfile"]
  N -->|get_reimbursement_status| RB["getReimbursementStatus"]
  N -->|get_hr_policy| HP["getHRPolicy / listPolicies by topic"]
  N -->|unknown| U["ok:false Unknown tool"]

  subgraph Access["access.ts"]
    Auth["unauthorizedIfOtherEmployee<br/>self OR manager"]
  end

  LB --> Resolve["resolve employeeId<br/>or name regex if manager"]
  Resolve --> Auth
  EP --> Auth
  RB --> Auth

  LB --> Emp[(Employee<br/>+ leaveBalance)]
  EP --> Emp
  RB --> Reimb[(Reimbursement)]
  HP --> Pol[(HRPolicy)]
```

### Tool → data mapping

| Tool | Reads | Auth |
|------|--------|------|
| `get_leave_balance` | `Employee.leaveBalance` (+ optional name lookup) | Self, or any employee if `role=manager` |
| `get_employee_profile` | `Employee` fields | Same |
| `get_reimbursement_status` | `Reimbursement` by `employeeId` | Same |
| `get_hr_policy` | `HRPolicy` by id or topic list | Any authenticated user |

---

## 8. Data model

```mermaid
erDiagram
  EMPLOYEE ||--o{ REIMBURSEMENT : has
  EMPLOYEE ||--o{ CONVERSATION_MEMORY : owns_sessions
  EMPLOYEE {
    string id PK
    string name
    string email
    string department
    string role "employee|manager"
    date hireDate
    object leaveBalance "casualLeave, sickLeave, earnedLeave, year"
  }

  REIMBURSEMENT {
    string id PK
    string employeeId FK
    number amount
    string status "pending|approved|rejected"
    string type
    date submittedAt
  }

  HR_POLICY {
    string id PK
    string title
    string category
    string content
    date effectiveDate
    boolean isActive
  }

  CONVERSATION_MEMORY {
    string id PK
    string sessionId
    string userId
    array messages "role, content, timestamp"
    date updatedAt
    date expiresAt
  }
```

Leave quotas are **embedded** on `Employee` (not a separate collection). Seed data: `emp1` Alice (employee), `emp2` Bob (manager), `emp3` Carol (employee).

---

## 9. Frontend structure

```mermaid
flowchart TB
  Main["main.tsx + app.css"] --> App["App.tsx BrowserRouter"]

  App --> Guest["GuestOnly<br/>redirect if token"]
  App --> Req["RequireAuth<br/>redirect if no token"]

  Guest --> LoginPage["Login.tsx"]
  Req --> ChatPage["Chat.tsx"]

  LoginPage --> LoginAPI["login() → setToken"]
  ChatPage --> Stream["streamChat()"]
  ChatPage --> MD["MarkdownContent<br/>react-markdown + GFM"]
  ChatPage --> Logout["clearToken → /login"]

  Stream --> Fetch["fetch /api/v1/chat"]
  Fetch --> Parse["streamChatResponse<br/>status | tool | token | suggestions | error"]
```

---

## 10. Non-streaming chat path

Same two-turn logic as streaming, but a single JSON response:

```mermaid
flowchart LR
  Req["POST /chat<br/>stream:false"] --> T1["classifyAndPlan"]
  T1 --> Tools["executeToolCalls"]
  Tools --> T2["composeWithToolResults"]
  T2 --> JSON["APIResponse<br/>+ toolsUsed + sessionId"]
```

The web UI uses **streaming only**; the non-stream path remains for API clients.

---

## 11. Observability & safety

```mermaid
flowchart LR
  subgraph Safety
    Helmet
    RateLimit
    JWT["JWT verification"]
    Guardrails["guardrailsMiddleware<br/>prompt injection patterns"]
    Zod["zod request schemas"]
    ToolAuth["per-tool manager gate"]
  end

  subgraph Observability
    Pino["pino logger<br/>redacts secrets"]
    ReqId["request id"]
    Health["/health<br/>DB status"]
  end

  Req --> Safety --> Handlers
  Handlers --> Observability
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| Solid arrow | Runtime call / data flow |
| Dashed arrow | Type or config dependency |
| SSE | Server-Sent Events (`text/event-stream`) |
| Turn 1 / Turn 2 | Separate OpenRouter completions |

For how to run this stack locally, see [README.md](./README.md).
