import { Plugin, request } from 'obsidian';
import { type MyPluginSettings as ThanksPluginSettings, DEFAULT_SETTINGS } from './settings/Settings';
import { SampleSettingTab } from './settings/SettingTab';
import { PluginData, ThemeData, RawPluginData, RawThemeData } from './types';
import { AuthModal } from './modal';

// REST API Github
// list starred repos
// https://docs.github.com/en/rest/activity/starring?apiVersion=2022-11-28#list-repositories-starred-by-the-authenticated-user

export default class ThanksPlugin extends Plugin {
	// @ts-ignore defined in on load;
	settings: ThanksPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.addCommand({
			id: 'open-thanks-settings',
			name: 'Open Thanks Settings',
			callback: () => {
				// this.openSettings();
			},
		});

		this.addCommand({
			id: 'test-plugin',
			name: 'Test Plugin',
			callback: () => {
				this.getPluginData().then(data => {
					console.log(data);
				});
			},
		});

		this.addCommand({
			id: 'test-theme',
			name: 'Test Theme',
			callback: () => {
				this.getThemeData().then(data => {
					console.log(data);
				});
			},
		});

		this.addCommand({
			id: 'test-api',
			name: 'Test API',
			callback: () => {
				new AuthModal(this).open();
			},
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as ThanksPluginSettings;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async getPluginData(): Promise<PluginData[]> {
		const url = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json';
		const result = await request(url);
		const rawJSON = JSON.parse(result) as RawPluginData[];

		const IDs = this.getPluginIDs();
		const pluginData: PluginData[] = rawJSON
			.filter(pluginObject => IDs.contains(pluginObject.id))
			.map(pluginObject => {
				return {
					name: pluginObject.name,
					id: pluginObject.id,
					repo: pluginObject.repo,
				} satisfies PluginData;
			});
		return pluginData;
	}

	async getThemeData(): Promise<ThemeData[]> {
		const url = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-css-themes.json';
		const result = await request(url);
		const rawJSON = JSON.parse(result) as RawThemeData[];

		const names = this.getThemeNames();
		const themeData: ThemeData[] = rawJSON
			.filter(themeObject => names.contains(themeObject.name))
			.map(themeObject => {
				return {
					name: themeObject.name,
					repo: themeObject.repo,
				} satisfies ThemeData;
			});
		return themeData;
	}

	/**
	 * Grabs the IDs of all downloaded plugins through their manifests.
	 */
	getPluginIDs(): string[] {
		// eslint-disable-next-line
		// @ts-ignore
		return Object.keys(this.app.plugins.manifests);
	}

	/**
	 * Grabs the names of all downloaded themes.
	 */
	getThemeNames(): string[] {
		// eslint-disable-next-line
		// @ts-ignore
		return Object.keys(this.app.customCss.themes);
	}
}
