import { supabase } from '../config/database';

/**
 * Raw session event data - captures EVERYTHING from wrapper
 * This is the complete request/response pair with zero processing
 */
export interface RawSessionEvent {
  // Session context
  session_id: string;
  event_sequence: number; // Order within session
  timestamp: string;
  
  // Basic context
  package_name: string;
  user_api_key: string; // For backend processing only
  client_ip?: string;
  user_agent?: string;
  
  // Complete request data
  request: {
    method: string;
    headers: Record<string, string>;
    body: any;
    url: string;
    query_params?: Record<string, string>;
    size_bytes: number;
  };
  
  // Complete response data
  response: {
    status_code: number;
    headers: Record<string, string>;
    body: any;
    size_bytes: number;
    duration_ms: number;
  };
  
  // System context
  system: {
    memory_usage_mb: number;
    cpu_time_ms: number;
    secrets_count: number;
    secrets_keys: string[]; // Just the keys, not values
    environment: 'production' | 'development' | 'staging';
    wrapper_version: string;
  };
  
  // Error context (if any)
  error?: {
    occurred: boolean;
    message?: string;
    stack?: string;
    type?: string;
  };
}

/**
 * Processed session analytics - computed by backend
 */
export interface SessionAnalytics {
  session_id: string;
  user_id: string;
  package_name: string;
  
  // Session metadata
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  total_events: number;
  
  // Conversation flow analysis
  conversation_flow: {
    interaction_type: 'single_shot' | 'multi_turn' | 'streaming' | 'complex_workflow';
    turns_count: number;
    average_response_time: number;
    user_intent: string; // Classified by AI
    completion_status: 'completed' | 'abandoned' | 'error' | 'timeout';
    satisfaction_signals: string[];
  };
  
  // Event classification (computed)
  events: {
    event_id: string;
    event_type: string; // Classified by backend: 'initialization', 'tool_call', 'resource_fetch', etc.
    mcp_method: string;
    tool_name?: string;
    success: boolean;
    error_type?: string; // Classified by backend
    response_time_ms: number;
    complexity_score: number;
    user_satisfaction_signal?: string;
  }[];
  
  // LLM usage analysis
  llm_usage: {
    total_tokens_in: number;
    total_tokens_out: number;
    estimated_cost_usd: number;
    models_used: string[];
    cost_breakdown: {
      model: string;
      tokens_in: number;
      tokens_out: number;
      cost_usd: number;
    }[];
  };
  
  // Performance analysis
  performance: {
    tier: 'fast' | 'medium' | 'slow';
    bottlenecks: string[];
    optimization_suggestions: string[];
    resource_efficiency: number; // 0-100 score
  };
  
  // Search algorithm signals
  search_signals: {
    user_engagement_score: number; // 0-100
    package_effectiveness: number; // 0-100
    error_rate: number;
    retry_patterns: string[];
    user_journey_stage: string;
  };
  
  created_at: string;
  processed_at: string;
}

/**
 * Service for handling session-based metrics with complete conversation tracking
 */
export class SessionMetricsService {
  
  /**
   * Store raw session event (called by wrapper)
   */
  async storeRawSessionEvent(event: RawSessionEvent, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[SESSION_METRICS] Storing raw event for session: ${event.session_id}, sequence: ${event.event_sequence}`);
      
      // Store in raw_session_events table
      const { error } = await supabase
        .from('raw_session_events')
        .insert({
          session_id: event.session_id,
          event_sequence: event.event_sequence,
          user_id: userId,
          package_name: event.package_name,
          timestamp: event.timestamp,
          
          // Store complete request/response as JSONB
          request_data: event.request,
          response_data: event.response,
          system_data: event.system,
          error_data: event.error,
          
          // Metadata
          client_ip: event.client_ip,
          user_agent: event.user_agent,
          
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('[SESSION_METRICS] Error storing raw event:', error);
        return { success: false, error: error.message };
      }
      
      // Trigger async session analysis if this looks like a session end
      if (this.isSessionEndEvent(event)) {
        setImmediate(() => this.processSessionAnalytics(event.session_id));
      }
      
      return { success: true };
    } catch (error) {
      console.error('[SESSION_METRICS] Exception storing raw event:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Process complete session analytics (async background task)
   */
  async processSessionAnalytics(sessionId: string): Promise<void> {
    try {
      console.log(`[SESSION_ANALYTICS] Processing session: ${sessionId}`);
      
      // Get all events for this session
      const { data: events, error } = await supabase
        .from('raw_session_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('event_sequence', { ascending: true });
      
      if (error || !events || events.length === 0) {
        console.error('[SESSION_ANALYTICS] No events found for session:', sessionId);
        return;
      }
      
      // Process the session
      const analytics = await this.analyzeSession(events);
      
      // Store processed analytics
      const { error: storeError } = await supabase
        .from('session_analytics')
        .upsert({
          session_id: sessionId,
          user_id: events[0].user_id,
          package_name: events[0].package_name,
          
          // Session metadata
          started_at: events[0].timestamp,
          ended_at: events[events.length - 1].timestamp,
          duration_ms: new Date(events[events.length - 1].timestamp).getTime() - new Date(events[0].timestamp).getTime(),
          total_events: events.length,
          
          // Processed analytics
          conversation_flow: analytics.conversation_flow,
          events: analytics.events,
          llm_usage: analytics.llm_usage,
          performance: analytics.performance,
          search_signals: analytics.search_signals,
          
          created_at: events[0].created_at,
          processed_at: new Date().toISOString()
        });
      
      if (storeError) {
        console.error('[SESSION_ANALYTICS] Error storing analytics:', storeError);
      } else {
        console.log(`[SESSION_ANALYTICS] Successfully processed session: ${sessionId}`);
      }
      
    } catch (error) {
      console.error('[SESSION_ANALYTICS] Exception processing session:', error);
    }
  }
  
  /**
   * Analyze complete session to extract insights
   */
  private async analyzeSession(events: any[]): Promise<Omit<SessionAnalytics, 'session_id' | 'user_id' | 'package_name' | 'started_at' | 'ended_at' | 'duration_ms' | 'total_events' | 'created_at' | 'processed_at'>> {
    
    // Analyze conversation flow
    const conversation_flow = this.analyzeConversationFlow(events);
    
    // Classify and analyze each event
    const processedEvents = events.map((event, index) => ({
      event_id: `${event.session_id}_${event.event_sequence}`,
      event_type: this.classifyEventType(event),
      mcp_method: event.request_data?.body?.method || 'unknown',
      tool_name: event.request_data?.body?.params?.name,
      success: event.response_data?.status_code < 400,
      error_type: this.classifyErrorType(event),
      response_time_ms: event.response_data?.duration_ms || 0,
      complexity_score: this.calculateComplexityScore(event),
      user_satisfaction_signal: this.detectSatisfactionSignal(event, index, events)
    }));
    
    // Analyze LLM usage across all events
    const llm_usage = this.analyzeLLMUsage(events);
    
    // Analyze performance
    const performance = this.analyzePerformance(events);
    
    // Generate search algorithm signals
    const search_signals = this.generateSearchSignals(events, processedEvents);
    
    return {
      conversation_flow,
      events: processedEvents,
      llm_usage,
      performance,
      search_signals
    };
  }
  
  /**
   * Classify event type based on request/response patterns
   */
  private classifyEventType(event: any): string {
    const method = event.request_data?.body?.method;
    const url = event.request_data?.url;
    
    if (method === 'initialize') return 'session_initialization';
    if (method === 'tools/list') return 'tool_discovery';
    if (method === 'tools/call') return 'tool_execution';
    if (method === 'resources/list') return 'resource_discovery';
    if (method === 'resources/read') return 'resource_access';
    if (method === 'prompts/list') return 'prompt_discovery';
    if (method === 'prompts/get') return 'prompt_access';
    if (url?.includes('/health')) return 'health_check';
    if (event.response_data?.status_code >= 400) return 'error_event';
    
    return 'unknown_event';
  }
  
  /**
   * Classify error type based on response and error data
   */
  private classifyErrorType(event: any): string | undefined {
    const statusCode = event.response_data?.status_code;
    const errorData = event.error_data;
    
    if (statusCode === 401) return 'authentication_error';
    if (statusCode === 403) return 'authorization_error';
    if (statusCode === 404) return 'resource_not_found';
    if (statusCode === 429) return 'rate_limit_exceeded';
    if (statusCode >= 500) return 'server_error';
    if (statusCode === 400) return 'invalid_request';
    
    if (errorData?.occurred) {
      if (errorData.type) return errorData.type;
      if (errorData.message?.includes('timeout')) return 'timeout_error';
      if (errorData.message?.includes('network')) return 'network_error';
      return 'unknown_error';
    }
    
    return undefined;
  }
  
  /**
   * Analyze conversation flow patterns
   */
  private analyzeConversationFlow(events: any[]): SessionAnalytics['conversation_flow'] {
    const toolCalls = events.filter(e => e.request_data?.body?.method === 'tools/call');
    const avgResponseTime = events.reduce((sum, e) => sum + (e.response_data?.duration_ms || 0), 0) / events.length;
    
    let interaction_type: SessionAnalytics['conversation_flow']['interaction_type'] = 'single_shot';
    if (toolCalls.length > 3) interaction_type = 'complex_workflow';
    else if (toolCalls.length > 1) interaction_type = 'multi_turn';
    
    // Analyze user intent using patterns
    const user_intent = this.inferUserIntent(events);
    
    // Determine completion status
    const lastEvent = events[events.length - 1];
    let completion_status: SessionAnalytics['conversation_flow']['completion_status'] = 'completed';
    if (lastEvent.response_data?.status_code >= 400) completion_status = 'error';
    else if (events.length === 1) completion_status = 'abandoned';
    
    return {
      interaction_type,
      turns_count: toolCalls.length,
      average_response_time: avgResponseTime,
      user_intent,
      completion_status,
      satisfaction_signals: this.extractSatisfactionSignals(events)
    };
  }
  
  /**
   * Analyze LLM usage across all events
   */
  private analyzeLLMUsage(events: any[]): SessionAnalytics['llm_usage'] {
    let total_tokens_in = 0;
    let total_tokens_out = 0;
    let estimated_cost_usd = 0;
    const models_used = new Set<string>();
    const cost_breakdown: SessionAnalytics['llm_usage']['cost_breakdown'] = [];
    
    events.forEach(event => {
      const responseBody = event.response_data?.body;
      if (!responseBody) return;
      
      const llmData = this.extractLLMUsageFromResponse(responseBody);
      if (llmData) {
        total_tokens_in += llmData.tokens_in;
        total_tokens_out += llmData.tokens_out;
        estimated_cost_usd += llmData.cost_usd;
        
        if (llmData.model) {
          models_used.add(llmData.model);
          cost_breakdown.push({
            model: llmData.model,
            tokens_in: llmData.tokens_in,
            tokens_out: llmData.tokens_out,
            cost_usd: llmData.cost_usd
          });
        }
      }
    });
    
    return {
      total_tokens_in,
      total_tokens_out,
      estimated_cost_usd,
      models_used: Array.from(models_used),
      cost_breakdown
    };
  }
  
  /**
   * Analyze performance patterns
   */
  private analyzePerformance(events: any[]): SessionAnalytics['performance'] {
    const avgResponseTime = events.reduce((sum, e) => sum + (e.response_data?.duration_ms || 0), 0) / events.length;
    const avgMemory = events.reduce((sum, e) => sum + (e.system_data?.memory_usage_mb || 0), 0) / events.length;
    
    let tier: SessionAnalytics['performance']['tier'] = 'fast';
    if (avgResponseTime > 5000) tier = 'slow';
    else if (avgResponseTime > 1000) tier = 'medium';
    
    const bottlenecks: string[] = [];
    if (avgResponseTime > 3000) bottlenecks.push('high_response_time');
    if (avgMemory > 200) bottlenecks.push('high_memory_usage');
    
    return {
      tier,
      bottlenecks,
      optimization_suggestions: this.generateOptimizationSuggestions(events),
      resource_efficiency: this.calculateResourceEfficiency(events)
    };
  }
  
  /**
   * Generate search algorithm signals
   */
  private generateSearchSignals(events: any[], processedEvents: any[]): SessionAnalytics['search_signals'] {
    const errorRate = processedEvents.filter(e => !e.success).length / processedEvents.length;
    
    return {
      user_engagement_score: this.calculateEngagementScore(events),
      package_effectiveness: this.calculateEffectivenessScore(events),
      error_rate: errorRate,
      retry_patterns: this.detectRetryPatterns(events),
      user_journey_stage: this.inferJourneyStage(events)
    };
  }
  
  // Helper methods for analysis
  private isSessionEndEvent(event: RawSessionEvent): boolean {
    return event.request.method === 'close' || 
           event.error?.occurred === true ||
           event.response.status_code >= 500;
  }
  
  private calculateComplexityScore(event: any): number {
    let score = 1;
    
    // Increase score based on request complexity
    if (event.request_data?.body?.params) {
      score += Object.keys(event.request_data.body.params).length * 0.5;
    }
    
    // Increase score based on response size
    if (event.response_data?.size_bytes > 10000) score += 2;
    else if (event.response_data?.size_bytes > 1000) score += 1;
    
    return Math.min(score, 10); // Cap at 10
  }
  
  private detectSatisfactionSignal(event: any, index: number, allEvents: any[]): string | undefined {
    // Look for patterns that indicate user satisfaction/dissatisfaction
    if (event.response_data?.status_code >= 400) return 'error_frustration';
    if (event.response_data?.duration_ms > 10000) return 'slow_response_frustration';
    if (index === allEvents.length - 1 && event.response_data?.status_code === 200) return 'successful_completion';
    
    return undefined;
  }
  
  private inferUserIntent(events: any[]): string {
    const methods = events.map(e => e.request_data?.body?.method).filter(Boolean);
    
    if (methods.includes('tools/list') && methods.includes('tools/call')) return 'tool_exploration_and_usage';
    if (methods.includes('resources/list') && methods.includes('resources/read')) return 'resource_exploration_and_access';
    if (methods.filter(m => m === 'tools/call').length > 3) return 'complex_workflow_execution';
    if (methods.includes('tools/call')) return 'simple_tool_usage';
    
    return 'exploration';
  }
  
  private extractSatisfactionSignals(events: any[]): string[] {
    const signals: string[] = [];
    
    const successfulEvents = events.filter(e => e.response_data?.status_code < 400);
    const errorEvents = events.filter(e => e.response_data?.status_code >= 400);
    
    if (successfulEvents.length > errorEvents.length) signals.push('mostly_successful');
    if (errorEvents.length === 0) signals.push('error_free');
    if (events.length > 5) signals.push('engaged_session');
    
    return signals;
  }
  
  private extractLLMUsageFromResponse(responseBody: any): { model: string; tokens_in: number; tokens_out: number; cost_usd: number } | null {
    // This is the same logic from the original wrapper, but centralized
    try {
      const responseStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      
      let tokens_in = 0;
      let tokens_out = 0;
      let model = null;
      
      // Try to extract model information
      const modelMatch = responseStr.match(/"model":\s*"([^"]+)"/i);
      if (modelMatch) {
        model = modelMatch[1];
      }
      
      // Try to extract token usage
      const openaiMatch = responseStr.match(/usage.*?"prompt_tokens":\s*(\d+).*?"completion_tokens":\s*(\d+)/i);
      if (openaiMatch) {
        tokens_in = parseInt(openaiMatch[1]);
        tokens_out = parseInt(openaiMatch[2]);
      } else {
        const anthropicMatch = responseStr.match(/input_tokens.*?(\d+).*?output_tokens.*?(\d+)/i);
        if (anthropicMatch) {
          tokens_in = parseInt(anthropicMatch[1]);
          tokens_out = parseInt(anthropicMatch[2]);
        }
      }
      
      if (tokens_in === 0 && tokens_out === 0) return null;
      
      // Calculate cost
      let cost_usd = 0;
      if (model?.includes('gpt-4o')) {
        cost_usd = (tokens_in * 0.000005) + (tokens_out * 0.000015);
      } else if (model?.includes('gpt-4')) {
        cost_usd = (tokens_in * 0.00003) + (tokens_out * 0.00006);
      } else if (model?.includes('claude-3.5')) {
        cost_usd = (tokens_in * 0.000003) + (tokens_out * 0.000015);
      } else if (model?.includes('claude')) {
        cost_usd = (tokens_in * 0.000008) + (tokens_out * 0.000024);
      } else {
        cost_usd = (tokens_in * 0.00001) + (tokens_out * 0.00002);
      }
      
      return {
        model: model || 'unknown',
        tokens_in,
        tokens_out,
        cost_usd
      };
    } catch (error) {
      return null;
    }
  }
  
  private generateOptimizationSuggestions(events: any[]): string[] {
    const suggestions: string[] = [];
    
    const avgResponseTime = events.reduce((sum, e) => sum + (e.response_data?.duration_ms || 0), 0) / events.length;
    if (avgResponseTime > 3000) suggestions.push('optimize_response_time');
    
    const avgMemory = events.reduce((sum, e) => sum + (e.system_data?.memory_usage_mb || 0), 0) / events.length;
    if (avgMemory > 200) suggestions.push('optimize_memory_usage');
    
    return suggestions;
  }
  
  private calculateResourceEfficiency(events: any[]): number {
    // Calculate efficiency score based on resource usage vs output
    const avgResponseTime = events.reduce((sum, e) => sum + (e.response_data?.duration_ms || 0), 0) / events.length;
    const avgMemory = events.reduce((sum, e) => sum + (e.system_data?.memory_usage_mb || 0), 0) / events.length;
    
    let efficiency = 100;
    if (avgResponseTime > 1000) efficiency -= 20;
    if (avgResponseTime > 5000) efficiency -= 30;
    if (avgMemory > 100) efficiency -= 15;
    if (avgMemory > 200) efficiency -= 25;
    
    return Math.max(efficiency, 0);
  }
  
  private calculateEngagementScore(events: any[]): number {
    let score = 0;
    
    // More events = higher engagement
    score += Math.min(events.length * 10, 50);
    
    // Successful events boost score
    const successfulEvents = events.filter(e => e.response_data?.status_code < 400);
    score += (successfulEvents.length / events.length) * 30;
    
    // Tool usage boosts score
    const toolCalls = events.filter(e => e.request_data?.body?.method === 'tools/call');
    score += Math.min(toolCalls.length * 5, 20);
    
    return Math.min(score, 100);
  }
  
  private calculateEffectivenessScore(events: any[]): number {
    const successRate = events.filter(e => e.response_data?.status_code < 400).length / events.length;
    const avgResponseTime = events.reduce((sum, e) => sum + (e.response_data?.duration_ms || 0), 0) / events.length;
    
    let score = successRate * 60; // Success rate is 60% of score
    
    // Response time affects effectiveness
    if (avgResponseTime < 1000) score += 25;
    else if (avgResponseTime < 3000) score += 15;
    else if (avgResponseTime < 5000) score += 5;
    
    // Tool usage completion affects effectiveness
    const toolCalls = events.filter(e => e.request_data?.body?.method === 'tools/call');
    if (toolCalls.length > 0) {
      const successfulToolCalls = toolCalls.filter(e => e.response_data?.status_code < 400);
      score += (successfulToolCalls.length / toolCalls.length) * 15;
    }
    
    return Math.min(score, 100);
  }
  
  private detectRetryPatterns(events: any[]): string[] {
    const patterns: string[] = [];
    
    // Look for repeated failed requests
    const failedRequests = events.filter(e => e.response_data?.status_code >= 400);
    if (failedRequests.length > 1) {
      patterns.push('multiple_failures');
    }
    
    // Look for repeated tool calls
    const toolCalls = events.filter(e => e.request_data?.body?.method === 'tools/call');
    const toolNames = toolCalls.map(e => e.request_data?.body?.params?.name).filter(Boolean);
    const uniqueTools = new Set(toolNames);
    
    if (toolNames.length > uniqueTools.size) {
      patterns.push('repeated_tool_calls');
    }
    
    return patterns;
  }
  
  private inferJourneyStage(events: any[]): string {
    const methods = events.map(e => e.request_data?.body?.method).filter(Boolean);
    
    if (methods.includes('initialize')) return 'onboarding';
    if (methods.includes('tools/list') && !methods.includes('tools/call')) return 'exploration';
    if (methods.includes('tools/call')) return 'active_usage';
    
    return 'unknown';
  }
} 