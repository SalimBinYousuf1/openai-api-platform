import { NextRequest } from 'next/server';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { ModelsResponse, Model } from '@/types/openai';

// Available models
const MODELS: Model[] = [
  {
    id: 'gpt-3.5-turbo',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  },
  {
    id: 'gpt-3.5-turbo-16k',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  },
  {
    id: 'gpt-4',
    object: 'model',
    created: 1687882410,
    owned_by: 'openai',
  },
  {
    id: 'gpt-4-32k',
    object: 'model',
    created: 1687882410,
    owned_by: 'openai',
  },
  {
    id: 'gpt-4-turbo',
    object: 'model',
    created: 1712361441,
    owned_by: 'openai',
  },
  {
    id: 'gpt-4o',
    object: 'model',
    created: 1715367049,
    owned_by: 'openai',
  },
  {
    id: 'gpt-4o-mini',
    object: 'model',
    created: 1715367049,
    owned_by: 'openai',
  },
  {
    id: 'text-davinci-003',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  },
  {
    id: 'text-curie-001',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  },
  {
    id: 'dall-e-3',
    object: 'model',
    created: 1698798177,
    owned_by: 'openai',
  },
  {
    id: 'dall-e-2',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
  },
];

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Create OpenAI-compatible response
    const response: ModelsResponse = {
      object: 'list',
      data: MODELS,
    };

    // Create response with rate limit headers
    const apiResponse = createApiResponse(response);
    
    // Add rate limit headers
    apiResponse.headers.set('x-ratelimit-limit-requests', apiKey.rateLimit.toString());
    apiResponse.headers.set('x-ratelimit-remaining-requests', (apiKey.rateLimit - 1).toString());
    apiResponse.headers.set('x-ratelimit-reset-requests', Math.ceil(Date.now() / 1000 + 3600).toString());

    return apiResponse;

  } catch (error: any) {
    console.error('Models list error:', error);

    if (error.statusCode) {
      return createApiError(error.message, error.statusCode, error.code);
    }

    return createApiError(
      'Internal server error',
      500,
      'internal_error'
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}