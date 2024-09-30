import { arrayBufferToBase64, ButtonComponent, Modal, requestUrl, RequestUrlParam, Setting } from 'obsidian';
import ThanksPlugin from './main';
import { Device, AuthReply, Token, RepoData, PluginRepoData, ThemeRepoData } from './types';
import { post, api_options } from './authenticate';

export class AuthModal extends Modal {
	plugin: ThanksPlugin;
	// API token for interacting with github API
	token: string | undefined;
	// interval identifier with which we are allowed to poll for a device reply
	pollInterval: CustomInterval | undefined;

	constructor(plugin: ThanksPlugin) {
		super(plugin.app);

		this.plugin = plugin;
		this.token = undefined;
		this.pollInterval = undefined;
	}

	/**
	 * Display authentication steps, so we can grab info from github.
	 */
	displayAuthContent(): void {
		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Please sign in with GitHub' });

		const button = new ButtonComponent(this.contentEl);

		button.setButtonText('Sign in with GitHub');
		button.onClick(async () => {
			button.setDisabled(true);
			button.setButtonText('Signing in...');
			await this.authenticate();
		});
	}

	displayAuthWaitContent(device: Device): void {
		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Please sign in with GitHub' });
		// TODO: Make it so you can easily copy paste the link and code
		this.contentEl.createEl('p', { text: `Go to ${device.verification_uri} and enter code ${device.user_code}` });

		this.contentEl.createEl('p', { text: `Waiting for auth response...` });
	}

	async displayStarContent(): Promise<void> {
		const repoData = await this.getRepoData();

		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Thank you, plugins & themes!' });

		// TODO: show them in the modal in a nice way
		for (const repo of repoData) {
			// this.contentEl.createEl('p', { text: `${repo.name} - ${repo.is_starred}` });
			const setting = new Setting(this.contentEl);
			setting.setName(repo.name);
			setting.setDesc(`Join ${repo.star_count} others in starring this repo!`);
			if (!repo.is_starred) {
				setting.addButton(button => {
					button.setButtonText('Star');
					button.setCta();
					button.onClick(async () => {
						// TODO: star the repo
						console.log('Star', repo.repo);
					});
				});
			} else {
				setting.addButton(button => {
					button.setButtonText('Star');
					button.setDisabled(true);
					button.setTooltip('Already starred');
				});
			}
		}
	}

	async getStarCount(repo: string): Promise<number> {
		return -1;
	}

	/**
	 * Gets all the data from github repos we want.
	 * TODO: figure out the types in a nice way
	 */
	async getRepoData(): Promise<RepoData[]> {
		const result: RepoData[] = [];

		// get list of plugins and themes
		const pluginList = await this.plugin.getPluginData();
		const themeList = await this.plugin.getThemeData();

		// get list of already starred repositories
		const alreadyStarred = await this.getStarredRepositories();

		// get list of repos to star
		// const reposToStar: Record<string, string[]> = {};

		for (const plugin of pluginList) {
			const isStarred = alreadyStarred.has(plugin.repo);
			result.push({
				id: plugin.id,
				name: plugin.name,
				repo: plugin.repo,
				star_count: isStarred ? alreadyStarred.get(plugin.repo)!.star_count : await this.getStarCount(plugin.repo),
				is_starred: isStarred,
			} satisfies PluginRepoData);
		}

		for (const theme of themeList) {
			const isStarred = alreadyStarred.has(theme.repo);
			result.push({
				name: theme.name,
				repo: theme.repo,
				star_count: isStarred ? alreadyStarred.get(theme.repo)!.star_count : await this.getStarCount(theme.repo),
				is_starred: isStarred,
			} satisfies ThemeRepoData);
		}

		return result;
	}

	// TODO: implement this method.
	// See: https://docs.github.com/en/rest/activity/starring?apiVersion=2022-11-28#list-repositories-starred-by-the-authenticated-user
	// Map<repo, RepoData>
	async getStarredRepositories(): Promise<Map<string, RepoData>> {
		if (!this.token) {
			// not authenticated, do nothing
			throw new Error('Not authenticated');
		}
		// Assume we have a token.
		let lastPage = 1;
		const response = await requestUrl({
			url: `https://api.github.com/user/starred?per_page=100?page=${lastPage}`,
			method: 'GET',
			headers: {
				Accept: 'application/vnd.github+json',
				Authentication: `Bearer ${this.token}`,
				'X-GitHub-Api-Version': '2022-11-28',
			},
			throw: false,
		});

		console.log(response.headers);

		// TODO: response.headers will contain a link header with rel="next" attached to it, as well as rel="last"
		// TODO: set pageNumber to last

		let promisePool = [];
		for (let i = 2; i < lastPage; i++) {
			let req = requestUrl({
				url: `https://api.github.com/user/starred?per_page=100?page=${i}`,
				method: 'GET',
				headers: {
					Accept: 'application/vnd.github+json',
					Authentication: `Bearer ${this.token}`,
					'X-GitHub-Api-Version': '2022-11-28',
				},
				throw: false,
			});
			promisePool.push(req);
		}

		// let responses = [response, ...await Promise.all(promisePool)].flat();
		// let responseJSON = responses.map(r => r.json);

		let starred_repos: Map<string, RepoData> = new Map();
		// for (const obj in responses) {
		//     const starredResult = {
		// 		name: "unused",
		//         repo: obj.full_name,
		//         star_count: obj.stargazers_count,
		//         is_starred: true
		//     } satisfies RepoData
		//     starred_repos.set(starredResult.repo, starredResult);
		// }

		return starred_repos;
	}

	async onOpen(): Promise<void> {
		console.log('modal open');

		this.displayAuthContent();
	}

	onClose(): void {
		console.log('modal close');
		if (this.pollInterval !== undefined) {
			this.pollInterval.stop();
		}
	}

	async authenticate(): Promise<void> {
		// Get the device code and user code
		const device_code_url = 'https://github.com/login/device/code';
		const required_scope = 'public_repo';
		const device_code_options = { ...api_options, scope: required_scope };
		const device_object = JSON.parse(await post(device_code_url, device_code_options)) as Device;

		// Update modal content with new information
		this.displayAuthWaitContent(device_object);

		// Prompt the user to login
		const authorize_url = 'https://github.com/login/oauth/access_token';
		const authorize_options = {
			...api_options,
			device_code: device_object.device_code,
			grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
		};

		let interval = device_object.interval + 5;

		let time_remaining = device_object.expires_in;

		this.pollInterval = new CustomInterval(interval * 1000, async () => {
			if (time_remaining <= 0) {
				throw new Error('Device code expired.');
			}
			time_remaining -= interval;

			const reply = await post(authorize_url, authorize_options);

			console.log(reply);
			const data = JSON.parse(reply) as AuthReply | Token;
			// const data = JSON.parse(reply) as AuthReply;

			if ('error' in data) {
				if (data.error === 'authorization_pending') {
					console.log('Authorization pending...');
					return;
				} else if (data.error === 'slow_down') {
					interval = data.interval ? data.interval + 5 : interval;
					this.pollInterval?.setNewInterval(interval * 1000);
					console.log('Slow down...');
					return;
				} else {
					console.log('Error: ', data.error_description);
					this.pollInterval?.stop();
					// TODO: display error message
					return;
				}
			} else {
				console.log('Success: ', data);
				this.pollInterval?.stop();
				this.token = data.access_token;
				await this.displayStarContent();
			}
		});

		this.pollInterval.start();
	}
}

class CustomInterval {
	interval: number;
	cb: () => Promise<void>;
	stopped: boolean;

	_timeout: number | undefined;

	constructor(interval: number, cb: () => Promise<void>) {
		this.interval = interval;
		this.cb = cb;
		this.stopped = false;
	}

	start(): void {
		this.stopped = false;
		this._start();
	}

	_start(): void {
		if (this.stopped) {
			return;
		}

		console.log('starting interval', this.interval);

		this._timeout = window.setTimeout(async () => {
			await this.cb();
			this._start();
		}, this.interval);
	}

	stop(): void {
		this.stopped = true;
		if (this._timeout !== undefined) {
			window.clearTimeout(this._timeout);
		}
	}

	setNewInterval(interval: number): void {
		this.interval = interval;
	}
}
