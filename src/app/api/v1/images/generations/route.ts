import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateImageCost } from '@/lib/api-usage';
import { ImageGenerationRequest, ImageGenerationResponse } from '@/types/openai';
import { ZAI_CONFIG, mapToZaiModel, getModelConfig } from '@/lib/zai-config';

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

    // Get model configuration
    const modelConfig = getModelConfig(model);
    const zaiModel = mapToZaiModel(model);

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

    // Generate images
    const images = [];
    const zai = await ZAI.create();
    
    for (let i = 0; i < n; i++) {
      try {
        // Make request to Z.ai API for image generation
        const response = await zai.images.generations.create({
          prompt: body.prompt,
          size: size as any, // Type assertion for Z.ai SDK
        });

        // Process the image response
        if (response.data && response.data[0]) {
          const imageData = response.data[0];
          
          if (responseFormat === 'b64_json' && imageData.base64) {
            images.push({
              b64_json: imageData.base64,
              revised_prompt: imageData.revised_prompt || body.prompt,
            });
          } else {
            // For URL format, create a data URL from base64
            const base64Data = imageData.base64;
            if (base64Data) {
              const dataUrl = `data:image/png;base64,${base64Data}`;
              images.push({
                url: dataUrl,
                revised_prompt: imageData.revised_prompt || body.prompt,
              });
            }
          }
        } else {
          throw new Error('No image data returned from Z.ai API');
        }
      } catch (error: any) {
        console.error(`Image generation ${i + 1} failed:`, error);
        // Continue with other images if one fails
        if (i === 0 && n === 1) {
          throw error; // Re-throw if this is the only image
        }
      }
    }

    if (images.length === 0) {
      throw new Error('Failed to generate any images');
    }

    // Create OpenAI-compatible response
    const response_data: ImageGenerationResponse = {
      created: Math.floor(Date.now() / 1000),
      data: images,
    };

    // Record usage
    const requestTime = Date.now() - startTime;
    const cost = calculateImageCost(model, size) * images.length;
    
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
    const apiResponse = createApiResponse(response_data);
    
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

    if (error.name === 'AbortError') {
      return createApiError(
        'Request timeout',
        408,
        'timeout'
      );
    }

    if (error.statusCode) {
      return createApiError(error.message, error.statusCode, error.code);
    }

    return createApiError(
      error.message || 'Internal server error',
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