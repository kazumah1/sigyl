# Wrapper Development Plan

## 🎯 Goals & Requirements

### Primary Goals
The wrapper is the critical bridge between user requests and MCP servers. It must:

1. **API Key Validation**: Validate Sigyl API keys against registry
2. **Package Name Extraction**: Dynamically determine which MCP server to invoke
3. **Config & Secrets Management**: Fetch and inject user-specific configuration
4. **Server Lifecycle**: Create, connect, and manage MCP server instances
5. **Request Routing**: Route HTTP requests to appropriate MCP server methods
6. **Error Handling**: Graceful error handling with helpful user feedback
7. **Metrics Collection**: Comprehensive analytics without blocking requests
8. **Session Management**: Track user sessions and conversation flows

### Architecture Principles

1. **Separation of Concerns**: Keep metrics logic external to core wrapper functionality
2. **Minimal Dependencies**: Avoid complex dependencies that cause container issues
3. **Graceful Degradation**: Core functionality should work even if auxiliary services fail
4. **Comprehensive Logging**: Debug-friendly logging for troubleshooting
5. **Performance**: Non-blocking operations, efficient caching
6. **Security**: Proper secret handling, input validation

## 🚨 Problems Faced & Solutions

### 1. Google Cloud Storage Caching Issue
**Problem**: GCS aggressively caches wrapper files, preventing deployments from using updated code.

**Current Solution**: 
- Change wrapper filename in `cloudRunService.ts` line ~229
- Upload new versions with incremented names (wrappertest8.cjs → wrappertest9.cjs)
- Not ideal but functional workaround

**Better Future Solution**: 
- Implement cache-busting headers
- Use versioned URLs with timestamps
- Consider alternative artifact storage

### 2. Zod Import Issues in Container
**Problem**: Importing zod causes errors in the Cloud Run container environment.

**Current Solution**: 
- Remove zod imports entirely
- Use manual type checking and validation

**Investigation Needed**: 
- Determine why zod fails in container
- Test alternative validation libraries
- Consider bundling zod differently

### 3. Package Name Extraction Complexity
**Problem**: Different request patterns require different extraction methods:
- Proxy requests: `/@owner/repo-name/mcp`
- Direct Cloud Run: `sigyl-mcp-owner-repo-hash.region.run.app`
- Fallback methods for edge cases

**Solution**: Multi-step extraction with fallbacks (implemented but needs testing)

### 4. Placeholder API Keys During Deployment
**Problem**: Health checks during deployment fail because no user secrets are configured yet.

**Solution**: 
- Detect placeholder API keys
- Return mock responses during deployment
- Allow deployment to complete successfully

### 5. Session Management Complexity
**Problem**: Session tracking adds significant complexity and potential failure points.

**Solution**: 
- Make session management optional
- Core wrapper should work without session features
- Add session support as enhancement layer

## 📋 Staged Development Plan

### Stage 1: Bare Minimum Wrapper (wrappertest9.js)
**Goal**: Create the simplest possible wrapper that absolutely works.

**Features**:
- ✅ API key validation
- ✅ Basic MCP server creation
- ✅ Request/response handling
- ✅ Simple logging
- ❌ No config fetching
- ❌ No secrets management
- ❌ No package name extraction
- ❌ No sessions
- ❌ No metrics

**Success Criteria**:
- Deploys successfully
- Responds to health checks
- Handles basic MCP requests
- Clean logs with no errors

### Stage 2: Package Name Extraction
**Goal**: Add dynamic package name detection.

**Features**:
- ✅ Path-based extraction (proxy requests)
- ✅ Cloud Run URL extraction
- ✅ Environment variable fallback
- ✅ Comprehensive logging of extraction process

**Success Criteria**:
- Correctly identifies package names for all request types
- Graceful fallback when extraction fails
- Clear logging shows extraction process

### Stage 3: Config & Secrets Management
**Goal**: Add configuration and user secrets support.

**Features**:
- ✅ Fetch package config from registry
- ✅ Fetch user secrets by package + API key
- ✅ Create config object without zod
- ✅ Placeholder values during deployment
- ✅ Proper error handling for missing secrets

**Success Criteria**:
- Successfully fetches and applies user configuration
- Handles missing secrets gracefully
- Works during deployment health checks

### Stage 4: Enhanced Error Handling
**Goal**: Improve error handling and user feedback.

**Features**:
- ✅ Detailed error messages
- ✅ Different error types (auth, config, server)
- ✅ Helpful troubleshooting information
- ✅ Structured error responses

**Success Criteria**:
- Users get helpful error messages
- Debugging is easier with clear error context
- No silent failures

### Stage 5: Metrics Foundation
**Goal**: Add basic metrics collection without sessions.

**Features**:
- ✅ Request/response logging
- ✅ Performance metrics (response time, memory)
- ✅ Error tracking
- ✅ Non-blocking async metrics
- ❌ No session tracking yet

**Success Criteria**:
- Metrics are collected and sent to registry
- Core functionality not affected by metrics failures
- Performance impact is minimal

### Stage 6: Session Management (Optional)
**Goal**: Add session tracking and conversation analytics.

**Features**:
- ✅ Session ID generation
- ✅ Session persistence
- ✅ Conversation flow tracking
- ✅ Session-based analytics

**Success Criteria**:
- Sessions work across multiple requests
- Analytics provide useful insights
- System degrades gracefully if sessions fail

## 🧪 Testing Strategy

### Unit Testing
- Test each stage independently
- Mock external dependencies (registry API, MCP servers)
- Validate error handling paths

### Integration Testing
- Test with real MCP servers (Google Maps, Brave Search)
- Test with different request patterns
- Test deployment process end-to-end

### Performance Testing
- Measure response times at each stage
- Test with concurrent requests
- Monitor memory usage and leaks

### Deployment Testing
- Test health checks during deployment
- Verify placeholder API key handling
- Test with missing/invalid configurations

## 🔄 Development Workflow

### For Each Stage:
1. **Create**: New wrapper version (wrappertest10.js, etc.)
2. **Test Locally**: Use local MCP servers for testing
3. **Deploy**: Update cloudRunService.ts filename
4. **Upload**: New version to GCS bucket
5. **Verify**: Test deployed version thoroughly
6. **Document**: Record what worked/failed

### Rollback Plan:
- Keep previous working version name in cloudRunService.ts
- Quick rollback by reverting filename change
- Maintain backup of last known working wrapper

## 📊 Success Metrics

### Reliability
- ✅ Deployment success rate > 95%
- ✅ Request success rate > 99%
- ✅ Health check success during deployment

### Performance
- ✅ Response time < 2s for typical requests
- ✅ Memory usage stable over time
- ✅ No memory leaks during extended operation

### Developer Experience
- ✅ Clear error messages for common issues
- ✅ Comprehensive logging for debugging
- ✅ Easy to add new MCP servers

### Analytics
- ✅ Complete request/response capture
- ✅ User behavior insights
- ✅ Error pattern identification

## 🚀 Next Immediate Actions

1. **Create wrappertest9.js** - Bare minimum working wrapper
2. **Update cloudRunService.ts** - Change filename to wrappertest9.cjs
3. **Upload to GCS** - Deploy new version
4. **Test thoroughly** - Verify basic functionality works
5. **Move to Stage 2** - Add package name extraction

## 📝 Notes

- **Keep it simple**: Each stage should be minimal increment
- **Test thoroughly**: Don't move to next stage until current works perfectly
- **Document everything**: Record what works and what doesn't
- **Maintain rollback capability**: Always have working version to fall back to
- **Focus on user experience**: Wrapper failures should provide helpful feedback 