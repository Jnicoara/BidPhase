/**
 * "Where do I go?" — a plain-language navigation helper.
 *
 * ── Deliberately the cheapest thing that works ───────────────────────────────
 * This is lookup and routing, not reasoning. The user types "where do I edit
 * labor rates" and the answer is one of eleven screens. So it runs on the fast,
 * low-cost model tier: the heavier tier is reserved for work that actually
 * needs it, and spending it here would make a help feature cost more per use
 * than the estimating it is helping with.
 *
 * ── The model chooses between options; it never constructs one ───────────────
 * It cannot return a URL. It picks an id from NAVIGATION_TARGETS, and that id
 * is resolved against the same list here before anything is sent back — so an
 * invented destination becomes a text-only answer rather than a dead link. See
 * shared/navigationTargets.ts; this file must not grow its own idea of where
 * the app's screens are.
 *
 * ── It degrades to nothing worse than unhelpful ──────────────────────────────
 * No API key, a refusal, a timeout, unparseable output: all of them return a
 * plain "I'm not sure" with the list of screens. Navigation must never depend
 * on this working.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM, type Tool } from "../_core/llm";
import {
  NAVIGATION_TARGETS,
  NAVIGATION_TARGET_IDS,
  resolveNavigationTarget,
} from "../../shared/navigationTargets";

/**
 * The fast tier, overridable per deployment.
 *
 * Named here rather than inline so the choice is reviewable, and read from the
 * environment because the id for "the cheap one" is a property of whichever
 * gateway is in front of this, not of the app. `listLLMModels()` in
 * server/_core/llm.ts enumerates what the connected gateway actually offers.
 *
 * If the id is wrong the request fails and the helper falls back to text, the
 * same as it does with no key at all — a wrong model here degrades the feature,
 * it does not break the app.
 */
const NAVIGATION_MODEL = process.env.NAVIGATION_MODEL?.trim() || "gpt-4o-mini";

/**
 * The only action the helper can take.
 *
 * A single tool with an enum parameter, which is what makes the closed set
 * real at the model layer as well as in the validation below: there is no
 * shape of output that expresses "go to /admin/delete-everything".
 */
const NAVIGATE_TOOL: Tool = {
  type: "function",
  function: {
    name: "go_to_screen",
    description:
      "Send the user to the screen that answers their question. Only call this when one screen clearly answers it.",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: NAVIGATION_TARGET_IDS,
          description: "Which screen to open.",
        },
        reason: {
          type: "string",
          description:
            "One short sentence telling the user what they will find there. No preamble.",
        },
      },
      required: ["target", "reason"],
    },
  },
};

function systemPrompt(): string {
  const screens = NAVIGATION_TARGETS.map(t => `- ${t.id} (${t.label}): ${t.purpose}`).join("\n");
  return [
    "You help a contractor find their way around an electrical estimating app.",
    "",
    "The screens available:",
    screens,
    "",
    "If one screen clearly answers the question, call go_to_screen with it.",
    "If the question is not about finding a screen, or no screen fits, reply in",
    "one or two short sentences instead of calling the tool.",
    "",
    "Be brief and concrete. This is a signpost, not a tutorial.",
  ].join("\n");
}

export type NavigationAnswer = {
  /** Prose to show. Always present. */
  message: string;
  /** Set only when a real, known screen was chosen. */
  target: { id: string; label: string; path: string } | null;
};

const FALLBACK: NavigationAnswer = {
  message:
    "I'm not sure which screen you want. Try naming what you are trying to do — pricing a material, setting a labor rate, starting a bid.",
  target: null,
};

export const navigationRouter = router({
  ask: protectedProcedure
    .input(z.object({ question: z.string().trim().min(1).max(300) }))
    .mutation(async ({ input }): Promise<NavigationAnswer> => {
      let result;
      try {
        result = await invokeLLM({
          model: NAVIGATION_MODEL,
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: input.question },
          ],
          tools: [NAVIGATE_TOOL],
          toolChoice: "auto",
          maxTokens: 200,
        });
      } catch (error) {
        // Not an error the user needs to see: they can still use the sidebar.
        console.warn("[navigation.ask] unavailable:", error);
        return FALLBACK;
      }

      const choice = result.choices?.[0]?.message;
      const call = choice?.tool_calls?.[0];

      if (call?.function?.name === "go_to_screen") {
        let args: { target?: string; reason?: string } = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // Malformed arguments are the model's problem, not the user's.
          return FALLBACK;
        }

        // The gate. An id outside the list resolves to null and the answer
        // falls back to prose — the user is told nothing useful rather than
        // sent somewhere that does not exist.
        const target = resolveNavigationTarget(args.target);
        if (!target) {
          console.warn(`[navigation.ask] model named an unknown target: ${args.target}`);
          return FALLBACK;
        }

        return {
          message: args.reason?.trim() || `Opening ${target.label}.`,
          target: { id: target.id, label: target.label, path: target.path },
        };
      }

      const text = typeof choice?.content === "string" ? choice.content.trim() : "";
      return text ? { message: text, target: null } : FALLBACK;
    }),
});
