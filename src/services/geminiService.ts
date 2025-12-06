import type { FineTuningGoal, QAPair } from '../types';

class GeminiService {
  private isInitialized = false;
  private baseUrl = '/.netlify/functions/gemini-chat';
  private MAX_TOTAL_CONTEXT_CHARS = 12000; // ~3-4k tokens to prevent timeouts

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // API key will be handled by the Netlify function
    this.isInitialized = true;
    console.log('[GEMINI] Service initialized - using Netlify function proxy');
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private async makeRequest(
    messages: Array<{ role: string; parts: Array<{ text?: string; inlineData?: any }> }>,
    temperature = 0.7,
    maxTokens = 2000,
    tools?: any
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Gemini service not initialized');
    }

    console.log('[GEMINI] Making API request with', messages.length, 'messages, max tokens:', maxTokens);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
          tools,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Some API versions might return data in different fields or data might be missing
      if (!data || typeof data.content !== 'string') {
        throw new Error('Invalid response from Gemini API: missing content');
      }

      console.log('[GEMINI] Request successful, response length:', data.content.length);
      return data.content;
    } catch (error) {
      console.error('[GEMINI] Request failed:', error);
      throw error;
    }
  }

  private extractJSON(text: string): any {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

      // Try to find the JSON array explicitly
      const firstBracket = cleanText.indexOf('[');
      const lastBracket = cleanText.lastIndexOf(']');

      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const jsonString = cleanText.substring(firstBracket, lastBracket + 1);
          return JSON.parse(jsonString);
      }

      // Fallback to direct parse if no brackets found (e.g. object not array, or raw)
      return JSON.parse(cleanText);
    } catch (e) {
      console.error('JSON extraction failed:', e);
      throw new Error('Failed to parse JSON response from LLM');
    }
  }

  async identifyThemes(content: Array<{type: 'file' | 'url', name?: string, url?: string, content: string}>, goal: FineTuningGoal): Promise<string[]> {
    // Truncate content for themes analysis too
    let combinedContent = content.map(c => `${c.type === 'file' ? `File: ${c.name}` : `URL: ${c.url}`}\n${c.content}`).join('\n\n');
    if (combinedContent.length > this.MAX_TOTAL_CONTEXT_CHARS) {
       combinedContent = combinedContent.substring(0, this.MAX_TOTAL_CONTEXT_CHARS);
    }

    const prompt = `Analyze the following content and identify key themes for ${goal} fine-tuning:

${combinedContent}

Return a JSON array of theme names (strings only). Do not include any markdown formatting.`;

    try {
      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      return this.extractJSON(response);
    } catch (error) {
      console.error('Error identifying themes:', error);
      return [];
    }
  }

  async generateQAPairs(content: Array<{type: 'file' | 'url', name?: string, url?: string, content: string}>, themes: string[], goal: FineTuningGoal): Promise<any[]> {
    let prompt = `Generate high-quality question-answer pairs from this content for ${goal} fine-tuning.`;

    if (content.length > 0) {
      let combinedContent = content.map(c => c.content).join('\n\n');
      if (combinedContent.length > this.MAX_TOTAL_CONTEXT_CHARS) {
        console.warn(`[GEMINI] Content truncated from ${combinedContent.length} to ${this.MAX_TOTAL_CONTEXT_CHARS} chars`);
        combinedContent = combinedContent.substring(0, this.MAX_TOTAL_CONTEXT_CHARS);
      }
      prompt += `\n\nContent:\n${combinedContent}`;
    } else {
      prompt += `\n\nGenerate synthetic Q&A pairs based on the following themes (no specific source content provided).`;
    }

    prompt += `\n\nThemes to focus on:
${themes.join(', ')}

Generate 5-8 diverse Q&A pairs. Return a pure JSON array with objects containing: "user" (question), "model" (answer). Do not include markdown formatting.`;

    try {
      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      const pairs = this.extractJSON(response);

      if (Array.isArray(pairs)) {
        return pairs.map((pair: any) => ({
          question: pair.user || pair.question,
          answer: pair.model || pair.answer,
          isCorrect: true,
          confidence: 0.9,
          source: content.length > 0 ? 'original' : 'synthetic'
        }));
      }
      return [];
    } catch (error) {
      console.error('Error generating Q&A pairs:', error);
      return [];
    }
  }

  async validateQAPairs(pairs: QAPair[]): Promise<any[]> {
    // Mock validation for now
    return pairs.map((_, index) => ({
      pairId: `pair-${index}`,
      isValid: true,
      confidence: 0.85 + (Math.random() * 0.15),
      factualAccuracy: 0.9 + (Math.random() * 0.1),
    }));
  }

  async generateIncorrectAnswers(correctPairs: any[]): Promise<any[]> {
    if (correctPairs.length === 0) return [];

    // Process a subset to save tokens/time
    const pairsToProcess = correctPairs.slice(0, 5); // Reduce to 5 to match the lower batch size

    const prompt = `For each of the following Question-Answer pairs, generate a "distractor" answer.
    A distractor is an incorrect but plausible answer.

    Pairs:
    ${pairsToProcess.map((p, i) => `Pair ${i+1}:
    Q: ${p.question}
    A: ${p.answer}`).join('\n\n')}

    Return a pure JSON array (no markdown) of objects containing:
    - "original_question": (string)
    - "incorrect_answer": (string)
    `;

    try {
      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      const results = this.extractJSON(response);

      if (Array.isArray(results)) {
        return results.map((res: any) => ({
            question: res.original_question,
            answer: res.incorrect_answer,
            isCorrect: false,
            source: 'generated_distractor'
        }));
      }
      return [];

    } catch (error) {
      console.error('Error generating incorrect answers:', error);
      return [];
    }
  }
}

export const geminiService = new GeminiService();
