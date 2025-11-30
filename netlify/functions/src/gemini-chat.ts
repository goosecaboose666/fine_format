import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Ensure proper export for Netlify
export { handler };

interface RequestBody {
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  tools?: any;
  config?: any;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('[NETLIFY-GEMINI] Function invoked, method:', event.httpMethod);

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[NETLIFY-GEMINI] Missing GEMINI_API_KEY');
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

    const { messages, temperature = 0.7, max_tokens = 2000, tools } = JSON.parse(event.body) as RequestBody;

    // Prepare request for Gemini API
    const geminiBody = {
      contents: messages,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens,
      },
      tools,
    };

    // Using gemini-1.5-flash-latest as a good default
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NETLIFY-GEMINI] Upstream API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: `Gemini API error: ${response.statusText}`, details: errorText }),
      };
    }

    const data = await response.json();

    // Extract the text content from the response
    let content = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      content = data.candidates[0].content.parts.map((part: any) => part.text).join('');
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    };

  } catch (error) {
    console.error('[NETLIFY-GEMINI] Internal error:', error);
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
