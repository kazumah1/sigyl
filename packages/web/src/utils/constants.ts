export const DASHBOARD_ROUTES = {
  OVERVIEW: '/dashboard',
  SERVERS: '/dashboard?tab=servers',
  ANALYTICS: '/dashboard?tab=analytics',
  API_KEYS: '/dashboard?tab=api-keys',
  SECRETS: '/dashboard?tab=secrets',
  TEAM: '/dashboard?tab=team',
  SETTINGS: '/dashboard?tab=settings'
} as const;

export const PLATFORM_ROUTES = {
  HOME: '/',
  MARKETPLACE: '/registry',
  DOCS: '/docs',
  BLOG: '/blog',
  LOGIN: '/login'
} as const;

export const SERVER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error'
} as const;

export const DEPLOYMENT_STATUS = {
  DEPLOYED: 'deployed',
  DEPLOYING: 'deploying',
  FAILED: 'failed'
} as const;

export const METRIC_TYPES = {
  VISIT: 'visit',
  TOOL_CALL: 'tool_call',
  INTEGRATION_CALL: 'integration_call'
} as const;

export const WORKSPACE_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
} as const;
