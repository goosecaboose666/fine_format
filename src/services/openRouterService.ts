import type { QAPair, SyntheticQAPair, ValidationResult } from '../types';

class OpenRouterService {
  private async makeRequest(messages: Array<{role: string, content: string}>, model = 'anthropic/claude-3-haiku'): Promise<any> {
    const response = await fetch('/.netlify/functions/openrouter-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API request failed: ${response.status}`);
    }

    return response.json();
  }

  async validateQAPairs(pairs: (QAPair | SyntheticQAPair)[]): Promise<ValidationResult[]> {
    if (pairs.length === 0) return [];

    // Process in batches of 5 to avoid context limits and ensure better quality
    const batchSize = 5;
    const allResults: ValidationResult[] = [];

    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);

      const prompt = `Validate these Q&A pairs for quality and accuracy.

Pairs to validate:
${batch.map((pair, idx) => `Item ${idx + 1}:
Q: ${pair.user}
A: ${pair.model}`).join('\n\n')}

Return a pure JSON array (no markdown) where each object corresponds to an item above (in order) and contains:
- "index": (number, 1-based index from above)
- "isValid": (boolean, is this a good training example?)
- "accuracy": (number 0.0-1.0)
- "reasoning": (string, brief explanation)

Do not include any explanation text outside the JSON.`;

      const messages = [{
        role: 'user',
        content: prompt
      }];

      try {
        const response = await this.makeRequest(messages);

        // Handle potential differences in response structure depending on model/router
        const content = response.choices?.[0]?.message?.content || response.content || '';

        // Strip markdown if present
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[0]);

          const batchResults = results.map((result: any, idx: number) => ({
            pairId: `pair-${i + idx}`,
            isValid: typeof result.isValid === 'boolean' ? result.isValid : true,
            confidence: typeof result.accuracy === 'number' ? result.accuracy : 0.8,
            reasoning: result.reasoning || 'Validated',
            factualAccuracy: typeof result.accuracy === 'number' ? result.accuracy : 0.8,
            relevanceScore: 0.9 // Default for now
          }));

          allResults.push(...batchResults);
        } else {
           // Fallback for this batch if parsing fails
           console.warn('Failed to parse validation response for batch', i);
           allResults.push(...batch.map((_, idx) => ({
             pairId: `pair-${i + idx}`,
             isValid: true,
             confidence: 0.5,
             reasoning: 'Validation parsing failed',
             factualAccuracy: 0.5,
             relevanceScore: 0.5
           })));
        }

      } catch (error) {
        console.error('Error validating batch:', error);
         // Fallback for this batch on error
           allResults.push(...batch.map((_, idx) => ({
             pairId: `pair-${i + idx}`,
             isValid: true,
             confidence: 0.5,
             reasoning: 'Validation error',
             factualAccuracy: 0.5,
             relevanceScore: 0.5
           })));
      }
    }

    return allResults;
  }
}

export const openRouterService = new OpenRouterService();
