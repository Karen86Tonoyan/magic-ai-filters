# CLAW BOT × LangGraph Integration

Integracja **LangGraph** — stateful agent orchestration framework — z CLAW-em.

## Co dodano

### 1. **Workflow Graph** (`src/agent/graph.ts`)

Graph-based multi-step agent workflow inspirowany LangGraph:

```
User Input
    ↓
[security_check] → Cerber Guardian
    ↓
[parse_intent] → Detect intent (datetime, calculate, etc.)
    ↓
[llm_reasoning] → LLM processes input
    ↓
[human_approval] → Wait for human (if needed)
    ↓
[execute] → Run tools & return result
```

**Nodes:**
- `securityCheckNode` — Cerber Guardian verification
- `parseIntentNode` — Intent detection
- `llmReasoningNode` — LLM reasoning step
- `humanApprovalNode` — Human-in-the-loop (TODO)
- `executeNode` — Tool execution

**State Management:**
```typescript
interface AgentState {
  sessionId: string;
  userId: string;
  input: string;
  messages: Message[];
  thoughts: string[];        // Reasoning trace
  decision: "PROCEED" | "BLOCK" | "WAIT_HUMAN" | "COMPLETE";
  result: string;
  metadata: { cerberVerdict, toolsCalled, timestamp };
}
```

**Użycie:**
```typescript
import { graphAgent } from "./src/agent/graph.js";

const result = await graphAgent.run(session, userInput);
// {
//   result: "Odpowiedź...",
//   thoughts: ["Krok 1", "Krok 2", ...],
//   metadata: { ... }
// }
```

### 2. **Long-term Memory** (`src/agent/memory.ts`)

Trójwarstwowy system pamięci:

#### Short-term Memory
Zmienne tymczasowe w sesji:
```typescript
shortTermMemory.set("user_name", "Alice");
shortTermMemory.get("user_name"); // "Alice"
```

#### Long-term Memory
Persistent memory per-user:
```typescript
// Save
longTermMemory.save(userId, "favorite_color", "blue", importance=0.8);

// Retrieve
const entry = longTermMemory.retrieve(userId, "favorite_color");

// Search
const results = longTermMemory.search(userId, "color", limit=5);

// Get all
const all = longTermMemory.getAll(userId);
```

#### Checkpoints
State persistence dla resumption:
```typescript
checkpointStore.save(sessionId, step, state);
const checkpoint = checkpointStore.getLatest(sessionId);
const restored = checkpointStore.restore(sessionId, step);
```

### 3. **Memory Skill** (`src/skills/memory-skill.ts`)

Natural language interfejs do pamięci:

```
User: "Zapamiętaj że lubię kawy"
Bot: "✓ Zapamiętałem: note_xxx = 'lubię kawy'"

User: "Co wiesz o kawach?"
Bot: "Pamiętam o kawach:
     • lubię kawy: lubię kawy
     • kawa_temperatura: 60°C"

User: "Pamiętaj w sesji zmienna=wartość"
Bot: "✓ Zapamiętane w sesji: zmienna=wartość"
```

## Architektura

```
┌─────────────────────────────────────────┐
│         User Input (Telegram/Discord)   │
└──────────────────┬──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │   WorkflowGraph      │ ← LangGraph-style
        │                      │
        │  Node1: Security     │
        │  Node2: Intent       │
        │  Node3: Reasoning    │
        │  Node4: Approval     │
        │  Node5: Execute      │
        └──────────────┬───────┘
                       ↓
        ┌──────────────────────┐
        │  Memory System       │
        │                      │
        │  Short-term ─────┐   │
        │  Long-term  ─────┼─► Skills
        │  Checkpoint ─────┘   │
        └──────────────┬───────┘
                       ↓
            ┌──────────────────┐
            │  Return Result   │
            │  + Thoughts      │
            │  + Metadata      │
            └──────────────────┘
```

## Integracja z CLAW

### Agent Flow (z LangGraph)

```typescript
// W channels/telegram/index.ts
const graphResult = await graphAgent.run(session, userMessage);
const thoughts = graphResult.thoughts.join(" → ");
const response = graphResult.result;

await ctx.reply(`${response}\n\n_Myślenie: ${thoughts}_`);
```

### Memory w Skills

```typescript
// Skill automatycznie ma dostęp do:
- session.metadata (short-term)
- longTermMemory.getAll(userId) (long-term)
- checkpointStore.getLatest(sessionId) (checkpoint)
```

## Features

- ✅ **Multi-step workflows** — Complex agent reasoning
- ✅ **State persistence** — Resume from checkpoints
- ✅ **Memory management** — Short + long-term storage
- ✅ **Reasoning trace** — Thoughts for transparency
- ✅ **Human-in-the-loop** — (TODO: full implementation)
- ✅ **Tool integration** — Skills + external tools

## TODO

- [ ] Pełna implementacja human-in-the-loop (Telegram approval)
- [ ] LLM reasoning node (integracja z Ollama)
- [ ] Semantic memory (embeddings + similarity search)
- [ ] Workflow visualization (graph debugging)
- [ ] Distributed checkpoints (DB persistence)

## Źródła

- **LangGraph**: https://github.com/Karen86Tonoyan/langgraph
- **LangChain**: https://github.com/langchain-ai/langchain
- **CLAW BOT**: `E:\CLAW BOT`

## Przykład: kompleksowy workflow

```
User: "Zapamiętaj że mogę pracować 9-17. Ile czasu pozostało dziś do konca?"

1. [security_check] ✓ ALLOW
2. [parse_intent] → Query: "time_until_end" + "memory_store"
3. [llm_reasoning] → LLM: "Current time: 14:00. End: 17:00. Difference: 3 hours"
4. [human_approval] ✓ (auto-approved)
5. [execute]
   - Store memory: "work_hours" = "9-17"
   - Execute: "Zapamiętałem. Zostało 3 godziny do końca pracy!"

Thoughts: [
  "✓ Cerber: ALLOWED",
  "Intent detected: memory_store + query",
  "LLM reasoning step",
  "✓ Human approval (auto)",
  "Executed successfully"
]
```

---

**CLAW BOT teraz ma szanse tworzenia zaawansowanych, stateful agentów z LangGraph!** 🎯
