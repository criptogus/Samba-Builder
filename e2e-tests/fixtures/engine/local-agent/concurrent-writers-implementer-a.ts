import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

export const fixture: LocalAgentFixture = {
  description:
    "Write as Implementer A, then stall until the turn is cancelled",
  turns: [
    {
      text: "I'll make the scoped Sidekick A edit.",
      toolCalls: [
        {
          name: "write_file",
          args: {
            path: "src/concurrent/sidekick-a.ts",
            content: `export const sidekickA = true;
`,
            description: "Record Sidekick A's concurrent edit",
          },
        },
      ],
    },
    {
      // Keep the Implementer's turn open so the owning root stays pending and
      // the test can cancel this run mid-flight. (The former web_fetch engine
      // tool no longer exists in the BYOK toolset.)
      delayMs: 30_000,
      text: "Sidekick A is still working...",
    },
  ],
};
