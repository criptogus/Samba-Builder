# Claude Code Configuration

This directory contains Claude Code configuration for the Samba project.

## Skills

Skills are invoked with `/samba:<skill>`. Available skills:

| Skill                               | Description                                              | Uses                                            |
| ----------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| `/samba:plan-to-issue`              | Convert a plan to a GitHub issue                         | -                                               |
| `/samba:fix-issue`                  | Fix a GitHub issue                                       | `pr-push`                                       |
| `/samba:pr-fix`                     | Fix PR issues from CI failures or review comments        | `pr-fix:comments`, `pr-fix:ci`                  |
| `/samba:pr-fix:comments`            | Address unresolved PR review comments                    | `pr-push`                                       |
| `/samba:pr-fix:ci`                  | Fix latest-run E2E and cross-platform unit test failures | `deflake-e2e-from-run`, `e2e-rebase`, `pr-push` |
| `/samba:pr-rebase`                  | Rebase the current branch                                | `pr-push`                                       |
| `/samba:pr-push`                    | Push changes and create/update a PR                      | `remember-learnings`                            |
| `/samba:e2e-rebase`                 | Rebase E2E test snapshots                                | -                                               |
| `/samba:deflake-e2e`                | Deflake flaky E2E tests                                  | -                                               |
| `/samba:deflake-e2e-recent-commits` | Gather flaky tests from recent CI runs and deflake them  | `deflake-e2e`, `pr-push`                        |
| `/samba:session-debug`              | Debug session issues                                     | -                                               |
| `/samba:pr-screencast`              | Record visual demo of PR feature                         | -                                               |
| `/samba:feedback-to-issues`         | Turn customer feedback into GitHub issues                | -                                               |
| `/samba:promote-beta-to-stable`     | Promote latest pre-release to stable release             | -                                               |
| `/remember-learnings`               | Capture session learnings into AGENTS.md/rules           | -                                               |
