import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Ensure proper export for Netlify
export { handler };

interface RequestBody {
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('[NETLIFY-OPENROUTER] Function invoked, method:', event.httpMethod);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Method not allowed',
        type: 'METHOD_NOT_ALLOWED'
      }),
    };
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[NETLIFY-OPENROUTER] Missing OPENROUTER_API_KEY');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Server configuration error: Missing API Key' }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const { messages, temperature = 0.7, max_tokens = 2000, model = 'anthropic/claude-3-haiku' } = JSON.parse(event.body) as RequestBody;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NETLIFY-OPENROUTER] Upstream API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: `OpenRouter API error: ${response.statusText}`, details: errorText }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('[NETLIFY-OPENROUTER] Internal error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
    };
  }
};
