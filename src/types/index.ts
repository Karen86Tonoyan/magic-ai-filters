// ============================================================
// CLAW BOT — Typy globalne
// ============================================================

export type ChannelType = "telegram" | "discord" | "webchat" | "cli";
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  channelType: ChannelType;
  channelUserId: string;
  sessionId: string;
}

export interface Session {
  id: string;
  channelType: ChannelType;
  channelUserId: string;
  channelChatId: string;
  displayName: string;
  createdAt: Date;
  lastActiveAt: Date;
  history: Message[];
  isAuthorized: boolean;
  metadata: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute(args: Record<string, unknown>, session: Session): Promise<unknown>;
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface Skill {
  name: string;
  description: string;
  triggers?: string[];
  handle(message: string, session: Session): Promise<string | null>;
}

export interface GatewayEvent {
  type: string;
  sessionId: string;
  payload: unknown;
  timestamp: Date;
}

export interface ChannelAdapter {
  type: ChannelType;
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(chatId: string, content: string): Promise<void>;
}

export interface SecurityContext {
  channelType: ChannelType;
  userId: string;
  username?: string;
  isWhitelisted: boolean;
  isRateLimited: boolean;
  threatLevel: "none" | "low" | "medium" | "high";
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  channelType: ChannelType;
  userId: string;
  action: string;
  message?: string;
  response?: string;
  threatLevel: string;
  duration?: number;
}
