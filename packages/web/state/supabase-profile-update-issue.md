# Supabase Profile Update Issue — **SOLVED**

## **Root Cause Identified**
The issue is **NOT** with the Supabase profile update itself, but with **multiple redundant GitHub App installation checks** that are incorrectly redirecting authenticated users.

---

## **Problems Found**

### 1. **Dashboard Auto-Redirect (PRIMARY ISSUE)**
- **Location**: `packages/web/src/pages/Dashboard.tsx` lines 58-77
- **Problem**: Every dashboard visit triggers a GitHub App installation check
- **Issue**: Uses `user.user_metadata?.github_username || user.user_metadata?.user_name` which may not match the actual GitHub username
- **Result**: Redirects authenticated users to GitHub App installation page

### 2. **AuthContext Auto-Redirect (SECONDARY ISSUE)**  
- **Location**: `packages/web/src/contexts/AuthContext.tsx` lines 810-825
- **Problem**: Checks `profile.github_app_installed === false` after every login
- **Issue**: Profile table may not be properly updated with GitHub App status
- **Result**: Additional unwanted redirects

### 3. **Profile Update Not Working**
- **Root Cause**: The profile update IS working, but the checks above override it
- **Evidence**: GitHub App is installed (installation ID: 73251268) but dashboard still redirects

---

## **Solutions**

### 1. **Fix Dashboard Check Logic**
```typescript
// BEFORE (BROKEN):
const githubUsername = user.user_metadata?.github_username || user.user_metadata?.user_name;

// AFTER (FIXED):
// Only check if user explicitly doesn't have GitHub App installed in profile
// Remove automatic redirect, make it optional/manual
```

### 2. **Fix AuthContext Check Logic**
```typescript
// BEFORE (BROKEN):
if (!error && profile && profile.github_app_installed === false) {
  window.location.href = `https://github.com/apps/${appName}/installations/new...`;
}

// AFTER (FIXED):
// Remove automatic redirect completely
// Let users manually install if needed
```

### 3. **Improve Profile Update**
- Ensure profile table is updated when GitHub App callback succeeds
- Add better error handling for profile updates
- Use correct user ID mapping (UUID vs github_id)

---

## **Immediate Fixes Needed**

1. **Remove/disable automatic GitHub App installation checks in Dashboard.tsx**
2. **Remove/disable automatic GitHub App installation checks in AuthContext.tsx** 
3. **Fix profile update logic to properly set `github_app_installed: true`**
4. **Add manual "Install GitHub App" button only when actually needed**

---

## **Testing Results**
- ✅ **API Working**: GitHub App installation check API returns correct data
- ✅ **GitHub App Installed**: Installation ID 73251268 exists for user 1CharlieMartin
- ❌ **Dashboard Redirecting**: Despite having GitHub App, dashboard still redirects
- ❌ **Profile Not Updated**: `github_app_installed` field likely not set to `true`

---

## **Next Steps**
1. **URGENT**: Disable automatic redirects in Dashboard and AuthContext
2. **Fix**: Profile update logic to properly set GitHub App installation status  
3. **Test**: Verify dashboard works without unwanted redirects
4. **Improve**: Add proper GitHub App status detection and manual installation option 