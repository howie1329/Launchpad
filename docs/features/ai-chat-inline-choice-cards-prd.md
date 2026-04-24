# AI Chat Inline Choice Cards PRD

## Problem Statement

Launchpad's AI chat often needs clarifying input before it can give a useful answer, create a useful artifact, or move a plan forward. Today those moments usually appear as plain-text questions or suggestions, which requires the user to manually type answers even when the assistant can offer a few obvious paths.

This slows down planning conversations and makes high-frequency clarification feel heavier than it should.

## Solution

Add inline choice cards to the assistant chat stream. When the assistant needs one focused clarification or decision, it can show a compact card with a question, two to three options, and a custom answer field. Selecting an option immediately sends a normal user message. Custom answers use the same chat path.

The first version should be durable, simple, and easy to debug. Choice cards are rendered from structured assistant output, but submitted answers remain ordinary chat messages.

## User Stories

1. As a Launchpad user, I want to answer common AI clarification questions by clicking an option, so that I can keep momentum without typing every answer manually.
2. As a Launchpad user, I want to write my own answer when the suggested options are wrong, so that the assistant does not force me into a preset path.
3. As a Launchpad user, I want choice prompts to stay visible in the chat history, so that I can understand why I answered a certain way later.
4. As a Launchpad user, I want old choice cards to be readable after refresh, so that conversations remain durable.
5. As a Launchpad user, I want the assistant to ask one decision at a time, so that the flow stays focused.
6. As a Launchpad user, I want regular suggestions to remain normal prose, so that the chat does not become over-structured.
7. As a Launchpad user, I want the assistant to continue naturally after I choose an option, so that it feels like a normal conversation.
8. As a Launchpad user, I want existing web search and artifact tools to keep working, so that the new interaction does not disrupt current chat behavior.

## Implementation Decisions

- Add one structured assistant interaction for choice cards.
- Use the existing AI SDK tool-part stream for the first implementation instead of adding a separate pending-interaction table.
- Render choice cards inline inside assistant messages.
- Submit selected and custom answers as normal user messages through the existing chat transport.
- Use choice cards only for true clarification or decision points.
- Limit v1 to one card per assistant turn and two to three options per card.
- Keep web search/tool expansion out of this first build; track those as follow-up work.

## Testing Decisions

- The first version will be manually tested.
- Manual testing should cover option click submission, custom answer submission, refresh persistence, answered-card readability, ordinary prose rendering, and existing tool-step rendering.

## Out of Scope

- Modal pop-ups.
- Multi-question forms.
- Separate pending interaction persistence.
- Approval workflows for destructive actions.
- Large AI toolset expansion.
- Full end-to-end automated chat streaming tests.

## Further Notes

Follow-up AI tool opportunities remain valuable after this lands: artifact search, section-level artifact reads, research mode over Tavily, promotion readiness checks, open-question extraction, and execution backlog generation.
