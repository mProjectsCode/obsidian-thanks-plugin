import { ButtonComponent, Modal, requestUrl,Setting } from 'obsidian';
import ThanksPlugin from './main';
import { Device, AuthReply, Token, RepoData, PluginRepoData, ThemeRepoData, GithubRepo } from './types';
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

		// Create a button that asks the user to sign in with github.
		const button = new ButtonComponent(this.contentEl);

		button.setButtonText('Sign in with GitHub');
		button.onClick(async () => {
			button.setDisabled(true);
			button.setButtonText('Signing in...');
			await this.authenticate();
		});
	}

	/**
	 * Show the verification URL and device code that the user must use when authenticating.
	 *
	 * @param device typed github API response containing a verification url and user code.
	 */
	displayAuthWaitContent(device: Device): void {
		this.contentEl.empty();
		this.contentEl.createEl('h2',   { text: 'Please sign in with GitHub' });

		// Manually create each individual element so we can click links and click to copy.
		this.contentEl.createEl('span', { text: "Go to " });
		// TODO: Make this element have a nicer tooltip. Does that mean we need a `setting`?
		this.contentEl.createEl('a',    { text: `${device.verification_uri}`, href: `${device.verification_uri}`, title: "Click to sign in with GitHub." });
		this.contentEl.createEl('span', { text: " and enter code " });

		// TODO: Make this element have a nicer tooltip. Does that mean we need a `setting`?
		const code = this.contentEl.createEl('code', { text: `${device.user_code}`, title: "Click to copy." });
		// For styling purposes, add a class to this item. In CSS we set a pointer cursor to indicate this is clickable.
		code.addClass("user-device-code");
		code.onClickEvent(async () => {
			// TODO: does this even work on mobile?
			navigator.clipboard.writeText(`${device.user_code}`);
		});

		this.contentEl.createEl('p', { text: `Waiting for auth response...` });
	}

	async displayStarContent(): Promise<void> {
		const repoData = await this.getRepoData();

		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Thank you, plugins & themes!' });

		for (const repo of repoData) {
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

	/**
	 * Retrieves the number of stargazers for a particular repository.
	 *
	 * @param repo A repository in the form `user/repository`.
	 */
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

	/**
     * Gets all starred repositories on github for a particular user using the token.
	 * See: https://docs.github.com/en/rest/activity/starring?apiVersion=2022-11-28#list-repositories-starred-by-the-authenticated-user
	 *
	 **/
	async getStarredRepositories(): Promise<Map<string, RepoData>> {
		if (!this.token) {
			// not authenticated, do nothing
			throw new Error('Not authenticated');
		}

		// Assume we have a token.
		let page = 1;
		let req = {
			url: `https://api.github.com/user/starred?per_page=10&page=${page}`,
			method: 'GET',
			headers: {
				'Accept': 'application/vnd.github+json',
				'Authorization': `Bearer ${this.token}`,
				'X-GitHub-Api-Version': '2022-11-28',
			},
			throw: false,
		};

		const response = await requestUrl(req);

		// Attempt to extract the lastPage if this request is paginated
		let lastPage = undefined;
		if (response.headers.link) {
			// link: "<https://api.github.com/user/starred?per_page=10&page=2>; rel="next", <https://api.github.com/user/starred?per_page=10&page=6>; rel="last"
			if (response.headers.link.contains("last")) {
				const links = response.headers.link.split(",")
				for (const line of links) {
					let items = line.split(";");
					let lnk = items[0];
					let rel = items[1];
					if (rel.contains("last")) {
						lastPage = Number(lnk.charAt(lnk.length-2));
					}
				}
			}
		}

		let responsesJSON = response.json;
		// If the request is paginated, do more requests and collect all JSON responses into responsesJSON
		if (lastPage) {
		    let promisePool = [];
		    for (let i = 2; i <= lastPage; i++) {
		    	let req = requestUrl({
		    		url: `https://api.github.com/user/starred?per_page=10&page=${i}`,
		    		method: 'GET',
		    		headers: {
						'Accept': 'application/vnd.github+json',
						'Authorization': `Bearer ${this.token}`,
						'X-GitHub-Api-Version': '2022-11-28',
		    		},
		    		throw: false,
		    	});
		    	promisePool.push(req);
		    }
			let responses = [response, ...await Promise.all(promisePool)];
			responsesJSON = responses.map(r => r.json).flat();
		}



		// note: responsesJSON contains JSON for all responses (either a single request, or pagination)
		let starred_repos: Map<string, RepoData> = new Map();
		for (const obj of responsesJSON) {
			// TODO: Figure out a good type here; do we want name?
		    const starredResult = {
				name: "unused",
		        repo: obj.full_name,
		        star_count: obj.stargazers_count,
		        is_starred: true
		    } satisfies RepoData
		    starred_repos.set(starredResult.repo, starredResult);
		}

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
