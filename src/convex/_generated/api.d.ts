/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountManagement from "../accountManagement.js";
import type * as activity from "../activity.js";
import type * as activityHelpers from "../activityHelpers.js";
import type * as artifacts from "../artifacts.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as chat from "../chat.js";
import type * as dateKey from "../dateKey.js";
import type * as http from "../http.js";
import type * as memory from "../memory.js";
import type * as projects from "../projects.js";
import type * as usage from "../usage.js";
import type * as userSettings from "../userSettings.js";
import type * as workspaceTabValidators from "../workspaceTabValidators.js";
import type * as workspaceTabs from "../workspaceTabs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountManagement: typeof accountManagement;
  activity: typeof activity;
  activityHelpers: typeof activityHelpers;
  artifacts: typeof artifacts;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  chat: typeof chat;
  dateKey: typeof dateKey;
  http: typeof http;
  memory: typeof memory;
  projects: typeof projects;
  usage: typeof usage;
  userSettings: typeof userSettings;
  workspaceTabValidators: typeof workspaceTabValidators;
  workspaceTabs: typeof workspaceTabs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
