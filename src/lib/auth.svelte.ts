import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { ConvexHttpClient, ConvexClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { Value } from 'convex/values';
import { BROWSER } from 'esm-env';
import { setConvexClientContext } from 'convex-svelte';

type Tokens = {
	token: string;
	refreshToken: string;
};

type SignInResult = {
	redirect?: string;
	verifier?: string;
	tokens?: Tokens | null;
	started?: boolean;
};

type AuthActionArgs = Record<string, Value | undefined>;

const signInAction = makeFunctionReference<'action', AuthActionArgs, SignInResult>('auth:signIn');
const signOutAction = makeFunctionReference<'action', Record<string, never>, null>('auth:signOut');

const jwtStorageKey = '__launchpadConvexAuthJWT';
const refreshTokenStorageKey = '__launchpadConvexAuthRefreshToken';

let client: ConvexClient | null = null;
let httpClient: ConvexHttpClient | null = null;
let storagePrefix = '';

export const auth = $state({
	isLoading: true,
	isAuthenticated: false,
	token: null as string | null
});

export function setupAuth() {
	if (!PUBLIC_CONVEX_URL) {
		auth.isLoading = false;
		throw new Error('PUBLIC_CONVEX_URL is required to set up Convex Auth');
	}

	const convexClient = new ConvexClient(PUBLIC_CONVEX_URL, { disabled: !BROWSER });
	client = convexClient;
	httpClient = new ConvexHttpClient(PUBLIC_CONVEX_URL);
	storagePrefix = PUBLIC_CONVEX_URL.replace(/[^a-zA-Z0-9]/g, '');

	setConvexClientContext(convexClient);

	if (BROWSER) {
		convexClient.setAuth(fetchAccessToken, updateAuthenticatedState);
		void loadStoredToken();
	} else {
		auth.isLoading = false;
	}

	$effect(() => () => {
		void convexClient.close();
	});
}

export async function signIn(provider: string, params?: FormData | Record<string, Value>) {
	const result = await getClient().action(signInAction, {
		provider,
		params: formDataToParams(params)
	});

	if (result.redirect) {
		window.location.href = result.redirect;
		return { signingIn: false, redirect: new URL(result.redirect) };
	}

	if (result.tokens !== undefined) {
		await setTokens(result.tokens);
		refreshClientAuth();
		return { signingIn: result.tokens !== null };
	}

	return { signingIn: false };
}

export async function signOut() {
	try {
		await getClient().action(signOutAction, {});
	} catch {
		// Signing out locally is still correct if the backend session is already gone.
	}

	await setTokens(null);
	refreshClientAuth();
}

async function fetchAccessToken({ forceRefreshToken }: { forceRefreshToken: boolean }) {
	if (!BROWSER) return null;

	if (!forceRefreshToken) {
		return auth.token;
	}

	const refreshToken = localStorage.getItem(storageKey(refreshTokenStorageKey));
	if (!refreshToken) return null;

	const result = await getHttpClient().action(signInAction, { refreshToken });
	await setTokens(result.tokens ?? null);
	return auth.token;
}

async function loadStoredToken() {
	const token = localStorage.getItem(storageKey(jwtStorageKey));
	auth.token = token;
	auth.isAuthenticated = Boolean(token);
	auth.isLoading = false;
	refreshClientAuth();
}

async function setTokens(tokens: Tokens | null) {
	if (tokens) {
		auth.token = tokens.token;
		auth.isAuthenticated = true;
		localStorage.setItem(storageKey(jwtStorageKey), tokens.token);
		localStorage.setItem(storageKey(refreshTokenStorageKey), tokens.refreshToken);
	} else {
		auth.token = null;
		auth.isAuthenticated = false;
		localStorage.removeItem(storageKey(jwtStorageKey));
		localStorage.removeItem(storageKey(refreshTokenStorageKey));
	}

	auth.isLoading = false;
}

function refreshClientAuth() {
	client?.setAuth(fetchAccessToken, updateAuthenticatedState);
}

function updateAuthenticatedState(isAuthenticated: boolean) {
	auth.isAuthenticated = isAuthenticated;
	auth.isLoading = false;
}

function formDataToParams(params?: FormData | Record<string, Value>) {
	if (!(params instanceof FormData)) {
		return params ?? {};
	}

	return Object.fromEntries(params.entries()) as Record<string, string>;
}

function storageKey(key: string) {
	return `${storagePrefix}:${key}`;
}

function getClient() {
	if (!client) throw new Error('Convex Auth has not been set up');
	return client;
}

function getHttpClient() {
	if (!httpClient) throw new Error('Convex Auth has not been set up');
	return httpClient;
}
