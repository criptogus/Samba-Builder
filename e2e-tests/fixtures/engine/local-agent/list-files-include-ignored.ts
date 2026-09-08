import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

export const fixture: LocalAgentFixture = {
  description: "List files including ignored .samba files",
  turns: [
    {
      text: "I'll list all files including the ignored .samba directory for you.",
      toolCalls: [
        {
          name: "list_files",
          args: {
            directory: ".samba",
            recursive: true,
            include_ignored: true,
          },
        },
      ],
    },
    {
      text: "Here are the ignored .samba files.",
    },
  ],
};
