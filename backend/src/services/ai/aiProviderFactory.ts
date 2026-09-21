import { env } from '../../config/env';
import { AIProviderInterface } from './types';
import { geminiProvider } from './geminiProvider';
import { openaiProvider } from './openaiProvider';

export function getAIProvider(): AIProviderInterface {
  const provider = (env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'openai') {
    return openaiProvider;
  }
  return geminiProvider;
}
