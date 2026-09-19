# AI HR Helpdesk Assistant

LLM-powered HR helpdesk assistant backend with deterministic tools, structured output, conversation memory, streaming, JWT auth, and observability.

## Stack

- Node.js + Express + TypeScript (strict)
- MongoDB Atlas via Mongoose
- OpenRouter (`glm-5.3-flash`)
- JWT Bearer authentication
- Jest testing

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your values
3. Start the server: `npm run dev`
4. Build: `npm run build`
5. Run tests: `npm test`
6. Seed sample data: `npm run seed`

## Environment Variables

- `MONGODB_URI` — MongoDB Atlas connection string
- `OPENROUTER_API_KEY` — OpenRouter API key
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `PORT` — Server port (default 3000)
- `FRONTEND_URL` — CORS origin
- `SESSION_TTL_HOURS` — Conversation memory TTL (default 24)

## API

- `POST /api/v1/auth/login` — Mock login (returns JWT for an employeeId)
- `POST /api/v1/chat` — Chat with the assistant
- `GET /api/v1/profile` — Current user profile
- `GET /api/v1/leave-balance` — Leave balance
- `GET /api/v1/reimbursements` — Reimbursement status
- `GET /api/v1/policies` — HR policy lookup
- `GET /health` — Health check

## Architecture

Client → Express API → JWT Auth + Guardrails → LLM Service (OpenRouter) → Deterministic Tools → MongoDB Atlas

Streaming is supported via `stream: true` on the chat endpoint.
