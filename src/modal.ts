import { ButtonComponent, Modal } from 'obsidian';
import ThanksPlugin from './main';
import { Device, AuthReply } from './types';
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

	// /**
	//  * Displayed immediately as placeholder.
	//  * This placeholder has as button, which when clicked tries to do authentication.
	//  * The reason this is a seperate user action is so we can be _extra clear_ that it requires internet acces.
	//  */
	// displayPlaceholderContent(): void {
	//     this.contentEl.empty();
	//     this.contentEl.createEl('h2', { text: 'Click the button?' });
	// }

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

		this.contentEl.createEl('p', { text: `Go to ${device.verification_uri} and enter code ${device.user_code}` });

		this.contentEl.createEl('p', { text: `Waiting for auth response...` });
	}

	async displayStarContent(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createEl('h2', { text: 'Thank you, plugins & themes!' });

		// get list of plugins and themes
		const pluginList = await this.plugin.getPluginData();
		const themeList = await this.plugin.getThemeData();

		// show them in the modal in a nice way
		for (const plugin of pluginList) {
			this.contentEl.createEl('p', { text: plugin.name });
		}

		for (const theme of themeList) {
			this.contentEl.createEl('p', { text: theme.name });
		}
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

		let interval = device_object.interval;

		let time_remaining = device_object.expires_in;

		this.pollInterval = new CustomInterval(interval * 1000, async () => {
			if (time_remaining <= 0) {
				throw new Error('Device code expired.');
			}
			time_remaining -= interval;

			const reply = await post(authorize_url, authorize_options);

			console.log(reply);
			const data = JSON.parse(reply) as AuthReply;

			if (data.error) {
				if (data.error === 'authorization_pending') {
					console.log('Authorization pending...');
					return;
				} else if (data.error === 'slow_down') {
					interval = data.interval ?? interval;
					this.pollInterval?.setNewInterval(interval * 1000);
					console.log('Slow down...');
					return;
				} else {
					console.log('Error: ', data.error_description);
					return;
				}
			} else {
				console.log('Success: ', data);
				this.pollInterval?.stop();
			}
		});

		this.pollInterval.start();

		this.token = '...';
	}
}

class CustomInterval {
	interval: number;
	cb: () => Promise<void>;

	_timeout: number | undefined;

	constructor(interval: number, cb: () => Promise<void>) {
		this.interval = interval;
		this.cb = cb;
	}

	start(): void {
		this._timeout = window.setTimeout(async () => {
			await this.cb();
			this.start();
		}, this.interval);
	}

	stop(): void {
		if (this._timeout !== undefined) {
			window.clearTimeout(this._timeout);
		}
	}

	setNewInterval(interval: number): void {
		this.interval = interval;
	}
}
