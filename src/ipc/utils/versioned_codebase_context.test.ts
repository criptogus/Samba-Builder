import {
  parseFilesFromMessage,
  processChatMessagesWithVersionedFiles,
} from "@/ipc/utils/versioned_codebase_context";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { CodebaseFile } from "@/utils/codebase";
import crypto from "node:crypto";

// Mock git_utils
vi.mock("@/ipc/utils/git_utils", () => ({
  getFileAtCommit: vi.fn(),
  getCurrentCommitHash: vi.fn().mockResolvedValue("mock-current-commit-hash"),
  isGitStatusClean: vi.fn().mockResolvedValue(true),
}));

// Mock electron-log
vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("parseFilesFromMessage", () => {
  describe("samba-read tags", () => {
    it("should parse a single samba-read tag", () => {
      const input =
        '<samba-read path="src/components/Button.tsx"></samba-read>';
      const result = parseFilesFromMessage(input);
      expect(result).toEqual(["src/components/Button.tsx"]);
    });

    it("should parse multiple samba-read tags", () => {
      const input = `
        <samba-read path="src/components/Button.tsx"></samba-read>
        <samba-read path="src/utils/helpers.ts"></samba-read>
        <samba-read path="src/styles/main.css"></samba-read>
      `;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/utils/helpers.ts",
        "src/styles/main.css",
      ]);
    });

    it("should trim whitespace from file paths in samba-read tags", () => {
      const input =
        '<samba-read path="  src/components/Button.tsx  "></samba-read>';
      const result = parseFilesFromMessage(input);
      expect(result).toEqual(["src/components/Button.tsx"]);
    });

    it("should skip empty path attributes", () => {
      const input = `
        <samba-read path="src/components/Button.tsx"></samba-read>
        <samba-read path=""></samba-read>
        <samba-read path="src/utils/helpers.ts"></samba-read>
      `;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should handle file paths with special characters", () => {
      const input =
        '<samba-read path="src/components/@special/Button-v2.tsx"></samba-read>';
      const result = parseFilesFromMessage(input);
      expect(result).toEqual(["src/components/@special/Button-v2.tsx"]);
    });
  });

  describe("samba-code-search-result tags", () => {
    it("should parse a single file from samba-code-search-result", () => {
      const input = `<samba-code-search-result>
src/components/Button.tsx
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual(["src/components/Button.tsx"]);
    });

    it("should parse multiple files from samba-code-search-result", () => {
      const input = `<samba-code-search-result>
src/components/Button.tsx
src/components/Input.tsx
src/utils/helpers.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should trim whitespace from each line", () => {
      const input = `<samba-code-search-result>
  src/components/Button.tsx  
    src/components/Input.tsx    
src/utils/helpers.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should skip empty lines in samba-code-search-result", () => {
      const input = `<samba-code-search-result>
src/components/Button.tsx

src/components/Input.tsx


src/utils/helpers.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should skip lines that look like tags (starting with < or >)", () => {
      const input = `<samba-code-search-result>
src/components/Button.tsx
<some-tag>
src/components/Input.tsx
>some-line
src/utils/helpers.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should handle multiple samba-code-search-result tags", () => {
      const input = `<samba-code-search-result>
src/components/Button.tsx
src/components/Input.tsx
</samba-code-search-result>

Some text in between

<samba-code-search-result>
src/utils/helpers.ts
src/styles/main.css
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
        "src/styles/main.css",
      ]);
    });
  });

  describe("mixed tags", () => {
    it("should parse both samba-read and samba-code-search-result tags", () => {
      const input = `
<samba-read path="src/config/app.ts"></samba-read>

<samba-code-search-result>
src/components/Button.tsx
src/components/Input.tsx
</samba-code-search-result>

<samba-read path="src/utils/helpers.ts"></samba-read>
`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/config/app.ts",
        "src/components/Button.tsx",
        "src/components/Input.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should deduplicate file paths", () => {
      const input = `
<samba-read path="src/components/Button.tsx"></samba-read>
<samba-read path="src/components/Button.tsx"></samba-read>

<samba-code-search-result>
src/components/Button.tsx
src/utils/helpers.ts
</samba-code-search-result>
`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Button.tsx",
        "src/utils/helpers.ts",
      ]);
    });

    it("should handle complex real-world example", () => {
      const input = `
Here's what I found:

<samba-read path="src/components/Header.tsx"></samba-read>

I also searched for related files:

<samba-code-search-result>
src/components/Header.tsx
src/components/Footer.tsx
src/styles/layout.css
</samba-code-search-result>

Let me also check the config:

<samba-read path="src/config/site.ts"></samba-read>

And finally:

<samba-code-search-result>
src/utils/navigation.ts
src/utils/theme.ts
</samba-code-search-result>
`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/components/Header.tsx",
        "src/components/Footer.tsx",
        "src/styles/layout.css",
        "src/config/site.ts",
        "src/utils/navigation.ts",
        "src/utils/theme.ts",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should return empty array for empty string", () => {
      const input = "";
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([]);
    });

    it("should return empty array when no tags present", () => {
      const input = "This is just some regular text without any tags.";
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([]);
    });

    it("should handle malformed tags gracefully", () => {
      const input = `
<samba-read path="src/file1.ts"
<samba-code-search-result>
src/file2.ts
`;
      const result = parseFilesFromMessage(input);
      // Should not match unclosed tags
      expect(result).toEqual([]);
    });

    it("should handle nested angle brackets in file paths", () => {
      const input =
        '<samba-read path="src/components/Generic<T>.tsx"></samba-read>';
      const result = parseFilesFromMessage(input);
      expect(result).toEqual(["src/components/Generic<T>.tsx"]);
    });

    it("should preserve file path case sensitivity", () => {
      const input = `<samba-code-search-result>
src/Components/Button.tsx
src/components/button.tsx
SRC/COMPONENTS/BUTTON.TSX
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "src/Components/Button.tsx",
        "src/components/button.tsx",
        "SRC/COMPONENTS/BUTTON.TSX",
      ]);
    });

    it("should handle very long file paths", () => {
      const longPath =
        "src/very/deeply/nested/directory/structure/with/many/levels/components/Button.tsx";
      const input = `<samba-read path="${longPath}"></samba-read>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([longPath]);
    });

    it("should handle file paths with dots", () => {
      const input = `<samba-code-search-result>
./src/components/Button.tsx
../utils/helpers.ts
../../config/app.config.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "./src/components/Button.tsx",
        "../utils/helpers.ts",
        "../../config/app.config.ts",
      ]);
    });

    it("should handle absolute paths", () => {
      const input = `<samba-code-search-result>
/absolute/path/to/file.tsx
/another/absolute/path.ts
</samba-code-search-result>`;
      const result = parseFilesFromMessage(input);
      expect(result).toEqual([
        "/absolute/path/to/file.tsx",
        "/another/absolute/path.ts",
      ]);
    });
  });
});

describe("processChatMessagesWithVersionedFiles", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  // Helper to compute SHA-256 hash
  const hashContent = (content: string): string => {
    return crypto.createHash("sha256").update(content).digest("hex");
  };

  describe("basic functionality", () => {
    it("should process files parameter and create fileIdToContent and fileReferences", async () => {
      const files: CodebaseFile[] = [
        {
          path: "src/components/Button.tsx",
          content: "export const Button = () => <button>Click</button>;",
        },
        {
          path: "src/utils/helpers.ts",
          content: "export const add = (a: number, b: number) => a + b;",
        },
      ];

      const chatMessages: ModelMessage[] = [];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      // Check fileIdToContent contains hashed content
      const buttonHash = hashContent(files[0].content);
      const helperHash = hashContent(files[1].content);

      expect(result.fileIdToContent[buttonHash]).toBe(files[0].content);
      expect(result.fileIdToContent[helperHash]).toBe(files[1].content);

      // Check fileReferences
      expect(result.fileReferences).toHaveLength(2);
      expect(result.fileReferences[0]).toEqual({
        path: "src/components/Button.tsx",
        fileId: buttonHash,
      });
      expect(result.fileReferences[1]).toEqual({
        path: "src/utils/helpers.ts",
        fileId: helperHash,
      });

      // messageIndexToFilePathToFileId should be empty
      expect(result.messageIndexToFilePathToFileId).toEqual({});
    });

    it("should handle empty files array", async () => {
      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(result.fileIdToContent).toEqual({});
      expect(result.fileReferences).toEqual([]);
      expect(result.messageIndexToFilePathToFileId).toEqual({});
    });
  });

  describe("processing assistant messages", () => {
    it("should process assistant messages with sourceCommitHash", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const fileContent = "const oldVersion = 'content';";
      mockGetFileAtCommit.mockResolvedValue(fileContent);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content:
            'I found this file: <samba-read path="src/old.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "abc123",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      // Verify getFileAtCommit was called correctly
      expect(mockGetFileAtCommit).toHaveBeenCalledWith({
        path: appPath,
        filePath: "src/old.ts",
        commitHash: "abc123",
      });

      // Check fileIdToContent
      const fileHash = hashContent(fileContent);
      expect(result.fileIdToContent[fileHash]).toBe(fileContent);

      // Check messageIndexToFilePathToFileId
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({
        "src/old.ts": fileHash,
      });
    });

    it("should process messages with array content type", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const fileContent = "const arrayContent = 'test';";
      mockGetFileAtCommit.mockResolvedValue(fileContent);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: 'Here is the file: <samba-read path="src/array.ts"></samba-read>',
            },
            {
              type: "text",
              text: "Additional text",
            },
          ],
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "def456",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalledWith({
        path: appPath,
        filePath: "src/array.ts",
        commitHash: "def456",
      });

      const fileHash = hashContent(fileContent);
      expect(result.fileIdToContent[fileHash]).toBe(fileContent);
      expect(result.messageIndexToFilePathToFileId[0]["src/array.ts"]).toBe(
        fileHash,
      );
    });

    it("should skip user messages", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "user",
          content:
            'Check this: <samba-read path="src/user-file.ts"></samba-read>',
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      // getFileAtCommit should not be called for user messages
      expect(mockGetFileAtCommit).not.toHaveBeenCalled();
      expect(result.messageIndexToFilePathToFileId).toEqual({});
    });

    it("should skip assistant messages without sourceCommitHash", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content:
            'File here: <samba-read path="src/no-commit.ts"></samba-read>',
          // No providerOptions
        },
        {
          role: "assistant",
          content:
            'Another file: <samba-read path="src/no-commit2.ts"></samba-read>',
          providerOptions: {
            // samba-engine not set
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).not.toHaveBeenCalled();
      expect(result.messageIndexToFilePathToFileId).toEqual({});
    });

    it("should skip messages with non-text content", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: [],
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "abc123",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).not.toHaveBeenCalled();
      expect(result.messageIndexToFilePathToFileId).toEqual({});
    });
  });

  describe("parsing multiple file paths", () => {
    it("should process multiple files from samba-code-search-result", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const file1Content = "file1 content";
      const file2Content = "file2 content";

      mockGetFileAtCommit
        .mockResolvedValueOnce(file1Content)
        .mockResolvedValueOnce(file2Content);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: `<samba-code-search-result>
src/file1.ts
src/file2.ts
</samba-code-search-result>`,
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalledTimes(2);
      expect(mockGetFileAtCommit).toHaveBeenCalledWith({
        path: appPath,
        filePath: "src/file1.ts",
        commitHash: "commit1",
      });
      expect(mockGetFileAtCommit).toHaveBeenCalledWith({
        path: appPath,
        filePath: "src/file2.ts",
        commitHash: "commit1",
      });

      const file1Hash = hashContent(file1Content);
      const file2Hash = hashContent(file2Content);

      expect(result.fileIdToContent[file1Hash]).toBe(file1Content);
      expect(result.fileIdToContent[file2Hash]).toBe(file2Content);

      expect(result.messageIndexToFilePathToFileId[0]).toEqual({
        "src/file1.ts": file1Hash,
        "src/file2.ts": file2Hash,
      });
    });

    it("should process mixed samba-read and samba-code-search-result tags", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      mockGetFileAtCommit
        .mockResolvedValueOnce("file1")
        .mockResolvedValueOnce("file2")
        .mockResolvedValueOnce("file3");

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: `
<samba-read path="src/file1.ts"></samba-read>

<samba-code-search-result>
src/file2.ts
src/file3.ts
</samba-code-search-result>
`,
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "hash1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalledTimes(3);
      expect(Object.keys(result.messageIndexToFilePathToFileId[0])).toEqual([
        "src/file1.ts",
        "src/file2.ts",
        "src/file3.ts",
      ]);
    });
  });

  describe("error handling", () => {
    it("should handle file not found (returns null)", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      // Simulate file not found
      mockGetFileAtCommit.mockResolvedValue(null);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content:
            'Missing file: <samba-read path="src/missing.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalled();

      // File should not be in results
      expect(result.fileIdToContent).toEqual({});
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({});
    });

    it("should handle getFileAtCommit throwing an error", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      // Simulate error
      mockGetFileAtCommit.mockRejectedValue(new Error("Git error"));

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: 'Error file: <samba-read path="src/error.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      // Should not throw - errors are caught and logged
      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalled();
      expect(result.fileIdToContent).toEqual({});
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({});
    });

    it("should process some files successfully and skip others that error", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const successContent = "success file";

      mockGetFileAtCommit
        .mockResolvedValueOnce(successContent)
        .mockRejectedValueOnce(new Error("Error"))
        .mockResolvedValueOnce(null);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: `<samba-code-search-result>
src/success.ts
src/error.ts
src/missing.ts
</samba-code-search-result>`,
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalledTimes(3);

      // Only the successful file should be in results
      const successHash = hashContent(successContent);
      expect(result.fileIdToContent[successHash]).toBe(successContent);
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({
        "src/success.ts": successHash,
      });
    });
  });

  describe("multiple messages", () => {
    it("should process multiple messages with different commits", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const file1AtCommit1 = "file1 at commit1";
      const file1AtCommit2 = "file1 at commit2 - different content";

      mockGetFileAtCommit
        .mockResolvedValueOnce(file1AtCommit1)
        .mockResolvedValueOnce(file1AtCommit2);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "user",
          content: "Show me file1",
        },
        {
          role: "assistant",
          content: 'Here it is: <samba-read path="src/file1.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
        {
          role: "user",
          content: "Show me it again",
        },
        {
          role: "assistant",
          content:
            'Here it is again: <samba-read path="src/file1.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit2",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(mockGetFileAtCommit).toHaveBeenCalledTimes(2);
      expect(mockGetFileAtCommit).toHaveBeenNthCalledWith(1, {
        path: appPath,
        filePath: "src/file1.ts",
        commitHash: "commit1",
      });
      expect(mockGetFileAtCommit).toHaveBeenNthCalledWith(2, {
        path: appPath,
        filePath: "src/file1.ts",
        commitHash: "commit2",
      });

      const hash1 = hashContent(file1AtCommit1);
      const hash2 = hashContent(file1AtCommit2);

      // Both versions should be in fileIdToContent
      expect(result.fileIdToContent[hash1]).toBe(file1AtCommit1);
      expect(result.fileIdToContent[hash2]).toBe(file1AtCommit2);

      // Message index 1 (first assistant message)
      expect(result.messageIndexToFilePathToFileId[1]).toEqual({
        "src/file1.ts": hash1,
      });

      // Message index 3 (second assistant message)
      expect(result.messageIndexToFilePathToFileId[3]).toEqual({
        "src/file1.ts": hash2,
      });
    });
  });

  describe("integration with files parameter", () => {
    it("should combine files parameter with versioned files from messages", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const versionedContent = "old version from git";
      mockGetFileAtCommit.mockResolvedValue(versionedContent);

      const files: CodebaseFile[] = [
        {
          path: "src/current.ts",
          content: "current version",
        },
      ];

      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: 'Old version: <samba-read path="src/old.ts"></samba-read>',
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "abc123",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      const currentHash = hashContent("current version");
      const oldHash = hashContent(versionedContent);

      // Both should be present
      expect(result.fileIdToContent[currentHash]).toBe("current version");
      expect(result.fileIdToContent[oldHash]).toBe(versionedContent);

      // fileReferences should only include files from the files parameter
      expect(result.fileReferences).toHaveLength(1);
      expect(result.fileReferences[0].path).toBe("src/current.ts");

      // messageIndexToFilePathToFileId should have the versioned file
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({
        "src/old.ts": oldHash,
      });
    });
  });

  describe("content hashing", () => {
    it("should deduplicate identical content with same hash", async () => {
      const { getFileAtCommit } = await import("@/ipc/utils/git_utils");
      const mockGetFileAtCommit = vi.mocked(getFileAtCommit);

      const sameContent = "identical content";

      // Both files have the same content
      mockGetFileAtCommit
        .mockResolvedValueOnce(sameContent)
        .mockResolvedValueOnce(sameContent);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: `<samba-code-search-result>
src/file1.ts
src/file2.ts
</samba-code-search-result>`,
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "commit1",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      const hash = hashContent(sameContent);

      // fileIdToContent should only have one entry for the hash
      expect(Object.keys(result.fileIdToContent)).toHaveLength(1);
      expect(result.fileIdToContent[hash]).toBe(sameContent);

      // Both files should point to the same hash
      expect(result.messageIndexToFilePathToFileId[0]).toEqual({
        "src/file1.ts": hash,
        "src/file2.ts": hash,
      });
    });
  });

  describe("hasExternalChanges", () => {
    it("should default to true when no assistant message has commitHash", async () => {
      const { getCurrentCommitHash, isGitStatusClean } =
        await import("@/ipc/utils/git_utils");
      const mockGetCurrentCommitHash = vi.mocked(getCurrentCommitHash);
      const mockIsGitStatusClean = vi.mocked(isGitStatusClean);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: "No commit hash here",
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "abc123",
              commitHash: null,
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(result.hasExternalChanges).toBe(true);
      expect(mockGetCurrentCommitHash).not.toHaveBeenCalled();
      expect(mockIsGitStatusClean).not.toHaveBeenCalled();
    });

    it("should be false when latest assistant commit matches current and git status is clean", async () => {
      const { getCurrentCommitHash, isGitStatusClean } =
        await import("@/ipc/utils/git_utils");
      const mockGetCurrentCommitHash = vi.mocked(getCurrentCommitHash);
      const mockIsGitStatusClean = vi.mocked(isGitStatusClean);

      mockGetCurrentCommitHash.mockResolvedValue("commit-123");
      mockIsGitStatusClean.mockResolvedValue(true);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: "Assistant message with commit hash",
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "ignored-for-this-test",
              commitHash: "commit-123",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(result.hasExternalChanges).toBe(false);
      expect(mockGetCurrentCommitHash).toHaveBeenCalledWith({ path: appPath });
      expect(mockIsGitStatusClean).toHaveBeenCalledWith({ path: appPath });
    });

    it("should be true when latest assistant commit differs from current", async () => {
      const { getCurrentCommitHash, isGitStatusClean } =
        await import("@/ipc/utils/git_utils");
      const mockGetCurrentCommitHash = vi.mocked(getCurrentCommitHash);
      const mockIsGitStatusClean = vi.mocked(isGitStatusClean);

      mockGetCurrentCommitHash.mockResolvedValue("current-commit");
      mockIsGitStatusClean.mockResolvedValue(true);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: "Assistant message with different commit hash",
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "ignored-for-this-test",
              commitHash: "older-commit",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(result.hasExternalChanges).toBe(true);
      expect(mockGetCurrentCommitHash).toHaveBeenCalledWith({ path: appPath });
      expect(mockIsGitStatusClean).toHaveBeenCalledWith({ path: appPath });
    });

    it("should be true when git status is dirty even if commits match", async () => {
      const { getCurrentCommitHash, isGitStatusClean } =
        await import("@/ipc/utils/git_utils");
      const mockGetCurrentCommitHash = vi.mocked(getCurrentCommitHash);
      const mockIsGitStatusClean = vi.mocked(isGitStatusClean);

      mockGetCurrentCommitHash.mockResolvedValue("same-commit");
      mockIsGitStatusClean.mockResolvedValue(false);

      const files: CodebaseFile[] = [];
      const chatMessages: ModelMessage[] = [
        {
          role: "assistant",
          content: "Assistant message with matching commit but dirty status",
          providerOptions: {
            "samba-engine": {
              sourceCommitHash: "ignored-for-this-test",
              commitHash: "same-commit",
            },
          },
        },
      ];
      const appPath = "/test/app";

      const result = await processChatMessagesWithVersionedFiles({
        files,
        chatMessages,
        appPath,
      });

      expect(result.hasExternalChanges).toBe(true);
      expect(mockGetCurrentCommitHash).toHaveBeenCalledWith({ path: appPath });
      expect(mockIsGitStatusClean).toHaveBeenCalledWith({ path: appPath });
    });
  });
});
