# MCP Analytics System

This document describes the comprehensive analytics system built into the MCP platform that tracks usage metrics, performance data, and LLM costs.

## 🎯 Overview

The analytics system collects metrics from deployed MCP packages to provide insights for:
- **Platform optimization** - Understanding usage patterns and performance
- **User insights** - Helping users track their MCP usage and costs
- **Algorithm development** - Building future Google-style MCP recommendation algorithms

## 📊 Data Collection Architecture

```
User Request → Registry API → Cloud Run MCP → wrapper.js → MCP Server
                    ↓                          ↓
                Analytics DB ←── Metrics ───────┘
```

### Key Components

1. **wrapper.js** - Deployed with each MCP package, collects metrics at runtime
2. **Analytics API** - Receives and stores metrics in Supabase
3. **Database** - `mcp_metrics` table with comprehensive schema

## 🔍 Metrics Collected

### Basic Request Metrics
- Event type (mcp_request, tool_call, etc.)
- Package name and tool name
- Success/failure status and error types
- Response time and performance tier

### LLM Cost Tracking ⭐
- **Token usage** - Input/output tokens from LLM responses
- **Cost estimation** - Based on model pricing (GPT-4, Claude, etc.)
- **Model identification** - Which LLM model was used
- **Automatic detection** - Extracts data from OpenAI/Anthropic response formats

### Advanced Algorithm Signals
- User satisfaction signals
- Request complexity scoring
- Performance tiers (fast/medium/slow)
- Resource usage (memory, CPU)
- Time-based patterns (hour/day analysis)
- Secret usage patterns
- A/B testing variants

## 🚀 API Endpoints

### POST `/api/v1/analytics/mcp-metrics`
Receive metrics from deployed MCP wrappers (used by wrapper.js)

### GET `/api/v1/analytics/metrics/:userId`
Get time-series metrics for a user
- Query params: `days` (default: 30), `package_name` (optional)
- Returns: Daily aggregated metrics

### GET `/api/v1/analytics/overview/:userId`
Get comprehensive analytics overview
- Total requests, success rates, performance breakdown
- Top tools usage, error analysis
- Query params: `days` (default: 30)

### GET `/api/v1/analytics/llm-costs/:userId` ⭐
Get LLM token usage and cost metrics
- Returns: Token counts, estimated costs, breakdown by model
- Only includes data when LLM usage is detected in responses

### GET `/api/v1/analytics/packages/:userId`
Get metrics broken down by package
- Package-level usage statistics and performance

## 💰 LLM Cost Detection

The system automatically detects LLM usage by analyzing MCP responses for:

### Supported Patterns
```javascript
// OpenAI format
"usage": {"prompt_tokens": 100, "completion_tokens": 50}

// Anthropic format  
"input_tokens": 100, "output_tokens": 50

// Generic patterns
"tokens_used": 150, "token_count": 150
```

### Cost Estimation
Uses approximate pricing for major models:
- **GPT-4**: $0.03/1K input, $0.06/1K output
- **GPT-3.5**: $0.0015/1K input, $0.002/1K output  
- **Claude**: $0.008/1K input, $0.024/1K output

### Data Structure
```javascript
{
  "llm_usage": {
    "model": "gpt-4",
    "tokens_in": 100,
    "tokens_out": 50, 
    "cost_usd": 0.0045
  }
}
```

## 🗄️ Database Schema

```sql
CREATE TABLE public.mcp_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  package_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  mcp_method TEXT,
  tool_name TEXT,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  response_time_ms INTEGER,
  client_ip TEXT,
  user_agent TEXT,
  has_secrets BOOLEAN DEFAULT false,
  secret_count INTEGER DEFAULT 0,
  performance_tier TEXT CHECK (performance_tier IN ('fast', 'medium', 'slow')),
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  request_size_bytes INTEGER,
  user_satisfaction_signal TEXT,
  complexity_score TEXT,
  experiment_variant TEXT DEFAULT 'default',
  memory_usage_mb DECIMAL(10,2),
  cpu_time_ms DECIMAL(10,2),
  metadata JSONB DEFAULT '{}', -- Contains llm_usage and other data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuration

### Environment Variables
- `SIGYL_REGISTRY_URL` - Analytics endpoint URL (default: https://api.sigyl.dev)
- `NODE_ENV` - Set to 'development' to skip metrics in dev mode
- `SIGYL_EXPERIMENT_VARIANT` - A/B testing variant (default: 'default')

### Running Database Migration
The analytics schema requires the latest migration:
```bash
# Apply migration to update mcp_metrics table
supabase db push --db-url [your-database-url]
```

## 🧪 Testing

Use the provided test script to verify analytics functionality:

```bash
cd packages/registry-api
TEST_API_KEY=your_api_key node test-analytics.js
```

This tests all analytics endpoints and demonstrates the expected data formats.

## 🔮 Future Algorithm Applications

The collected data enables building sophisticated recommendation algorithms:

### Quality Signals
- Success rates and error patterns
- Performance consistency 
- User satisfaction indicators

### Usage Signals  
- Tool popularity and usage patterns
- Time-based activity analysis
- Cross-package correlation

### Cost Optimization
- LLM cost per operation
- Resource usage efficiency
- Performance vs cost trade-offs

### Personalization
- User-specific usage patterns
- Package recommendations
- Cost optimization suggestions

## 📈 Roadmap

- [ ] Real-time analytics dashboard
- [ ] Advanced LLM cost optimization
- [ ] Machine learning recommendations
- [ ] User notification system for cost alerts
- [ ] Package performance benchmarking 