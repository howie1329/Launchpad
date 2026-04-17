import { env } from '$env/dynamic/public';

export type FeatureFlag = 'workspace';

export const featureFlags: Record<FeatureFlag, boolean> = {
	workspace: env.PUBLIC_FEATURE_WORKSPACE === 'true'
};

export function isFeatureEnabled(flag: FeatureFlag) {
	return featureFlags[flag];
}
