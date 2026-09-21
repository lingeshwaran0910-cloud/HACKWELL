import { getAIProvider } from './aiProviderFactory';
import { buildIncidentContext } from './contextBuilder';
import {
  AIHealthResult,
  AITestResponse,
  SafeCityIncidentContext,
  StructuredIntelligenceOutput,
} from './types';

export class AIService {
  /**
   * Performs an AI provider health check.
   */
  async checkHealth(): Promise<AIHealthResult> {
    const provider = getAIProvider();
    return provider.healthCheck();
  }

  /**
   * Minimal connectivity test path.
   */
  async testConnection(message: string): Promise<AITestResponse> {
    const provider = getAIProvider();
    return provider.testConnection(message);
  }

  /**
   * Builds context from real SafeCity data and calls the real AI model.
   */
  async analyzeIncident(incidentId: string): Promise<StructuredIntelligenceOutput> {
    const provider = getAIProvider();
    if (!provider.isConfigured()) {
      throw new Error('AI CONFIGURATION MISSING: AI API key is not configured');
    }
    const context: SafeCityIncidentContext = await buildIncidentContext(incidentId);
    return provider.analyzeIncidentContext(context);
  }
}

export const aiService = new AIService();
