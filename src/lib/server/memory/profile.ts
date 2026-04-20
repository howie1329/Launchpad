import type { Id } from '../../../convex/_generated/dataModel'
import { getSupermemoryClient } from './client'
import { memoryLog } from './log'
import { projectMemoryContainerTag, userMemoryContainerTag } from './tags'
import { composeProfileInstructions } from './composer'
import { errorMessage, PROFILE_TIMEOUT_MS, withTimeout } from './fallback'

export async function buildSupermemoryProfileInstructions(args: {
	ownerId: Id<'users'>
	projectId?: Id<'projects'>
}): Promise<string> {
	const sm = getSupermemoryClient()
	if (!sm) return ''

	const userTag = userMemoryContainerTag(args.ownerId)

	try {
		const userProfile = await withTimeout(
			sm.profile({ containerTag: userTag }),
			PROFILE_TIMEOUT_MS
		)

		let projectStatic: string[] | undefined
		let projectDynamic: string[] | undefined
		if (args.projectId) {
			try {
				const projectProfile = await withTimeout(
					sm.profile({ containerTag: projectMemoryContainerTag(args.projectId) }),
					PROFILE_TIMEOUT_MS
				)
				projectStatic = projectProfile.profile.static
				projectDynamic = projectProfile.profile.dynamic
			} catch (error) {
				memoryLog('supermemory.profile_project_skipped', {
					error: errorMessage(error)
				})
			}
		}

		return composeProfileInstructions({
			userStatic: userProfile.profile.static,
			userDynamic: userProfile.profile.dynamic,
			projectStatic,
			projectDynamic
		})
	} catch (error) {
		memoryLog('supermemory.profile_user_skipped', { error: errorMessage(error) })
		return ''
	}
}
