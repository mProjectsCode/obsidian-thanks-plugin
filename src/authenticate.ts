import { RequestUrlParam, requestUrl } from 'obsidian';

// TODO: Actually cache results in a correct way.
const cache: Record<string, string> = {};

export type Params = any;

async function requestWrapper(url: string, params: Params = {}, method: string = 'GET'): Promise<string> {
	// Fast-path for cache
	// let cache_key = JSON.stringify({ url, params, method });
	// if (cache[cache_key]) {
	//     return cache[cache_key];
	// }

	// Process different methods
	const requestUrlParams: RequestUrlParam = {
		url: url,
		method: method,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		throw: false,
	};

	switch (method) {
		// GET => add parameters to URL using URLSearchParams
		case 'GET': {
			requestUrlParams.url += '?' + new URLSearchParams(params).toString();
			break;
		}
		// POST => add parameters to the body of the request as JSON
		case 'POST': {
			requestUrlParams.body = JSON.stringify(params);
			break;
		}
		// ERR => TODO: error handling
		default: {
			// Unknown request method
			console.error(`requestWrapper(): Unknown request method '${method}'.`);
			break;
		}
	}

	const response = await requestUrl(requestUrlParams);

	console.log(response);

	const result = response.text;
	// console.log(result);

	// cache[cache_key] = result;
	return result;
}

export async function get(url: string, params: Params): Promise<string> {
	return await requestWrapper(url, params, 'GET');
}

export async function post(url: string, params: Params): Promise<string> {
	return await requestWrapper(url, params, 'POST');
}

// Github Client ID of the OAuth application
export const CLIENT_ID = 'd783633d6045383d4d16';
export const api_options: Record<string, string | number> = { client_id: CLIENT_ID };

// // TESTING for running in bun
// export async function testAuth() {
//     const {device_code, user_code, verification_uri, expires_in, interval} = await authStep1();

//     const authorize_url = 'https://github.com/login/oauth/access_token';
//     const authorize_options = {
//         ...api_options,
//         device_code: device_code,
//         grant_type: "urn:ietf:params:oauth:grant-type:device_code"
//     };

//     let time_remaining = expires_in;
//     const poll_interval = window.setTimeout(async () => {
//         if (time_remaining <= 0) {
//             throw new Error("Device code expired.");
//         }
//         time_remaining -= interval;

//         const reply = await post(authorize_url, authorize_options);

//         console.log(reply);
//         const data = JSON.parse(reply) as AuthReply;

//         if (data.error) {
//             if (data.error === "authorization_pending") {
//                 console.log("Authorization pending...");
//                 return;
//             } else  if (data.error === "slow_down") {
//                 console.log("Slow down...");
//                 return;
//             } else {
//                 console.log("Error: ", data.error_description);
//                 return;
//             }
//         }
//     }, interval)

// }

// // TESTING for running this file in bun directly
// // Seems OK
// export async function testThings() {
//     const testURL = "https://pokeapi.co/api/v2/pokemon";
//     const testOPT = { limit: 3, offset: 10 };
//     const reply = await get(testURL, testOPT);
//     console.log(reply)
// }
