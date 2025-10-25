import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateTokenCost } from '@/lib/api-usage';
import { ChatCompletionRequest, ChatCompletionResponse } from '@/types/openai';
import { v4 as uuidv4 } from 'uuid';

// Map OpenAI models to our internal models
const MODEL_MAPPING: Record<string, string> = {
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k',
  'gpt-4': 'gpt-4',
  'gpt-4-32k': 'gpt-4-32k',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'text-davinci-003': 'text-davinci-003',
  'text-curie-001': 'text-curie-001',
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey, user } = authenticatedRequest;

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

    // Map model
    const internalModel = MODEL_MAPPING[body.model] || body.model;

    // Prepare messages for Z.ai API
    const zaiMessages = body.messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
    }));

    // Create Z.ai client
    const zai = await ZAI.create();

    // Make request to Z.ai API
    const completion = await zai.chat.completions.create({
      messages: zaiMessages,
      model: internalModel,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
      frequency_penalty: body.frequency_penalty,
      presence_penalty: body.presence_penalty,
      stop: body.stop,
      // Note: Z.ai might not support all OpenAI parameters, so we pass what it supports
    });

    // Calculate tokens (approximate if not provided)
    const promptTokens = estimateTokens(JSON.stringify(body.messages));
    const completionTokens = estimateTokens(completion.choices[0]?.message?.content || '');
    const totalTokens = promptTokens + completionTokens;

    // Create OpenAI-compatible response
    const response: ChatCompletionResponse = {
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model, // Return the original model name
      choices: completion.choices.map((choice, index) => ({
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
    const apiResponse = createApiResponse(response);
    
    // Add rate limit headers
    apiResponse.headers.set('x-ratelimit-limit-requests', apiKey.rateLimit.toString());
    apiResponse.headers.set('x-ratelimit-remaining-requests', (apiKey.rateLimit - 1).toString());
    apiResponse.headers.set('x-ratelimit-reset-requests', Math.ceil(Date.now() / 1000 + 3600).toString());

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

// Simple token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}