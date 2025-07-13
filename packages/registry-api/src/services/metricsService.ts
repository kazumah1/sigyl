import { supabase } from '../config/database';

/**
 * Raw metrics data sent from wrapper.js
 * This should contain minimal processing - just the raw facts
 */
export interface RawMetricsData {
  // Basic request info
  event_type: string;
  package_name: string;
  timestamp: string;
  
  // Request details
  mcp_method?: string;
  tool_name?: string;
  success: boolean;
  error_type?: string;
  response_time_ms: number;
  
  // Request context
  client_ip?: string;
  user_agent?: string;
  request_size_bytes?: number;
  
  // Secrets usage
  has_secrets: boolean;
  secret_count: number;
  
  // System metrics
  memory_usage_mb?: number;
  cpu_time_ms?: number;
  
  // Raw request/response data for future analysis
  request_body?: any;
  response_body?: any;
  response_status_code?: number;
  
  // Wrapper metadata
  wrapper_version?: string;
  
  // Any additional data
  [key: string]: any;
}

/**
 * Processed metrics data that gets stored in the database
 */
export interface ProcessedMetricsData {
  user_id: string;
  package_name: string;
  event_type: string;
  mcp_method?: string;
  tool_name?: string;
  success: boolean;
  error_type?: string;
  response_time_ms: number;
  client_ip?: string;
  user_agent?: string;
  has_secrets: boolean;
  secret_count: number;
  
  // Computed fields (derived from raw data)
  performance_tier: 'fast' | 'medium' | 'slow';
  hour_of_day: number;
  day_of_week: number;
  request_size_bytes?: number;
  memory_usage_mb?: number;
  cpu_time_ms?: number;
  
  // Advanced analytics fields
  user_satisfaction_signal?: string;
  complexity_score?: string;
  experiment_variant: string;
  
  // Metadata containing all additional data
  metadata: {
    original_timestamp: string;
    wrapper_version?: string;
    llm_usage?: LLMUsageData;
    request_analysis?: RequestAnalysisData;
    performance_analysis?: PerformanceAnalysisData;
    additional_data: any;
  };
  
  created_at: string;
}

/**
 * LLM usage data extracted from responses
 */
export interface LLMUsageData {
  model?: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  provider?: 'openai' | 'anthropic' | 'unknown';
}

/**
 * Request analysis data for algorithm development
 */
export interface RequestAnalysisData {
  request_complexity: 'simple' | 'medium' | 'complex';
  tool_chaining: boolean;
  error_patterns: string[];
  user_intent_category?: string;
}

/**
 * Performance analysis data
 */
export interface PerformanceAnalysisData {
  bottleneck_type?: 'network' | 'compute' | 'memory' | 'io';
  cache_hit_ratio?: number;
  secret_injection_time_ms?: number;
  mcp_processing_time_ms?: number;
}

/**
 * Service for processing and analyzing MCP metrics
 * This centralizes all metrics logic that was previously in wrapper.js
 */
export class MetricsService {
  /**
   * Process raw metrics data from wrapper and store in database
   */
  async processAndStoreMetrics(rawData: RawMetricsData, userId: string): Promise<{ success: boolean; metric_id?: string; error?: string }> {
    try {
      console.log(`[METRICS_SERVICE] Processing metrics for user ${userId}, package: ${rawData.package_name}`);
      
      // Process the raw data into structured metrics
      const processedData = await this.processRawMetrics(rawData, userId);
      
      // Store in database
      const { data, error } = await supabase
        .from('mcp_metrics')
        .insert(processedData)
        .select('id')
        .single();
      
      if (error) {
        console.error('[METRICS_SERVICE] Database error:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`[METRICS_SERVICE] Successfully stored metric with ID: ${data.id}`);
      return { success: true, metric_id: data.id };
      
    } catch (error) {
      console.error('[METRICS_SERVICE] Processing error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Process raw metrics data into structured format
   */
  private async processRawMetrics(rawData: RawMetricsData, userId: string): Promise<ProcessedMetricsData> {
    const timestamp = new Date(rawData.timestamp);
    
    // Extract LLM usage if response data is available
    const llmUsage = this.extractLLMUsage(rawData.response_body);
    
    // Analyze request complexity and patterns
    const requestAnalysis = this.analyzeRequest(rawData);
    
    // Analyze performance characteristics
    const performanceAnalysis = this.analyzePerformance(rawData);
    
    // Calculate derived metrics
    const performanceTier = this.calculatePerformanceTier(rawData.response_time_ms);
    const complexityScore = this.calculateComplexityScore(rawData, requestAnalysis);
    
    return {
      user_id: userId,
      package_name: rawData.package_name,
      event_type: rawData.event_type,
      mcp_method: rawData.mcp_method,
      tool_name: rawData.tool_name,
      success: rawData.success,
      error_type: rawData.error_type,
      response_time_ms: rawData.response_time_ms,
      client_ip: rawData.client_ip,
      user_agent: rawData.user_agent,
      has_secrets: rawData.has_secrets,
      secret_count: rawData.secret_count,
      
      // Computed fields
      performance_tier: performanceTier,
      hour_of_day: timestamp.getHours(),
      day_of_week: timestamp.getDay(),
      request_size_bytes: rawData.request_size_bytes,
      memory_usage_mb: rawData.memory_usage_mb,
      cpu_time_ms: rawData.cpu_time_ms,
      
      // Advanced analytics
      complexity_score: complexityScore,
      experiment_variant: rawData.experiment_variant || 'default',
      
      // Metadata with all additional insights
      metadata: {
        original_timestamp: rawData.timestamp,
        wrapper_version: rawData.wrapper_version,
        llm_usage: llmUsage,
        request_analysis: requestAnalysis,
        performance_analysis: performanceAnalysis,
        additional_data: rawData
      },
      
      created_at: new Date().toISOString()
    };
  }
  
  /**
   * Extract LLM usage data from response body
   * Moved from wrapper.js with enhancements
   */
  private extractLLMUsage(responseBody: any): LLMUsageData | undefined {
    if (!responseBody) return undefined;
    
    try {
      let tokens_in = 0;
      let tokens_out = 0;
      let model: string | undefined;
      let cost_usd = 0;
      let provider: 'openai' | 'anthropic' | 'unknown' = 'unknown';
      
      const responseStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      
      // Enhanced model detection
      const modelPatterns = [
        { pattern: /"model":\s*"([^"]+)"/i, group: 1 },
        { pattern: /gpt-4[^"'\s]*/i, group: 0 },
        { pattern: /gpt-3\.5[^"'\s]*/i, group: 0 },
        { pattern: /claude-[^"'\s]*/i, group: 0 }
      ];
      
      for (const { pattern, group } of modelPatterns) {
        const match = responseStr.match(pattern);
        if (match) {
          model = match[group];
          break;
        }
      }
      
      // Determine provider from model
      if (model) {
        if (model.includes('gpt')) provider = 'openai';
        else if (model.includes('claude')) provider = 'anthropic';
      }
      
      // Enhanced token extraction patterns
      const tokenPatterns = [
        // OpenAI format
        /usage.*?"prompt_tokens":\s*(\d+).*?"completion_tokens":\s*(\d+)/i,
        // Anthropic format
        /input_tokens.*?(\d+).*?output_tokens.*?(\d+)/i,
        // Generic patterns
        /tokens_in.*?(\d+).*?tokens_out.*?(\d+)/i,
        /prompt.*?(\d+).*?completion.*?(\d+)/i
      ];
      
      for (const pattern of tokenPatterns) {
        const match = responseStr.match(pattern);
        if (match) {
          tokens_in = parseInt(match[1]);
          tokens_out = parseInt(match[2]);
          break;
        }
      }
      
      // Enhanced cost calculation with more models
      if (tokens_in > 0 || tokens_out > 0) {
        const costRates = this.getLLMCostRates(model, provider);
        cost_usd = (tokens_in * costRates.input) + (tokens_out * costRates.output);
        cost_usd = Math.round(cost_usd * 100000) / 100000; // Round to 5 decimal places
      }
      
      if (tokens_in > 0 || tokens_out > 0) {
        return {
          model: model || 'unknown',
          tokens_in,
          tokens_out,
          cost_usd,
          provider
        };
      }
      
      return undefined;
    } catch (error) {
      console.warn('[METRICS_SERVICE] Error extracting LLM usage:', error);
      return undefined;
    }
  }
  
  /**
   * Get LLM cost rates for different models
   */
  private getLLMCostRates(model?: string, provider?: string): { input: number; output: number } {
    const rates: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.00003, output: 0.00006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'gpt-4o': { input: 0.000005, output: 0.000015 },
      'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
      'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 },
      'claude-3-opus': { input: 0.000015, output: 0.000075 },
      'claude-3-sonnet': { input: 0.000003, output: 0.000015 },
      'claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
      'claude-3.5-sonnet': { input: 0.000003, output: 0.000015 }
    };
    
    if (model && rates[model]) {
      return rates[model];
    }
    
    // Fallback based on provider
    if (provider === 'openai') {
      return rates['gpt-4']; // Conservative estimate
    } else if (provider === 'anthropic') {
      return rates['claude-3-sonnet']; // Conservative estimate
    }
    
    // Default conservative estimate
    return { input: 0.00001, output: 0.00002 };
  }
  
  /**
   * Analyze request complexity and patterns
   */
  private analyzeRequest(rawData: RawMetricsData): RequestAnalysisData {
    const analysis: RequestAnalysisData = {
      request_complexity: 'simple',
      tool_chaining: false,
      error_patterns: []
    };
    
    try {
      // Analyze request complexity
      if (rawData.request_body) {
        const requestStr = JSON.stringify(rawData.request_body);
        const requestLength = requestStr.length;
        
        if (requestLength > 5000) {
          analysis.request_complexity = 'complex';
        } else if (requestLength > 1000) {
          analysis.request_complexity = 'medium';
        }
        
        // Check for tool chaining patterns
        if (requestStr.includes('tools/call') && (requestStr.match(/tools/g) || []).length > 1) {
          analysis.tool_chaining = true;
        }
        
        // Analyze user intent (basic categorization)
        const intentPatterns = {
          'data_retrieval': /get|fetch|retrieve|find|search|query/i,
          'data_modification': /create|update|delete|modify|change|set/i,
          'analysis': /analyze|calculate|compute|process|summarize/i,
          'generation': /generate|create|build|make|produce/i
        };
        
        for (const [category, pattern] of Object.entries(intentPatterns)) {
          if (pattern.test(requestStr)) {
            analysis.user_intent_category = category;
            break;
          }
        }
      }
      
      // Analyze error patterns
      if (!rawData.success && rawData.error_type) {
        analysis.error_patterns.push(rawData.error_type);
      }
      
      if (rawData.response_body) {
        const responseStr = JSON.stringify(rawData.response_body);
        const errorPatterns = [
          'timeout', 'rate_limit', 'auth_error', 'validation_error',
          'network_error', 'server_error', 'client_error'
        ];
        
        for (const pattern of errorPatterns) {
          if (responseStr.toLowerCase().includes(pattern)) {
            analysis.error_patterns.push(pattern);
          }
        }
      }
      
    } catch (error) {
      console.warn('[METRICS_SERVICE] Error analyzing request:', error);
    }
    
    return analysis;
  }
  
  /**
   * Analyze performance characteristics
   */
  private analyzePerformance(rawData: RawMetricsData): PerformanceAnalysisData {
    const analysis: PerformanceAnalysisData = {};
    
    try {
      // Determine bottleneck type based on metrics
      if (rawData.memory_usage_mb && rawData.memory_usage_mb > 500) {
        analysis.bottleneck_type = 'memory';
      } else if (rawData.response_time_ms > 10000) {
        analysis.bottleneck_type = 'network';
      } else if (rawData.response_time_ms > 5000) {
        analysis.bottleneck_type = 'compute';
      } else if (rawData.response_time_ms > 2000) {
        analysis.bottleneck_type = 'io';
      }
      
      // Estimate secret injection overhead (if we have timing data)
      if (rawData.secret_count > 0 && rawData.response_time_ms) {
        // Rough estimate: 10ms per secret for injection overhead
        analysis.secret_injection_time_ms = rawData.secret_count * 10;
      }
      
      // Estimate MCP processing time (total time minus estimated overheads)
      if (rawData.response_time_ms) {
        const estimatedOverhead = (analysis.secret_injection_time_ms || 0) + 50; // 50ms base overhead
        analysis.mcp_processing_time_ms = Math.max(0, rawData.response_time_ms - estimatedOverhead);
      }
      
    } catch (error) {
      console.warn('[METRICS_SERVICE] Error analyzing performance:', error);
    }
    
    return analysis;
  }
  
  /**
   * Calculate performance tier based on response time
   */
  private calculatePerformanceTier(responseTimeMs: number): 'fast' | 'medium' | 'slow' {
    if (responseTimeMs < 1000) return 'fast';
    if (responseTimeMs < 5000) return 'medium';
    return 'slow';
  }
  
  /**
   * Calculate complexity score for search algorithm
   */
  private calculateComplexityScore(rawData: RawMetricsData, analysis: RequestAnalysisData): string {
    let score = 0;
    
    // Base complexity from request analysis
    switch (analysis.request_complexity) {
      case 'simple': score += 1; break;
      case 'medium': score += 3; break;
      case 'complex': score += 5; break;
    }
    
    // Tool chaining adds complexity
    if (analysis.tool_chaining) score += 2;
    
    // Secret usage adds complexity
    if (rawData.secret_count > 0) score += 1;
    if (rawData.secret_count > 3) score += 1;
    
    // Response time indicates complexity
    if (rawData.response_time_ms > 5000) score += 2;
    else if (rawData.response_time_ms > 2000) score += 1;
    
    // Memory usage indicates complexity
    if (rawData.memory_usage_mb && rawData.memory_usage_mb > 200) score += 1;
    
    // Error handling adds complexity
    if (!rawData.success) score += 1;
    
    // Convert to category
    if (score <= 2) return 'simple';
    if (score <= 5) return 'medium';
    if (score <= 8) return 'complex';
    return 'very_complex';
  }
  
  /**
   * Batch process multiple metrics (for efficiency)
   */
  async processBatchMetrics(rawDataArray: Array<{ data: RawMetricsData; userId: string }>): Promise<{ 
    success: boolean; 
    processed: number; 
    failed: number; 
    errors: string[] 
  }> {
    const results = { success: true, processed: 0, failed: 0, errors: [] as string[] };
    
    for (const { data, userId } of rawDataArray) {
      const result = await this.processAndStoreMetrics(data, userId);
      if (result.success) {
        results.processed++;
      } else {
        results.failed++;
        if (result.error) results.errors.push(result.error);
      }
    }
    
    results.success = results.failed === 0;
    return results;
  }
} 