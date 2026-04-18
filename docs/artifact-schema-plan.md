# Artifact Schema Plan (Chat-First Launchpad)

## Recommendation

Use a hybrid artifact schema:

- `type` (artifact kind)
- `title`
- `contentMarkdown` (canonical editable body)
- `contentFormat` (`markdown` for now)
- `metadata` (small typed object for artifact-specific extras)
- ownership/linking fields (`ownerId`, `projectId?`, `sourceThreadId?`)
- timestamps

This keeps editing simple for users and AI while staying extensible for future artifact types.

## Why markdown is a good fit

- Matches the requirement that artifacts are directly editable and AI-updatable via a draft/apply flow
- Fits the PRD-as-single-document MVP model
- Keeps the model minimal now while allowing future artifact growth

## Flexibility design (without overengineering)

For `type`, there are two viable options:

1. Strict now (`'idea' | 'prd'`)
   - Better validation
   - Requires schema updates for each new artifact type

2. Flexible now (`type: string`) **recommended**
   - No schema churn for each new artifact type
   - Enforce allowed types in app logic/config

Given the chat-first MVP and need for iteration speed, option 2 is the pragmatic choice.

## Guardrail

Store AI/user-editable body in one canonical field:

- `contentMarkdown` (single source of truth)

If additional structure is needed later (for example PRD sections), derive and render from markdown in app logic first before introducing strict structured storage.
