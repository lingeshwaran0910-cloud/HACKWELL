import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  AIProviderInterface,
  AIHealthResult,
  AITestResponse,
  SafeCityIncidentContext,
  StructuredIntelligenceOutput,
  IntelligenceOutputSchema,
} from './types';

export class OpenAIProvider implements AIProviderInterface {
  readonly providerName = 'openai' as const;

  get modelName(): string {
    return env.AI_MODEL || 'gpt-4o-mini';
  }

  isConfigured(): boolean {
    const key = env.OPENAI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  async healthCheck(): Promise<AIHealthResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        online: false,
        provider: this.providerName,
        model: this.modelName,
        message: 'AI CONFIGURATION MISSING',
      };
    }

    try {
      const testRes = await this.testConnection('Respond with PING');
      if (testRes.success) {
        return {
          configured: true,
          online: true,
          provider: this.providerName,
          model: this.modelName,
          message: 'AI ONLINE',
        };
      } else {
        return {
          configured: true,
          online: false,
          provider: this.providerName,
          model: this.modelName,
          message: 'AI PROVIDER ERROR',
        };
      }
    } catch (err: any) {
      return {
        configured: true,
        online: false,
        provider: this.providerName,
        model: this.modelName,
        message: 'AI PROVIDER ERROR',
        error: err.message || 'Failed to reach OpenAI API',
      };
    }
  }

  async testConnection(promptMessage: string): Promise<AITestResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI CONFIGURATION MISSING: OPENAI_API_KEY is not set');
    }

    const apiKey = env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const requestBody = {
      model: this.modelName,
      messages: [{ role: 'user', content: promptMessage }],
      temperature: 0.1,
    };

    logger.info({ provider: this.providerName, model: this.modelName }, 'Sending test call to OpenAI API');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, body: errText }, 'OpenAI API test call failed');
      throw new Error(`OpenAI API call failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const textOutput = data?.choices?.[0]?.message?.content || '';

    return {
      success: true,
      provider: this.providerName,
      model: this.modelName,
      response: textOutput.trim(),
    };
  }

  async analyzeIncidentContext(context: SafeCityIncidentContext): Promise<StructuredIntelligenceOutput> {
    if (!this.isConfigured()) {
      throw new Error('AI CONFIGURATION MISSING: OPENAI_API_KEY is not set');
    }

    const apiKey = env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemInstruction = `You are the SafeCity Operational Intelligence System.
Your job is to synthesize real operational ground data into structured incident intelligence for emergency commanders.

CRITICAL SAFETY RULES:
1. ONLY produce statements supported by the actual data provided.
2. Clearly distinguish FACTS from INFERENCES.
3. NEVER invent casualties, victim counts, or resource names.
4. Output JSON ONLY adhering strictly to the JSON schema specified.`;

    const userPrompt = `Here is the structured SafeCity ground context for Incident ID ${context.incident.id}:

${JSON.stringify(context, null, 2)}

Synthesize structured operational intelligence for this incident now. Respond in JSON only.`;

    const requestBody = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    };

    logger.info({ incidentId: context.incident.id, provider: this.providerName }, 'Calling OpenAI API for incident intelligence');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, body: errText }, 'OpenAI API analysis call failed');
      throw new Error(`OpenAI API analysis request failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;

    if (!rawText) {
      throw new Error('OpenAI API returned an empty content response');
    }

    const parsed = JSON.parse(rawText);
    if (!parsed.analysisTimestamp) {
      parsed.analysisTimestamp = new Date().toISOString();
    }
    if (!parsed.incidentId) {
      parsed.incidentId = context.incident.id;
    }

    return IntelligenceOutputSchema.parse(parsed);
  }
}

export const openaiProvider = new OpenAIProvider();
