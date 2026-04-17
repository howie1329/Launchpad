import {
	useEventListener,
	useIntersectionObserver,
	useMutationObserver,
	useResizeObserver,
	watch,
} from "runed";
import { setContext, getContext } from "svelte";

const STICK_TO_BOTTOM_CONTEXT_KEY = Symbol("stick-to-bottom-context");

class StickToBottomContext {
	#element: HTMLElement | null = $state(null);
	#isAtBottom = $state(true);
	#sentinel: HTMLElement | null = null;
	#userHasScrolled = $state(false);

	isAtBottom = $derived(this.#isAtBottom);

	// Debug method to help troubleshoot
	get debugInfo() {
		if (!this.#element) return null;
		const { scrollTop, scrollHeight, clientHeight } = this.#element;
		return {
			scrollTop,
			scrollHeight,
			clientHeight,
			isAtBottom: this.#isAtBottom,
			userHasScrolled: this.#userHasScrolled,
			hasElement: !!this.#element,
			hasSentinel: !!this.#sentinel,
		};
	}

	constructor() {
		watch(
			() => this.#element,
			() => {
				if (this.#element) {
					this.#createSentinel();
					this.#checkScrollPosition();
					return () => this.#cleanupSentinel();
				}
			}
		);

		useEventListener(() => this.#element, "scroll", this.#handleScroll, {
			passive: true,
		});

		useIntersectionObserver(
			() => this.#sentinel,
			(entries) => {
				const entry = entries[0];
				// Use intersection observer as a backup, but prioritize scroll-based detection
				if (entry.isIntersecting) {
					this.#isAtBottom = true;
					this.#userHasScrolled = false;
				}
			},
			{
				threshold: 0,
				root: () => this.#element,
			}
		);

		useResizeObserver(() => this.#element, () => {
			// Check position after resize
			this.#checkScrollPosition();
			if (this.#isAtBottom && !this.#userHasScrolled) {
				this.scrollToBottom("auto");
			}
		});

		useMutationObserver(
			() => this.#element,
			() => {
				// Small delay to ensure DOM has updated
				requestAnimationFrame(() => {
					// Check if we should auto-scroll BEFORE updating the position
					// Only auto-scroll if user was at bottom and hasn't manually scrolled
					const shouldAutoScroll = this.#isAtBottom && !this.#userHasScrolled;

					// Now update the scroll position after content changes
					this.#checkScrollPosition();

					// Auto-scroll if conditions were met
					if (shouldAutoScroll) {
						this.scrollToBottom("smooth");
					}
				});
			},
			{
				childList: true,
				subtree: true,
				characterData: true,
			}
		);
	}

	setElement(element: HTMLElement) {
		this.#element = element;
	}

	scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
		if (!this.#element) return;

		this.#userHasScrolled = false; // Reset user scroll flag when programmatically scrolling
		this.#element.scrollTo({
			top: this.#element.scrollHeight,
			behavior,
		});
	};

	#handleScroll = () => {
		if (!this.#element) return;

		// Detect if user has scrolled up from bottom
		const { scrollTop, scrollHeight, clientHeight } = this.#element;
		const threshold = 200; // Increased threshold for better UX
		const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;

		// Update the isAtBottom state based on scroll position
		this.#isAtBottom = isAtBottom;

		if (!isAtBottom) {
			this.#userHasScrolled = true;
		} else if (isAtBottom && this.#userHasScrolled) {
			// User scrolled back to bottom, reset flag
			this.#userHasScrolled = false;
		}
	};

	#createSentinel() {
		if (!this.#element) return;

		this.#sentinel = document.createElement("div");
		this.#sentinel.style.height = "1px";
		this.#sentinel.style.width = "100%";
		this.#sentinel.style.pointerEvents = "none";
		this.#sentinel.style.opacity = "0";
		this.#sentinel.setAttribute("data-stick-to-bottom-sentinel", "");

		// Append to the end of the scrollable content, not positioned absolutely
		this.#element.appendChild(this.#sentinel);
	}

	#checkScrollPosition() {
		if (!this.#element) return;

		const { scrollTop, scrollHeight, clientHeight } = this.#element;
		const threshold = 200; // Increased threshold for better UX
		const isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold;

		this.#isAtBottom = isAtBottom;
	}

	#cleanupSentinel() {
		if (this.#sentinel && this.#element?.contains(this.#sentinel)) {
			this.#element.removeChild(this.#sentinel);
		}

		this.#sentinel = null;
	}
}

export function setStickToBottomContext(): StickToBottomContext {
	const context = new StickToBottomContext();
	setContext(STICK_TO_BOTTOM_CONTEXT_KEY, context);
	return context;
}

export function getStickToBottomContext(): StickToBottomContext {
	const context = getContext<StickToBottomContext>(STICK_TO_BOTTOM_CONTEXT_KEY);
	if (!context) {
		throw new Error("StickToBottomContext must be used within a Conversation component");
	}
	return context;
}

export { StickToBottomContext };
