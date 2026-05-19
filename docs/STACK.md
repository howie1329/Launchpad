<!-- agentkit:start stack -->
# Stack Guidance

## SvelteKit

- Follow the existing route, load, action, and server module patterns before adding new files.
- Keep browser-only code out of server load functions and server modules.
- Use SvelteKit form actions and load functions where they fit the workflow.
- Validate external input at action, endpoint, and server boundary entrypoints.
- Reuse existing stores, components, and styling conventions before creating new ones.
- Run the project's SvelteKit check or build before handoff when touching routes, rendering, or data loading.
<!-- agentkit:end stack -->
