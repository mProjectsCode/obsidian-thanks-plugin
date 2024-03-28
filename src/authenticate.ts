// Node 12+
import { Octokit, App } from "octokit";

// https://github.com/octokit/authentication-strategies.js/?tab=readme-ov-file#oauth-user-authentication

// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow

// Probably we want to use this flow:
// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow