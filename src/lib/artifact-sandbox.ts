import type { ArtifactContentFormat } from '$lib/artifacts';

export const ARTIFACT_SANDBOX_READY = 'launchpad-artifact-ready';
export const ARTIFACT_SANDBOX_RESIZE = 'launchpad-artifact-resize';
export const ARTIFACT_SANDBOX_ERROR = 'launchpad-artifact-error';

const HTML_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'";
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

const BOOTSTRAP_SCRIPT = `
window.addEventListener('error', (event) => {
  parent.postMessage({
    type: '${ARTIFACT_SANDBOX_ERROR}',
    message: event.message || 'Unknown runtime error'
  }, '*');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
  parent.postMessage({ type: '${ARTIFACT_SANDBOX_ERROR}', message }, '*');
});
function reportHeight() {
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body ? document.body.scrollHeight : 0,
    120
  );
  parent.postMessage({ type: '${ARTIFACT_SANDBOX_RESIZE}', height }, '*');
}
const observer = new ResizeObserver(reportHeight);
observer.observe(document.documentElement);
if (document.body) observer.observe(document.body);
reportHeight();
parent.postMessage({ type: '${ARTIFACT_SANDBOX_READY}' }, '*');
`.trim();

function escapeCdata(value: string) {
	return value.replaceAll(']]>', ']]]]><![CDATA[>');
}

function wrapDocument(args: { csp: string; body: string; title?: string }) {
	const title = args.title ?? 'Artifact preview';
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="${args.csp}" />
<title>${title}</title>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { min-height: 120px; }
</style>
</head>
<body>
${args.body}
<script>${BOOTSTRAP_SCRIPT}</script>
</body>
</html>`;
}

function looksLikeFullHtmlDocument(source: string) {
	const trimmed = source.trim().toLowerCase();
	return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

export function buildArtifactSandboxDocument(
	content: string,
	contentFormat: Extract<ArtifactContentFormat, 'html' | 'svg'>
) {
	const source = content.trim();
	if (!source) {
		return wrapDocument({
			csp: contentFormat === 'html' ? HTML_CSP : SVG_CSP,
			body: '<p style="font: 14px/1.5 system-ui, sans-serif; color: #666; padding: 1rem;">Nothing to preview yet.</p>'
		});
	}

	if (contentFormat === 'html') {
		if (looksLikeFullHtmlDocument(source)) {
			if (source.includes('</body>')) {
				return source.replace('</body>', `<script>${BOOTSTRAP_SCRIPT}</script></body>`);
			}
			return `${source}<script>${BOOTSTRAP_SCRIPT}</script>`;
		}

		return wrapDocument({
			csp: HTML_CSP,
			body: source
		});
	}

	const svgBody = source.startsWith('<svg')
		? source
		: `<svg xmlns="http://www.w3.org/2000/svg">${escapeCdata(source)}</svg>`;

	return wrapDocument({
		csp: SVG_CSP,
		body: `<div style="display:flex;align-items:center;justify-content:center;min-height:120px;padding:1rem;">${svgBody}</div>`
	});
}
