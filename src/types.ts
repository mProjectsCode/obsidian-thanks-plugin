/**
 * The raw plugin data as we obtain from parsing
 * https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json
 */
export interface RawPluginData {
	id: string;
	name: string;
	author: string;
	description: string;
	repo: string;
}

/**
 * The plugin data that we care about: its name, id, and link to repository.
 */
export interface PluginData {
	name: string;
	id: string;
	repo: string;
}

/**
 * The raw theme data as we obtain from parsing
 * https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json
 */
export interface RawThemeData {
	name: string;
	author: string;
	repo: string;
	screenshot: string;
	modes: string[];
}

/**
 * The theme data we care about: its name, and link to repository.
 */
export interface ThemeData {
	name: string;
	repo: string;
}

/**
 * A 'Device' response used for communicating with the github API.
 */
export interface Device {
	/**
	 * The device verification code is 40 characters and used to verify the device.
	 */
	device_code: string;
	/**
	 * The user verification code is displayed on the device so the user can enter the code in a browser. This code is 8 characters with a hyphen in the middle.
	 */
	user_code: string;
	/**
	 * The verification URL where users need to enter the user_code: https://github.com/login/device.
	 */
	verification_uri: string;
	/**
	 * The number of seconds before the device_code and user_code expire. The default is 900 seconds or 15 minutes.
	 */
	expires_in: number;
	/**
	 * The minimum number of seconds that must pass before you can make a new access token request (POST https://github.com/login/oauth/access_token) to complete the device authorization. For example, if the interval is 5, then you cannot make a new request until 5 seconds pass. If you make more than one request over 5 seconds, then you will hit the rate limit and receive a slow_down error.
	 */
	interval: number;
}

/**
 * An 'Auth' response used for communicating with the github API.
 */
export interface AuthReply {
	/**
	 * The error identifier.
	 * See: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#error-codes-for-the-device-flow
	 */
	error: string;
	/**
	 * Textual representation to the error.
	 */
	error_description: string;
	/**
	 * Link to the docs for this error.
	 */
	error_uri: string;
	/**
	 * Optional new interval to abide by when making POST requests.
	 * See Device.interval.
	 */
	interval?: number;
}

/**
 * A 'Token' response used for communicating with the github API.
 */
export interface Token {
	/**
	 * The access token to communicate with the API.
	 */
	access_token: string;
	/**
	 * The scope that this token has.
	 * For starring plugins, this must be `public_repo`.
	 */
	scope: string;
	/**
	 * The type of token this is.
	 * We expect Bearer tokens.
	 */
	token_type: string;
}

export interface PluginRepoData {
	id: string;
	name: string;
	repo: string;
	star_count: number;
	is_starred: boolean;
}

export interface ThemeRepoData {
	name: string;
	repo: string;
	star_count: number;
	is_starred: boolean;
}

export type RepoData = PluginRepoData | ThemeRepoData;
