import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateTokenCost } from '@/lib/api-usage';
import { ChatCompletionRequest, ChatCompletionResponse } from '@/types/openai';
import { ZAI_CONFIG, mapToZaiModel, getModelConfig } from '@/lib/zai-config';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Parse request body
    const body: ChatCompletionRequest = await request.json();
    
    // Validate required fields
    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return createApiError(
        'Missing required fields: model and messages are required',
        400,
        'invalid_request'
      );
    }

    // Get model configuration
    const modelConfig = getModelConfig(body.model);
    const zaiModel = mapToZaiModel(body.model);

    // Prepare messages for Z.ai API
    const zaiMessages = body.messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
    }));

    // Create Z.ai client and make request
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: zaiMessages,
      model: zaiModel,
      temperature: body.temperature || 0.7,
      max_tokens: body.max_tokens || modelConfig.maxTokens,
      top_p: body.top_p,
      frequency_penalty: body.frequency_penalty,
      presence_penalty: body.presence_penalty,
      stop: body.stop,
    });

    // Calculate tokens (use Z.ai's count if available, otherwise estimate)
    const promptTokens = completion.usage?.prompt_tokens || estimateTokens(JSON.stringify(body.messages));
    const completionTokens = completion.usage?.completion_tokens || estimateTokens(completion.choices[0]?.message?.content || '');
    const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;

    // Create OpenAI-compatible response
    const response_data: ChatCompletionResponse = {
      id: completion.id || `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: completion.created || Math.floor(Date.now() / 1000),
      model: body.model, // Return the original model name
      choices: completion.choices.map((choice: any, index: number) => ({
        index,
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
        },
        finish_reason: choice.finish_reason || 'stop',
      })),
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
      system_fingerprint: completion.system_fingerprint,
    };

    // Record usage
    const requestTime = Date.now() - startTime;
    const cost = calculateTokenCost(body.model, totalTokens);
    
    await recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: 'chat/completions',
      model: body.model,
      tokensUsed: totalTokens,
      cost,
      requestTime,
      statusCode: 200,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Create response with rate limit headers
    const rateLimitHeaders = {
      'x-ratelimit-limit-requests': apiKey.rateLimit.toString(),
      'x-ratelimit-remaining-requests': Math.max(0, apiKey.rateLimit - 1).toString(),
      'x-ratelimit-reset-requests': Math.ceil(Date.now() / 1000 + 3600).toString(),
    };
    
    const apiResponse = createApiResponse(response_data, 200, rateLimitHeaders);

    return apiResponse;

  } catch (error: any) {
    console.error('Chat completion error:', error);
    
    const requestTime = Date.now() - startTime;
    
    // Try to get API key for usage tracking
    try {
      const authenticatedRequest = await authenticateApiRequest(request);
      await recordApiUsage({
        apiKeyId: authenticatedRequest.apiKey.id,
        endpoint: 'chat/completions',
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

// Simple token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}