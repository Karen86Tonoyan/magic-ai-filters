// ============================================================
// CLAW BOT — LangGraph-inspired Agent Workflow
// Multi-step stateful agent with human-in-the-loop
// ============================================================

import { logger } from "../logger/index.js";
import { cerber } from "../security/cerber.js";
import type { Session } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

// ——— State Definition ———————————————————————————————————————

export interface AgentState {
  sessionId: string;
  userId: string;
  input: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  thoughts: string[];
  decision: "PROCEED" | "BLOCK" | "WAIT_HUMAN" | "COMPLETE";
  result: string;
  metadata: {
    cerberVerdict?: unknown;
    toolsCalled?: string[];
    timestamp: Date;
  };
}

// ——— Node Functions ——————————————————————————————————————————

export class WorkflowNode {
  name: string;
  handler: (state: AgentState) => Promise<Partial<AgentState>>;

  constructor(
    name: string,
    handler: (state: AgentState) => Promise<Partial<AgentState>>
  ) {
    this.name = name;
    this.handler = handler;
  }

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    logger.debug(`Node executing: ${this.name}`, { sessionId: state.sessionId });
    const result = await this.handler(state);
    logger.debug(`Node completed: ${this.name}`, { sessionId: state.sessionId });
    return result;
  }
}

// ——— Graph Definition ————————————————————————————————————————

export class WorkflowGraph {
  private nodes: Map<string, WorkflowNode> = new Map();
  private edges: Map<string, string[]> = new Map(); // from → [to, to, ...]
  private startNode: string | null = null;

  addNode(node: WorkflowNode): void {
    this.nodes.set(node.name, node);
  }

  addEdge(from: string, to: string): void {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push(to);
  }

  setStart(nodeId: string): void {
    this.startNode = nodeId;
  }

  // Kompiluj i wykonaj
  async execute(state: AgentState): Promise<AgentState> {
    if (!this.startNode) {
      throw new Error("Start node not set");
    }

    let currentNode = this.startNode;
    const maxSteps = 20; // Prevent infinite loops
    let step = 0;

    while (step < maxSteps) {
      step++;

      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node not found: ${currentNode}`);
      }

      // Execute node
      const update = await node.execute(state);
      state = { ...state, ...update };

      logger.info("Workflow step", {
        sessionId: state.sessionId,
        step,
        node: currentNode,
        decision: state.decision,
      });

      // Check decision
      if (state.decision === "COMPLETE" || state.decision === "WAIT_HUMAN") {
        break;
      }

      // Get next node
      const nextNodes = this.edges.get(currentNode) || [];
      if (nextNodes.length === 0) {
        state.decision = "COMPLETE";
        break;
      }

      // Simple routing: use first edge
      currentNode = nextNodes[0];
    }

    if (step >= maxSteps) {
      logger.warn("Workflow exceeded max steps", { sessionId: state.sessionId });
    }

    return state;
  }
}

// ——— Built-in Nodes ——————————————————————————————————————————

export const securityCheckNode = new WorkflowNode(
  "security_check",
  async (state) => {
    const ruling = cerber.judge(state.input);

    if (ruling.decision === "BLOCK") {
      return {
        decision: "BLOCK",
        thoughts: [...state.thoughts, `🐕 Cerber: ${ruling.blockedReason}`],
        result: `Cerber Guardian odrzucił zapytanie: ${ruling.blockedReason}`,
      };
    }

    const safeInput =
      ruling.decision === "MODIFY" ? ruling.modification || state.input : state.input;

    return {
      decision: "PROCEED",
      input: safeInput,
      thoughts: [
        ...state.thoughts,
        `✓ Cerber: ${ruling.decision === "MODIFY" ? "MODIFIED" : "ALLOWED"}`,
      ],
      metadata: {
        ...state.metadata,
        cerberVerdict: ruling.verdict,
      },
    };
  }
);

export const parseIntentNode = new WorkflowNode("parse_intent", async (state) => {
  const input = state.input.toLowerCase();

  let intent = "general";
  if (input.includes("co wiesz") || input.includes("co zapamiętałeś")) {
    intent = "recall_memory";
  } else if (input.includes("zapamiętaj")) {
    intent = "store_memory";
  } else if (input.includes("oblicz") || input.includes("ile to")) {
    intent = "calculate";
  } else if (input.includes("jaka godzina") || input.includes("jaka data")) {
    intent = "datetime";
  }

  return {
    thoughts: [...state.thoughts, `Intent detected: ${intent}`],
    metadata: {
      ...state.metadata,
      intent,
    },
  };
});

export const llmReasoningNode = new WorkflowNode("llm_reasoning", async (state) => {
  // TODO: Call actual LLM here
  return {
    thoughts: [
      ...state.thoughts,
      "LLM reasoning step (TODO: integrate actual LLM)",
    ],
  };
});

export const humanApprovalNode = new WorkflowNode(
  "human_approval",
  async (state) => {
    // TODO: Implement human-in-the-loop
    // For now: auto-approve
    return {
      decision: "PROCEED",
      thoughts: [...state.thoughts, "✓ Human approval (auto for now)"],
    };
  }
);

export const executeNode = new WorkflowNode("execute", async (state) => {
  // Execute tools/skills based on intent
  const result = `Executed: ${state.input}`;

  return {
    decision: "COMPLETE",
    result,
    thoughts: [...state.thoughts, `✓ Execution complete`],
  };
});

// ——— Factory Function ———————————————————————————————————————

export function createDefaultGraph(): WorkflowGraph {
  const graph = new WorkflowGraph();

  // Add nodes
  graph.addNode(securityCheckNode);
  graph.addNode(parseIntentNode);
  graph.addNode(llmReasoningNode);
  graph.addNode(humanApprovalNode);
  graph.addNode(executeNode);

  // Add edges
  graph.setStart("security_check");
  graph.addEdge("security_check", "parse_intent");
  graph.addEdge("parse_intent", "llm_reasoning");
  graph.addEdge("llm_reasoning", "human_approval");
  graph.addEdge("human_approval", "execute");

  return graph;
}

// ——— Agent Wrapper —————————————————————————————————————————

export class GraphAgent {
  private graph: WorkflowGraph;

  constructor(graph: WorkflowGraph) {
    this.graph = graph;
  }

  async run(
    session: Session,
    userInput: string
  ): Promise<{
    result: string;
    thoughts: string[];
    metadata: unknown;
  }> {
    const state: AgentState = {
      sessionId: session.id,
      userId: session.channelUserId,
      input: userInput,
      messages: [],
      thoughts: [],
      decision: "PROCEED",
      result: "",
      metadata: {
        timestamp: new Date(),
      },
    };

    const finalState = await this.graph.execute(state);

    return {
      result: finalState.result,
      thoughts: finalState.thoughts,
      metadata: finalState.metadata,
    };
  }
}

// Singleton
const defaultGraph = createDefaultGraph();
export const graphAgent = new GraphAgent(defaultGraph);

export default graphAgent;
