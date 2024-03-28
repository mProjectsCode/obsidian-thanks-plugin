import { Plugin, request } from 'obsidian-typings';
import { type MyPluginSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SampleSettingTab } from './settings/SettingTab';

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

export interface ThemeData {
	name: string;
	repo: string;
}

// REST API Github
// list starred repos
// https://docs.github.com/en/rest/activity/starring?apiVersion=2022-11-28#list-repositories-starred-by-the-authenticated-user

export default class ThanksPlugin extends Plugin {
	// @ts-ignore defined in on load;
	settings: MyPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.addCommand({
			id: 'open-thanks-settings',
			name: 'Open Thanks Settings',
			callback: () => {
				this.openSettings();
			},
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as MyPluginSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async getPluginData(): Promise<PluginData[]> {
		const url = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
		const result = await request(url);
		const rawJSON = JSON.parse(result) as RawPluginData[];
		
		const IDs = this.getPluginIDs()
		const pluginData: PluginData[] = rawJSON
			.filter((pluginObject) => IDs.contains(pluginObject.id))
			.map((pluginObject) => {
				return {
					name: pluginObject.name,
					id: pluginObject.id,
					repo: pluginObject.repo
				} satisfies PluginData;
			})
		return pluginData;
	}

	/**
	 * Grabs the IDs of all downloaded plugins through their manifests.
	 */
	getPluginIDs(): string[] {
		return Object.keys(this.app.plugins.manifests);
	}
}