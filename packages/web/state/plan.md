## [Update] Dashboard MCP Server List

- The dashboard MCP server list now queries the `mcp_packages` table, filtering by `author_id` (which is the user's profile UUID, looked up by their `github_id`).
- This replaces the old logic that listed servers by workspace.
- This ensures that users only see their own deployed MCP servers/packages on the dashboard. 

# Updated Plan for Authentication and Profile Management

## Key Fixes Implemented

1. **Supabase UUID for Profile Lookups**
   - All lookups to the `profiles` table now use the Supabase Auth user ID (UUID) for the `id` column.
   - If a lookup by GitHub account is needed, the `github_id` column is used.
   - All usages of the `github_` prefix for `id` lookups have been removed.

2. **Supabase OAuth Code Handling**
   - `exchangeCodeForSession` is only called with a valid Supabase OAuth code (not after GitHub App install unless a real OAuth code is present).
   - PKCE errors are avoided by not calling this function with invalid or missing codes.

3. **GitHub App Install Flow**
   - After GitHub App install, the backend upserts the `profiles` table using the Supabase Auth user ID (UUID) for the `id` column.
   - The backend sets `github_app_installed` and `github_installation_id` in the `profiles` table.
   - Error handling is added for missing or invalid IDs.

4. **API Authentication**
   - All API requests from the frontend use the Supabase JWT (`access_token`) for authentication, not the GitHub token.
   - Error handling is added for unauthenticated users.

5. **Frontend React Components**
   - All relevant React components (UserProfile, ActivityFeed, AnalyticsCharts, APIKeysManager, SecretsManager, DeploymentDashboard, Marketplace, WorkspaceManager, DeployWizard, DeployWizardWithGitHubApp, etc.) now use the Supabase user.id (UUID) for profile lookups.
   - Error handling is added for missing/invalid IDs.

6. **Backend Services and Routes**
   - Backend routes and services (e.g., `/github/associate-installation`, `installationService.ts`) upsert and query the `profiles` table using the UUID.
   - Error handling is added for missing/invalid IDs.

7. **General Improvements**
   - The login and GitHub App install flow is unified and robust against edge cases.
   - The `profiles` table is the single source of truth for user accounts.

---

**Next Steps:**
- Test the full login and GitHub App install flow for edge cases.
- Monitor for any remaining PKCE or 500 errors and debug as needed.
- Ensure all new features and components follow this pattern for authentication and profile management. 