/**
 * lib/ai-provider.ts
 * 
 * Reusable AI provider layer for Groq and future extensibility.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIProvider {
  private static GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private static DEFAULT_MODEL = 'llama-3.3-70b-versatile';

  /**
   * Generates a chat completion using Groq with retry logic.
   */
  static async generateChatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      retries?: number;
    } = {}
  ): Promise<AIResponse> {
    const { retries = 2 } = options;
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._executeRequest(messages, options);
      } catch (error: any) {
        lastError = error;
        // Don't retry on Auth or Bad Request errors
        if (error.message.includes('401') || error.message.includes('400')) throw error;
        
        console.warn(`[AIProvider] Attempt ${attempt + 1} failed. ${retries - attempt} retries left.`, error.message);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential-ish backoff
        }
      }
    }

    throw lastError;
  }

  private static async _executeRequest(
    messages: ChatMessage[],
    options: any
  ): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing or not loaded in environment');


    const {
      model = this.DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = 2048,
      timeoutMs = 30000,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        }
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
