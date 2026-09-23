# Demo transcript

Recorded 23 September 2026 against a local API (`http://localhost:3000`) as **emp1 (Alice Johnson)**. Tokens redacted. Reproduce:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"employeeId":"emp1"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
```

---

## A. General HR question

```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"What kinds of HR questions can you help me with?","stream":false}'
```

**Classification:** `question` (0.95) — capabilities, not a record or policy lookup.  
**Tools:** none.

> Hello! I'm your HR Helpdesk Assistant, and I'm happy to help with a variety of HR topics, including: leave balances, reimbursements, HR policies, and your employee records. As a regular employee, I can only access your own records.

---

## B. Ticket classified into structured JSON

```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"I want to file a ticket about my pending travel reimbursement of 500 dollars.","stream":false}'
```

```json
{
  "classification": {
    "type": "request",
    "confidence": 0.85,
    "reasoning": "The employee wants to file a ticket about a pending travel reimbursement. I can confirm the reimbursement exists and is pending, but no ticketing tool is available."
  },
  "toolsUsed": [
    { "name": "get_reimbursement_status", "ok": true, "data": [{ "id": "reb1", "amount": 500, "status": "pending", "type": "travel" }] }
  ]
}
```

The assistant confirmed **reb1 / $500 / pending** from the employee record and said it cannot file tickets — escalate to HR.

---

## C. Policy question from supplied policy text

```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"What is the remote work policy? How many days can I work from home?","stream":false}'
```

**Classification:** `policy_lookup` (0.98).  
**Tool:** `get_hr_policy` `{ "topic": "remote_work" }` → `pol1`.

Answer quoted the seeded `docs/policies/remote-work.md` text: **up to 3 remote days / week**, **2 office days**, 90-day eligibility, core hours 10:00–16:00, 15-day fully-remote exception.

---

## D. Leave-balance lookup (deterministic tool)

```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"How many casual leaves do I have left?","stream":false}'
```

**Classification:** `record_lookup` (0.98).  
**Tool:** `get_leave_balance` → `{ employeeId: "emp1", casualLeave: 21, sickLeave: 12, earnedLeave: 18, year: 2026 }`.

> Hi Alice! You have 21 casual leave days remaining for the 2026 calendar year.

---

## E. Out-of-scope query declined

```bash
curl -s -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"What'\''s the weather like in Bangalore today?","stream":false}'
```

**Classification:** `off_topic` (0.95). **Tools:** none.

> I'm not able to check the weather in Bangalore — that's outside my area. I'm here to help with HR-related questions like leave balances, reimbursement statuses, HR policies, or your employee records.

---

## F. Streaming vs non-streaming, same question

Question: **“How many sick leaves do I have?”** (emp1)

### Non-streaming (`stream: false`) — one JSON body

```json
{
  "classification": { "type": "record_lookup", "confidence": 0.98 },
  "toolsUsed": [{ "name": "get_leave_balance", "ok": true, "data": { "sickLeave": 12, "year": 2026 } }],
  "response": "Hi Alice! You have 12 sick leave days remaining for 2026."
}
```

### Streaming (`stream: true`) — SSE events, same tools and answer

```
data: {"type":"status","stage":"understanding"}
data: {"type":"status","stage":"tools"}
data: {"type":"tool","name":"get_leave_balance","ok":true}
data: {"type":"status","stage":"composing"}
data: {"type":"token","content":"Hi Alice! You"}
data: {"type":"token","content":" currently"}
data: {"type":"token","content":" have **12 sick"}
data: {"type":"token","content":" leave days** remaining"}
...
data: {"type":"suggestions","items":["How do I apply for sick leave?","What is the company's sick leave policy?"]}
data: {"type":"done"}
```

The web UI uses the streaming path. Classification JSON is only in the non-streaming body (and in the Phase 7 `chat_turn` log for both).
