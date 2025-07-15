# Endpoint Permissions & Scopes Enforcement Tracker

This document tracks the required permissions and scopes for each backend endpoint, and what needs to be changed to enforce them.

---

## apiKeys.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/api/keys`                   | POST   | admin       | admin          | Restrict to admin only (update middleware usage) ✅ Checked |
| `/api/keys`                   | GET    | admin       | admin          | Restrict to admin only ✅ Checked |
| `/api/keys/:id`               | GET    | admin       | admin          | Restrict to admin only ✅ Checked |
| `/api/keys/:id/stats`         | GET    | admin       | admin          | Restrict to admin only ✅ Checked |
| `/api/keys/:id/deactivate`    | PATCH  | admin       | admin          | Restrict to admin only ✅ Checked |
| `/api/keys/:id`               | DELETE | admin       | admin          | Restrict to admin only ✅ Checked |
| `/api/keys/profile/me`        | GET    | user        | sdk, cli, admin| Allow user, sdk, cli, admin ✅ Checked |
| `/api/keys/validate`          | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. ✅ Checked |

---

## analytics.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/analytics/mcp-metrics`      | POST   | validation  | user, sdk, cli | Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## workspaces.ts

| Endpoint            | Method | Permissions | Scopes         | Enforcement Needed |
|---------------------|--------|-------------|----------------|-------------------|
| `/workspaces/:id`   | PATCH  | user/owner  | sdk, cli, admin, github | Only allow workspace owner (API key or GitHub token) to update. Custom auth in route. ✅ Checked |

---

## secrets.ts

| Endpoint                                 | Method | Permissions | Scopes         | Enforcement Needed |
|------------------------------------------|--------|-------------|----------------|-------------------|
| `/secrets`                               | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets`                               | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/:id`                           | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/:id`                           | PUT    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/:id`                           | DELETE | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/deployment/:userId`            | GET    | internal    | n/a            | Internal use only, no user keys (no auth required) ✅ Checked |
| `/secrets/wrapper/:mcpServerId`          | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/package/:packageName`          | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/secrets/package/:packageName`          | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## deployments.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/deployments/:id/logs`       | GET    | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |
| `/deployments/:id/health`     | GET    | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |
| `/deployments/:id/restart`    | POST   | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |
| `/deployments/:id`            | DELETE | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |
| `/deployments`                | GET    | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |
| `/deployments/:id/redeploy`   | POST   | admin       | admin          | Restrict to admin only (add auth) ✅ Checked |

---

## mcpServers.ts

| Endpoint                              | Method | Permissions | Scopes         | Enforcement Needed |
|---------------------------------------|--------|-------------|----------------|-------------------|
| `/mcp-servers/:workspaceId`           | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/mcp-servers`                        | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/mcp-servers/:id`                    | PUT    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/mcp-servers/user/:githubId`         | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## gateway.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/gateway/connect`            | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/gateway/:sessionId/*`       | ALL    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/gateway/cleanup`            | POST   | admin       | admin          | Restrict to admin only (for cleaning up expired sessions) ✅ Checked |

---

## packages.ts

| Endpoint                                 | Method | Permissions | Scopes         | Enforcement Needed |
|------------------------------------------|--------|-------------|----------------|-------------------|
| `/packages`                              | GET    | none        | n/a            | Public, optional auth ✅ Checked |
| `/packages/id/:id`                       | GET    | none        | n/a            | Public, optional auth ✅ Checked |
| `/packages/id/:id/increment-downloads`   | POST   | none        | n/a            | Public ✅ Checked |
| `/packages/:slug`                        | GET    | none        | n/a            | Public, optional auth ✅ Checked |
| `/packages`                              | POST   | admin       | admin          | Restrict to admin only (update middleware usage) ✅ Checked |
| `/packages/search`                       | GET    | none        | n/a            | Public, optional auth ✅ Checked |
| `/packages/admin/all`                    | GET    | admin       | admin          | Restrict to admin only (update middleware usage) ✅ Checked |
| `/packages/:id`                          | DELETE | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/packages/:id/increment-downloads`      | POST   | none        | n/a            | Public ✅ Checked |
| `/packages/:id/rate`                     | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/packages/:id/rating`                   | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/packages/:id/download`                 | POST   | none        | n/a            | Public ✅ Checked |
| `/packages/marketplace/all`              | GET    | none        | n/a            | Public ✅ Checked |
| `/packages/:id/logo`                     | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/packages/semantic-search`              | POST   | none        | n/a            | Public, optional auth ✅ Checked |
| `/tools/semantic-search`                 | POST   | none        | n/a            | Public, optional auth ✅ Checked |
| `/packages/:id/redeploy`                 | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## notifications.ts

| Endpoint                      | Method | Permissions | Scopes | Enforcement Needed |
|-------------------------------|--------|-------------|--------|-------------------|
| `/notifications/new-user`     | POST   | webhook     | n/a    | Only allow with correct webhook secret (no user keys) ✅ Checked |

---

## sessionAnalytics.ts

| Endpoint                                 | Method | Permissions | Scopes         | Enforcement Needed |
|------------------------------------------|--------|-------------|----------------|-------------------|
| `/session-analytics/next-sequence`       | POST   | none        | n/a            | Public ✅ Checked |
| `/session-analytics/session-exists`      | POST   | none        | n/a            | Public ✅ Checked |
| `/session-analytics/create-session`      | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/update-activity`     | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/delete-session`      | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/events`              | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/sessions/:sessionId` | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/user/:userId`        | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/package/:packageName`| GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/process/:sessionId`  | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/sessions`            | POST   | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/sessions/:sessionId` | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/sessions/:sessionId/activity` | PATCH | validation | sdk, cli, admin | Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/session-analytics/sessions/:sessionId` | DELETE | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## profiles.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/profiles/me`                | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/profiles/me`                | PUT    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/profiles/me`                | DELETE | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/profiles/:id`               | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |
| `/profiles/github/:githubId`  | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. All DB writes/logic must use SIGYL_MASTER_KEY or internal credentials. ✅ Checked |

---

## emails.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/emails/stats`               | GET    | admin       | admin          | Require admin permission ✅ Checked |
| `/emails/subscribers`         | GET    | admin       | admin          | Require admin permission ✅ Checked |
| `/emails/export`              | GET    | admin       | admin          | Require admin permission ✅ Checked |
| `/emails/subscribe`           | POST   | none        | n/a            | Public ✅ Checked |
| `/emails/unsubscribe/:email`  | PUT    | none        | n/a            | Public ✅ Checked |
| `/emails/:id`                 | DELETE | admin       | admin          | Require admin permission ✅ Checked |

---

## contact.ts

| Endpoint        | Method | Permissions | Scopes | Enforcement Needed |
|-----------------|--------|-------------|--------|-------------------|
| `/contact`      | POST   | none        | n/a    | Public ✅ Checked |
| `/contact`      | GET    | none        | n/a    | Public ✅ Checked |

---

## health.ts

| Endpoint           | Method | Permissions | Scopes | Enforcement Needed |
|--------------------|--------|-------------|--------|-------------------|
| `/health`          | GET    | none        | n/a    | Public ✅ Checked |
| `/health/debug-auth` | GET  | none        | n/a    | Public ✅ Checked |
| `/health/detailed` | GET    | none        | n/a    | Public ✅ Checked |

---

## deploy.ts

| Endpoint           | Method | Permissions | Scopes | Enforcement Needed |
|--------------------|--------|-------------|--------|-------------------|
| `/deploy/deploy`   | POST   | admin       | admin  | Restrict to admin only (internal deployment) ✅ Checked |

---

## docs.ts

| Endpoint           | Method | Permissions | Scopes | Enforcement Needed |
|--------------------|--------|-------------|--------|-------------------|
| `/docs`            | GET    | none        | n/a    | Public ✅ Checked |
| `/docs/:docName`   | GET    | none        | n/a    | Public ✅ Checked |

---

## mcpProxy.ts

| Endpoint                      | Method | Permissions | Scopes         | Enforcement Needed |
|-------------------------------|--------|-------------|----------------|-------------------|
| `/mcp`                        | GET    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. ✅ Checked |
| `/mcp/:packageName/*`         | ALL    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. ✅ Checked |
| `/mcp/:packageName`           | ALL    | validation  | sdk, cli, admin| Only validate API key; do not use for backend logic. ✅ Checked |

---

## githubApp.ts

| Endpoint                                               | Method | Permissions | Scopes | Enforcement Needed |
|--------------------------------------------------------|--------|-------------|--------|-------------------|
| `/githubApp/installations/:installationId/deploy`      | POST   | admin       | admin  | Restrict to admin only ✅ Checked |
| `/githubApp/installations/:installationId/redeploy`    | POST   | admin       | admin  | Restrict to admin only ✅ Checked |
| `/githubApp/installations/:installationId/repositories`| GET    | none        | n/a    | Public (info only) ✅ Checked |
| `/githubApp/installations/:installationId`             | GET    | none        | n/a    | Public (info only) ✅ Checked |
| `/githubApp/oauth-url/:installationId`                 | GET    | none        | n/a    | Public (info only) ✅ Checked |
| `/githubApp/check-installation/:githubUsername`        | GET    | none        | n/a    | Public (info only) ✅ Checked |