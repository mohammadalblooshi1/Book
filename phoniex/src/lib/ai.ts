import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { agentModels } from "@/lib/site";

export const ALLOWED_MODELS: string[] = agentModels.map((m) => m.id);

let client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

/** Server-side fallback on safety refusals is supported on Opus/Sonnet 5.5, not Haiku 5.5. */
export function supportsServerFallback(model: string) {
  return model === "claude-opus-5-5" || model === "claude-sonnet-5-5";
}

type AgentForPrompt = {
  name: string;
  role_description: string;
  instructions: string;
  knowledge: string;
  approval_policy: string;
};

const APPROVAL_TEXT: Record<string, string> = {
  none: "You may complete routine requests directly.",
  sensitive:
    "For anything sensitive, financial, safety-critical or irreversible, do not act or promise an outcome: explain what you recommend and say an authorized staff member must approve it.",
  all: "You never take actions yourself. For every request that would change something, describe the recommended action and say it requires approval from an authorized staff member.",
};

export function buildSystemPrompt(agent: AgentForPrompt, orgName: string) {
  return [
    `You are "${agent.name}", an AI agent operating for the business "${orgName}" on the PHONIEX Intelligence platform.`,
    agent.role_description && `Your role: ${agent.role_description}`,
    agent.instructions && `Operator instructions:\n${agent.instructions}`,
    APPROVAL_TEXT[agent.approval_policy] ?? APPROVAL_TEXT.sensitive,
    "Platform rules: Answer from the approved knowledge below and general knowledge only. If information is missing or uncertain, say so instead of guessing. Never invent prices, availability, bookings or live readings. Label estimates and forecasts as estimates and state assumptions. You have no tools connected yet, so you cannot look up live systems or take actions — say so if asked.",
    agent.knowledge
      ? `<approved_knowledge>\n${agent.knowledge}\n</approved_knowledge>`
      : "No company knowledge has been added yet.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** True when a real AI provider key is configured; otherwise agents run in demo mode. */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Simulated reply used in demo mode, clearly labelled as not AI-generated. */
export function demoReply(agent: { name: string; role_description: string; knowledge: string }, question: string) {
  const lines = agent.knowledge.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = question.toLowerCase().match(/[a-z؀-ۿ]{4,}/g) ?? [];
  const matches = lines.filter((l) => words.some((w) => l.toLowerCase().includes(w))).slice(0, 3);
  return [
    "[DEMO MODE — simulated reply. No AI model is connected yet.]",
    "",
    `I'm ${agent.name}. ${agent.role_description}`,
    matches.length
      ? `From the approved knowledge, these entries look relevant to your question:\n${matches.map((m) => `• ${m}`).join("\n")}`
      : agent.knowledge
        ? "I couldn't find anything in the approved knowledge that matches your question, so I would escalate it to a staff member."
        : "No approved knowledge has been added for this agent yet. Add FAQs, services and policies in the configuration panel.",
    "",
    "When an AI key is added, this agent will give full answers using its instructions and knowledge.",
  ].join("\n");
}
