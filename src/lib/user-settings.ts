import { makeFunctionReference } from 'convex/server'
import type { Id } from '../convex/_generated/dataModel'

export type UserSettings = {
	_id: Id<'userSettings'>
	_creationTime: number
	ownerId: Id<'users'>
	timeZone: string
	dailyAiCapUsd: number
	createdAt: number
	updatedAt: number
}

export const getMyUserSettingsQuery = makeFunctionReference<'query', Record<string, never>, UserSettings | null>(
	'userSettings:getMine'
)

export const upsertMyUserSettingsMutation = makeFunctionReference<
	'mutation',
	{ timeZone: string; dailyAiCapUsd?: number },
	{ ok: true }
>('userSettings:upsertMine')

