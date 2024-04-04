// Plugins:
// https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json

export interface RawPluginData {
	id: string;
	name: string;
	author: string;
	description: string;
	repo: string;
}

export interface PluginData {
	name: string;
	id: string;
	repo: string;
}

// CSS Themes:
// https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json
export interface RawThemeData {
	name: string;
	author: string;
	repo: string;
	screenshot: string;
	modes: string[];
}

export interface ThemeData {
	name: string;
	repo: string;
}

/**
 Parameter name	Type	Description
 device_code	string	The device verification code is 40 characters and used to verify the device.
 user_code	string	The user verification code is displayed on the device so the user can enter the code in a browser. This code is 8 characters with a hyphen in the middle.
 verification_uri	string	The verification URL where users need to enter the user_code: https://github.com/login/device.
 expires_in	integer	The number of seconds before the device_code and user_code expire. The default is 900 seconds or 15 minutes.
 interval	integer	The minimum number of seconds that must pass before you can make a new access token request (POST https://github.com/login/oauth/access_token) to complete the device authorization. For example, if the interval is 5, then you cannot make a new request until 5 seconds pass. If you make more than one request over 5 seconds, then you will hit the rate limit and receive a slow_down error.
 */
export interface Device {
	device_code: string;
	user_code: string;
	verification_uri: string;
	expires_in: number;
	interval: number;
}

export interface AuthReply {
	error: string;
	error_description: string;
	error_uri: string;
	interval?: number;
}
