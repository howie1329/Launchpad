<!-- agentkit:start workflows -->
# Project Workflows

## Purpose

This document defines lightweight workflows for research, planning, implementation, review, and release.

## Choose The Right Document

| Situation | Use |
| --- | --- |
| Tiny obvious fix | No formal planning doc required |
| Product, architecture, routes, data, AI, memory | `docs/architecture.md` |
| UI, styling, layout, navigation, components | `docs/DESIGN-SYSTEM.md` |
| SvelteKit routes, load functions, server routes, rendering, data loading | `docs/STACK.md` |
| Final handoff or PR explanation | `docs/CHANGE-EXPLANATION.md` |

## Research-Only Workflow

Use this when the task asks for investigation, options, or recommendations without coding.

1. Confirm the research question and scope.
2. Inspect relevant code, docs, tests, and history.
3. Use external sources only when current ecosystem knowledge is needed.
4. Separate facts from recommendations.
5. Summarize trade-offs, risks, and a recommended path.
6. Do not edit files unless the task changes from research to implementation.

## Planning Workflow

Use a concise implementation plan for non-trivial work with multiple files, user-facing behavior, schema changes, security/privacy implications, or unclear acceptance criteria.

Tiny fixes can skip formal planning when the change is obvious and low risk.

## Branch Workflow

- Prefer an issue-linked branch when available.
- Use short, descriptive branch names.
- Keep each branch focused on one coherent change.

## Implementation Workflow

1. Read the issue, plan, or request.
2. Inspect existing patterns and nearby tests.
3. Read relevant companion guidance from `AGENTS.md`.
4. Make the smallest complete change.
5. Add or update tests where behavior changes.
6. Run relevant checks.
7. Review the diff before handoff.
8. Explain the change using `docs/CHANGE-EXPLANATION.md` when relevant.

## Pause And Ask Triggers

Pause and ask before:

- expanding scope beyond the request
- adding dependencies
- changing schemas or migrations
- changing auth, permissions, privacy, billing, data retention, or memory-sync behavior
- running destructive commands unless explicitly requested
- changing design tokens, themes, or foundational layout rules
- performing broad refactors or formatting-only rewrites
- removing tests or weakening validation

## Review Workflow

Review for correctness first, then maintainability, tests, UX, security, and style.

Call out:

- bugs or regressions
- missing validation or error handling
- missing authorization checks
- overly broad abstractions
- missing tests for changed behavior
- UI states that are missing or inaccessible
- unclear handoff, risks, or rollout notes

## Release Workflow

Before release:

- Confirm relevant checks pass.
- Confirm docs match behavior.
- Confirm environment variables and schema changes are documented.
- Confirm no secrets or local-only files are included.
- Confirm rollback or mitigation steps for risky changes.
<!-- agentkit:end workflows -->
