import { NextRequest } from 'next/server';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { ModelsResponse, Model } from '@/types/openai';
import { MODEL_CONFIGS } from '@/lib/zai-config';

// Available models based on our configuration
const MODELS: Model[] = Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
  id,
  object: 'model' as const,
  created: Math.floor(Date.now() / 1000),
  owned_by: 'z-ai',
}));

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