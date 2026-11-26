import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { anthropic, ALLOWED_MODELS, buildSystemPrompt, supportsServerFallback } from "@/lib/ai";

export const maxDuration = 120;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

export async function POST(request: Request, ctx: RouteContext<"/api/agents/[id]/chat">) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const messages = parsed.data.messages;
  if (messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  // RLS guarantees this only returns an agent in one of the user's workspaces.
  const { data: agent } = await supabase
    .from("agents")
    .select("id, org_id, name, role_description, instructions, knowledge, approval_policy, model, effort, status, monthly_message_limit, organizations(name)")
    .eq("id", id)
    .single();
  if (!agent) return Response.json({ error: "Agent not found" }, { status: 404 });
  if (agent.status === "paused") return Response.json({ error: "This agent is paused" }, { status: 409 });
  if (!ALLOWED_MODELS.includes(agent.model)) {
    return Response.json({ error: "Agent model is not allowed" }, { status: 400 });
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent.id)
    .eq("status", "ok")
    .gte("created_at", monthStart.toISOString());
  if ((count ?? 0) >= agent.monthly_message_limit) {
    await supabase.from("agent_runs").insert({
      org_id: agent.org_id, agent_id: agent.id, user_id: user.id, model: agent.model, status: "limited",
    });
    return Response.json({ error: "Monthly message limit reached for this agent" }, { status: 429 });
  }

  const client = anthropic();
  if (!client) {
    return Response.json({ error: "AI is not configured: set ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  const orgName = (agent.organizations as unknown as { name: string } | null)?.name ?? "this business";
  const started = Date.now();
  const encoder = new TextEncoder();

  const log = (fields: { status: string; input_tokens?: number; output_tokens?: number; error?: string }) =>
    supabase.from("agent_runs").insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      user_id: user.id,
      model: agent.model,
      latency_ms: Date.now() - started,
      ...fields,
    });

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          model: agent.model,
          max_tokens: 16000,
          system: buildSystemPrompt(agent, orgName),
          messages: messages as Anthropic.Beta.BetaMessageParam[],
          output_config: { effort: agent.effort as "low" | "medium" | "high" },
          ...(supportsServerFallback(agent.model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await stream.finalMessage();
        const refused = final.stop_reason === "refusal";
        if (refused) {
          controller.enqueue(encoder.encode("\n\n[This request was declined by the model's safety system.]"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n[Response truncated.]"));
        }
        await log({
          status: refused ? "refused" : "ok",
          input_tokens: final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
        });
      } catch (err) {
        let message = "The AI service failed. Please try again.";
        if (err instanceof Anthropic.RateLimitError) message = "The AI service is busy. Please retry in a moment.";
        else if (err instanceof Anthropic.AuthenticationError) message = "The AI API key is invalid.";
        else if (err instanceof Anthropic.APIError) message = `AI service error (${err.status}).`;
        console.error("[agent chat]", err);
        await log({ status: "error", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" });
        controller.enqueue(encoder.encode(`\n\n[${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
