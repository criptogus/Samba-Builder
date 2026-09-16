# Catálogo de tools do agente local

<!-- Gerado por scripts/gen-tool-catalog.mjs — não edite à mão. -->

Regenerar: `npm run gen:tool-catalog`. Conferir sem escrever (CI): `npm run gen:tool-catalog -- --check`.

Fonte: `src/pro/main/ipc/handlers/local_agent/tool_definitions.ts` (ordem de exposição) e os
arquivos em `src/pro/main/ipc/handlers/local_agent/tools/`. Extração estática.

Total: **51 tools**.

| Tool | Consentimento padrão | Descrição dinâmica | Arquivo | Resumo |
| --- | --- | --- | --- | --- |
| `add_dependency` | `ask` | — | `src/pro/main/ipc/handlers/local_agent/tools/add_dependency.ts` | Install or refresh npm packages. |
| `add_integration` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/add_integration.ts` | Prompt the user to choose and set up a database provider for the app. |
| `cancel_agent` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Cancel a running sub-agent at its next safe boundary. |
| `copy_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/copy_file.ts` | Copy a file from one location to another. |
| `delete_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/delete_file.ts` | Delete a file from the codebase |
| `enable_nitro` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/enable_nitro.ts` | — |
| `execute_sandbox_script` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/execute_sandbox_script.ts` | Run a MustardScript program in a sandbox. |
| `execute_sql` | `ask` | — | `src/pro/main/ipc/handlers/local_agent/tools/execute_sql.ts` | Execute SQL on the connected database. |
| `exit_plan` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/exit_plan.ts` | — |
| `explore_chat_history` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/explore_chat_history.ts` | Ask a history-research sub-agent to investigate this app's prior conversations when the user asks about earlier decisions, requirements, failures, or work and the exact wording or location is NOT a... |
| `explore_code` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Explore the configured TypeScript project using compiler-backed symbol and dependency analysis. |
| `followup_task` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Queue a durable follow-up assignment on an existing child thread. |
| `generate_test_assertions` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/generate_test_assertions.ts` | — |
| `get_database_table_schema` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/get_database_table_schema.ts` | Get database table schema as PostgreSQL SQL/DDL. |
| `get_mcp_tool_schema` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/get_mcp_tool_schema.ts` | Get the description and full TypeScript signature of MCP tools by name. |
| `get_neon_project_info` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/get_neon_project_info.ts` | Get Neon project overview: project ID, branches, and table names. |
| `get_supabase_project_info` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/get_supabase_project_info.ts` | Get Supabase project overview: project ID, publishable key, secret names, and table names. |
| `git_diff` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | Show a bounded unified diff for tracked files in the current app. |
| `git_log` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | List recent commits in the current app, newest first, with canonical hashes, author details, timestamps, and messages. |
| `git_restore_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | Restore one regular file from a Git revision into the current app's working tree without changing the index. |
| `git_show_commit` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | Show metadata and a bounded first-parent patch for one commit in the current app. |
| `git_show_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | Read a UTF-8 file as it existed at a Git revision in the current app. |
| `git_status` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/git.ts` | Inspect the current app's Git working tree. |
| `grep` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/grep.ts` | Search for a regex pattern or exact literal text in the codebase using ripgrep. |
| `list_agents` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | List durable sub-agent threads and their current status for this chat. |
| `list_files` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/list_files.ts` | List files in the application directory. |
| `load_skill` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/load_skill.ts` | Read the full instructions of a skill available in this project or on the user's machine. |
| `planning_questionnaire` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/planning_questionnaire.ts` | — |
| `read_chat` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/read_chat.ts` | Read a bounded slice of a chat for this app (including the current chat's earlier, possibly compacted-away messages). |
| `read_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/read_file.ts` | Read the content of a file from the codebase or an attachment path such as attachments:notes.txt. |
| `read_guide` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/read_guide.ts` | Read a detailed instruction guide. |
| `read_logs` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/read_logs.ts` | Read logs at the moment this tool is called. |
| `reinstall_and_restart_app` | `ask` | — | `src/pro/main/ipc/handlers/local_agent/tools/app_lifecycle.ts` | Delete node_modules, reinstall dependencies, and restart the current app's development server. |
| `rename_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/rename_file.ts` | Rename or move a file in the codebase |
| `restart_app` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/app_lifecycle.ts` | Restart the current app's development server without reinstalling dependencies. |
| `run_build` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/run_build.ts` | Run the app's production build as a selective, expensive verification step. |
| `run_pre_commit` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/run_pre_commit.ts` | Stage all current workspace changes and run the repository's configured pre-commit hook. |
| `run_repo_command` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/run_repo_command.ts` | — |
| `run_tests` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/run_tests.ts` | Run the app's Playwright end-to-end tests and get the results back, so you can verify a test you just wrote or edited and iterate until it passes. |
| `run_type_checks` | `always` | sim | `src/pro/main/ipc/handlers/local_agent/tools/run_type_checks.ts` | — |
| `search_chats` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/search_chats.ts` | Search the user's OTHER chats for this app (historical conversations) by keyword. |
| `search_mcp_tools` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/search_mcp_tools.ts` | Search for MCP tools by keyword and get their TypeScript signatures. |
| `search_replace` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/search_replace.ts` | Use this tool to propose a search and replace operation on an existing file. |
| `send_message` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Durably queue a message for an existing sub-agent thread. |
| `set_chat_summary` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/set_chat_summary.ts` | Set the title/summary for this chat. |
| `spawn_agent` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Run a blocking depth-one Explorer or enabled Implementer sub-agent. |
| `update_todos` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/update_todos.ts` | — |
| `wait_agents` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/subagent_tools.ts` | Wait until all specified sub-agents reach a terminal or idle state. |
| `write_app_blueprint` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/write_app_blueprint.ts` | — |
| `write_file` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/write_file.ts` | Create or completely overwrite a file in the codebase |
| `write_plan` | `always` | — | `src/pro/main/ipc/handlers/local_agent/tools/write_plan.ts` | — |
