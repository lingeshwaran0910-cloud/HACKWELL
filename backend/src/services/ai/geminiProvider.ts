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

export class GeminiProvider implements AIProviderInterface {
  readonly providerName = 'gemini' as const;

  get modelName(): string {
    return env.AI_MODEL || 'gemini-flash-latest';
  }

  private getKey(): string {
    return process.env.GEMINI_API_KEY !== undefined ? process.env.GEMINI_API_KEY : (env.GEMINI_API_KEY || '');
  }

  isConfigured(): boolean {
    const key = this.getKey();
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
        error: err.message || 'Failed to reach Gemini API',
      };
    }
  }

  async testConnection(promptMessage: string): Promise<AITestResponse> {
    if (!this.isConfigured()) {
      throw new Error('AI CONFIGURATION MISSING: GEMINI_API_KEY is not set');
    }

    const apiKey = this.getKey();
    const modelCandidates = Array.from(
      new Set([this.modelName, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite'])
    );

    const requestBody = {
      contents: [
        {
          parts: [{ text: promptMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    let lastError: Error | null = null;
    let successfulModel = this.modelName;

    for (const model of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      logger.info({ provider: this.providerName, model }, 'Sending test call to Gemini API');

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey || '',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data: any = await response.json();
          const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          successfulModel = model;
          return {
            success: true,
            provider: this.providerName,
            model: successfulModel,
            response: textOutput.trim(),
          };
        } else {
          const errText = await response.text();
          logger.warn({ status: response.status, body: errText, model }, 'Gemini API candidate model returned non-200');
          lastError = new Error(`Gemini API call failed (${response.status}): ${errText}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini API model candidates failed');
  }

  async analyzeIncidentContext(context: SafeCityIncidentContext): Promise<StructuredIntelligenceOutput> {
    if (!this.isConfigured()) {
      throw new Error('AI CONFIGURATION MISSING: GEMINI_API_KEY is not set');
    }

    const apiKey = this.getKey();
    const modelCandidates = Array.from(
      new Set([this.modelName, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-2.5-flash-lite'])
    );

    const systemInstruction = `You are the SafeCity Operational Intelligence System.
Your job is to synthesize real operational ground data into structured incident intelligence for emergency commanders.

CRITICAL SAFETY RULES:
1. ONLY produce statements supported by the actual data provided.
2. Clearly distinguish FACTS (supported directly by evidence/database) from INFERENCES.
3. NEVER invent casualties, victim counts, or resource names.
4. Output JSON ONLY adhering strictly to the JSON schema specified.

JSON Schema format required:
{
  "incidentId": string,
  "classification": string,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "priorityScore": number (0-100),
  "confidence": number (0-100),
  "situationSummary": string,
  "keyFindings": string[],
  "riskFactors": string[],
  "whatChanged": string[],
  "recommendedNextSteps": string[],
  "resourceInsight": string,
  "hospitalInsight": string,
  "routeInsight": string,
  "missingInformation": string[],
  "supportingEntities": string[],
  "analysisTimestamp": string (ISO 8601)
}`;

    const userPrompt = `Here is the structured SafeCity ground context for Incident ID ${context.incident.id}:

${JSON.stringify(context, null, 2)}

Synthesize structured operational intelligence for this incident now. Respond in JSON only.`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    let lastError: Error | null = null;

    for (const model of modelCandidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      logger.info({ incidentId: context.incident.id, provider: this.providerName, model }, 'Calling Gemini API for incident intelligence');

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey || '',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.warn({ status: response.status, body: errText, model }, 'Gemini API candidate analysis call returned non-200');
          lastError = new Error(`Gemini API analysis request failed (${response.status}): ${errText}`);
          continue;
        }

        const data: any = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          lastError = new Error('Gemini API returned an empty content response');
          continue;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          logger.error({ rawText }, 'Failed to parse Gemini JSON response');
          lastError = new Error('Gemini API output was not valid JSON');
          continue;
        }

        // Ensure timestamp is present if omitted by AI
        if (!parsed.analysisTimestamp) {
          parsed.analysisTimestamp = new Date().toISOString();
        }
        if (!parsed.incidentId) {
          parsed.incidentId = context.incident.id;
        }

        // Validate with Zod
        const validatedOutput = IntelligenceOutputSchema.parse(parsed);
        return validatedOutput;
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini API model candidates failed for incident analysis');
  }
}

export const geminiProvider = new GeminiProvider();
