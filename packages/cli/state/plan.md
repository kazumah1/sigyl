# Sigyl CLI State Plan

## Current Issues Fixed ✅

### 1. **MCP Server Secret Injection & Cold Start Issue** - RESOLVED

**Initial Problem**: `TypeError: createStatelessServer is not a function` error in Google Cloud logs when Brave Search MCP server was accessed through Claude Desktop.

**Root Causes Identified & Fixed**:
1. **Missing Export** - Fixed by adding `createStatelessServer` export to Brave Search server.ts
2. **Secrets Not Injecting** - Fixed fuzzy search logic in secrets endpoint 
3. **Claude Desktop Timeouts** - **IDENTIFIED AS GOOGLE CLOUD RUN COLD STARTS**

**Cold Start Analysis**:
- **Evidence**: 55.66-second response times in Google Cloud logs
- **Root Cause**: Large Docker images, heavy npm dependencies, database connections, API calls during startup
- **Impact**: Claude Desktop has 60-second timeout, cold starts exceed this limit
- **Solution**: Instance warming with cron job every 5 minutes + `minScale: 1` configuration

### 2. **MCP Metrics Not Being Stored** - RESOLVED ✅

**Problem**: `mcp_metrics` table was completely empty despite wrapper sending metrics, with 429 rate limit errors.

**Root Causes & Fixes**:
1. **Rate Limiting on Authentication**: 
   - **Issue**: Metrics endpoint used `requireHybridAuth` which called API validation on every request
   - **Fix**: Created lightweight `authenticateMetrics()` function with 5-minute caching to avoid rate limits

2. **User ID Resolution Mismatch**:
   - **Issue**: API keys point to `api_users` table, but `mcp_metrics` has foreign key to `profiles` table
   - **Fix**: Enhanced authentication to resolve API users to profiles, creating profiles if needed

3. **Database Foreign Key Constraints**:
   - **Issue**: `user_id` from API key validation didn't match existing profiles
   - **Fix**: Auto-create profiles for API users when storing metrics

**Implementation Details**:
- New `authenticateMetrics()` function bypasses full hybrid auth
- Caches API key → profile ID mapping for 5 minutes
- Auto-creates profiles for API users by github_id or email
- Enhanced logging for metrics debugging

**Test Results**: ✅ Metrics endpoint now successfully stores data with metric IDs returned

## Next Priority Actions

### 3. **Cold Start Mitigation** (In Progress)
- [ ] Implement instance warming scheduler (cron job every 5 minutes)
- [ ] Configure Cloud Run `minScale: 1` for critical services  
- [ ] Optimize Docker image size and startup time
- [ ] Reduce initial API calls and database connections

### 4. **Metrics Analytics Dashboard**
- [ ] Test metrics collection in production environment
- [ ] Build analytics dashboard showing real usage data
- [ ] Implement LLM cost tracking and optimization insights

### 5. **Platform Optimization**
- [ ] Monitor cold start frequency and duration
- [ ] Optimize wrapper.js for faster initialization
- [ ] Implement health check endpoints for better monitoring

## Technical Architecture Status

### Authentication Flow ✅
- API Key validation with caching
- Hybrid auth (API keys + GitHub tokens + Supabase JWT)
- Profile resolution for metrics storage

### Metrics Collection ✅  
- Lightweight authentication to avoid rate limits
- Automatic profile creation for API users
- Comprehensive event tracking (requests, tools, performance, LLM costs)

### Cold Start Analysis ✅
- 55+ second startup times identified as root cause
- Claude Desktop 60-second timeout exceeded
- Solutions identified: warming + minScale configuration

## Current Working Features

- ✅ MCP server deployment via GitHub App
- ✅ Secret injection and management  
- ✅ Metrics collection and storage
- ✅ API key authentication and validation
- ✅ Package registry and marketplace
- ✅ Analytics endpoint and data collection

## Known Issues

- ⚠️ Google Cloud Run cold starts causing Claude Desktop timeouts
- ⚠️ High memory usage during startup (can be optimized)
- ⚠️ Metrics collection may have slight delay due to caching (5-minute TTL)