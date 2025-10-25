import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateImageCost } from '@/lib/api-usage';
import { ImageGenerationRequest, ImageGenerationResponse } from '@/types/openai';

// Map OpenAI models to our internal models
const MODEL_MAPPING: Record<string, string> = {
  'dall-e-3': 'dall-e-3',
  'dall-e-2': 'dall-e-2',
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Parse request body
    const body: ImageGenerationRequest = await request.json();
    
    // Validate required fields
    if (!body.prompt) {
      return createApiError(
        'Missing required field: prompt is required',
        400,
        'invalid_request'
      );
    }

    // Set defaults
    const model = body.model || 'dall-e-3';
    const n = body.n || 1;
    const size = body.size || '1024x1024';
    const responseFormat = body.response_format || 'url';

    // Validate model
    if (!MODEL_MAPPING[model]) {
      return createApiError(
        `Invalid model: ${model}. Supported models: ${Object.keys(MODEL_MAPPING).join(', ')}`,
        400,
        'invalid_request'
      );
    }

    // Validate size
    const validSizes = model === 'dall-e-3' 
      ? ['1024x1024', '1024x1792', '1792x1024']
      : ['256x256', '512x512', '1024x1024'];
    
    if (!validSizes.includes(size)) {
      return createApiError(
        `Invalid size: ${size}. Supported sizes for ${model}: ${validSizes.join(', ')}`,
        400,
        'invalid_request'
      );
    }

    // Validate n
    if (n < 1 || n > (model === 'dall-e-3' ? 1 : 10)) {
      return createApiError(
        `Invalid n: ${n}. For ${model}, n must be between 1 and ${model === 'dall-e-3' ? 1 : 10}`,
        400,
        'invalid_request'
      );
    }

    // Create Z.ai client
    const zai = await ZAI.create();

    // Generate images
    const images = [];
    for (let i = 0; i < n; i++) {
      const response = await zai.images.generations.create({
        prompt: body.prompt,
        size: size as any, // Type assertion for Z.ai SDK
      });

      if (responseFormat === 'b64_json' && response.data[0]?.base64) {
        images.push({
          b64_json: response.data[0].base64,
          revised_prompt: response.data[0].revised_prompt,
        });
      } else {
        // For URL format, we'd need to upload the base64 to a storage service
        // For now, return base64 as a data URL
        const dataUrl = `data:image/png;base64,${response.data[0]?.base64}`;
        images.push({
          url: dataUrl,
          revised_prompt: response.data[0]?.revised_prompt,
        });
      }
    }

    // Create OpenAI-compatible response
    const response: ImageGenerationResponse = {
      created: Math.floor(Date.now() / 1000),
      data: images,
    };

    // Record usage
    const requestTime = Date.now() - startTime;
    const cost = calculateImageCost(model, size) * n;
    
    await recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: 'images/generations',
      model,
      cost,
      requestTime,
      statusCode: 200,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Create response with rate limit headers
    const apiResponse = createApiResponse(response);
    
    // Add rate limit headers
    apiResponse.headers.set('x-ratelimit-limit-requests', apiKey.rateLimit.toString());
    apiResponse.headers.set('x-ratelimit-remaining-requests', (apiKey.rateLimit - 1).toString());
    apiResponse.headers.set('x-ratelimit-reset-requests', Math.ceil(Date.now() / 1000 + 3600).toString());

    return apiResponse;

  } catch (error: any) {
    console.error('Image generation error:', error);
    
    const requestTime = Date.now() - startTime;
    
    // Try to get API key for usage tracking
    try {
      const authenticatedRequest = await authenticateApiRequest(request);
      await recordApiUsage({
        apiKeyId: authenticatedRequest.apiKey.id,
        endpoint: 'images/generations',
        requestTime,
        statusCode: error.statusCode || 500,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch {
      // Ignore auth errors for error tracking
    }

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}