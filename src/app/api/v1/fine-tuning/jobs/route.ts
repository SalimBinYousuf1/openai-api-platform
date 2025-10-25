import { NextRequest } from 'next/server';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage } from '@/lib/api-usage';
import { v4 as uuidv4 } from 'uuid';

interface FineTuningJobRequest {
  training_file: string;
  model: string;
  hyperparameters?: {
    batch_size?: number;
    learning_rate_multiplier?: number;
    n_epochs?: number;
    classification_n_classes?: number;
    classification_positive_class?: string;
    compute_classification_metrics?: boolean;
    prompt_loss_weight?: number;
  };
  suffix?: string;
  validation_file?: string;
}

interface FineTuningJob {
  object: 'fine_tuning.job';
  id: string;
  model: string;
  created_at: number;
  finished_at: number | null;
  fine_tuned_model: string | null;
  organization_id: string;
  result_files: string[];
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  validation_file: string | null;
  training_file: string;
  hyperparameters: any;
  trained_tokens: number | null;
  error: any | null;
  user_provided_suffix: string | null;
  estimated_finish: number | null;
}

// Mock storage for fine-tuning jobs
const fineTuningJobs = new Map<string, FineTuningJob>();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Parse request body
    const body: FineTuningJobRequest = await request.json();
    
    // Validate required fields
    if (!body.training_file || !body.model) {
      return createApiError(
        'Missing required fields: training_file and model are required',
        400,
        'invalid_request'
      );
    }

    // Create a new fine-tuning job
    const jobId = `ftjob-${uuidv4()}`;
    const now = Math.floor(Date.now() / 1000);
    
    const job: FineTuningJob = {
      object: 'fine_tuning.job',
      id: jobId,
      model: body.model,
      created_at: now,
      finished_at: null,
      fine_tuned_model: null,
      organization_id: 'org-' + uuidv4(),
      result_files: [],
      status: 'queued',
      validation_file: body.validation_file || null,
      training_file: body.training_file,
      hyperparameters: body.hyperparameters || {
        batch_size: 1,
        learning_rate_multiplier: 1,
        n_epochs: 1,
      },
      trained_tokens: null,
      error: null,
      user_provided_suffix: body.suffix || null,
      estimated_finish: now + 3600, // 1 hour estimate
    };

    // Store the job
    fineTuningJobs.set(jobId, job);

    // Simulate job processing (in production, this would be a background job)
    setTimeout(() => {
      const storedJob = fineTuningJobs.get(jobId);
      if (storedJob) {
        storedJob.status = 'running';
        storedJob.estimated_finish = Date.now() / 1000 + 1800; // 30 more minutes
      }
    }, 5000);

    setTimeout(() => {
      const storedJob = fineTuningJobs.get(jobId);
      if (storedJob) {
        storedJob.status = 'succeeded';
        storedJob.finished_at = Math.floor(Date.now() / 1000);
        storedJob.fine_tuned_model = `ft:${body.model}:${jobId.substring(6, 12)}`;
        storedJob.trained_tokens = Math.floor(Math.random() * 10000) + 1000;
        storedJob.result_files = [`file-${uuidv4()}`];
      }
    }, 30000); // 30 seconds to complete for demo

    // Record usage
    const requestTime = Date.now() - startTime;
    
    await recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: 'fine_tuning/jobs',
      model: body.model,
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
    
    const apiResponse = createApiResponse(job, 200, rateLimitHeaders);

    return apiResponse;

  } catch (error: any) {
    console.error('Fine-tuning job creation error:', error);
    
    const requestTime = Date.now() - startTime;
    
    // Try to get API key for usage tracking
    try {
      const authenticatedRequest = await authenticateApiRequest(request);
      await recordApiUsage({
        apiKeyId: authenticatedRequest.apiKey.id,
        endpoint: 'fine_tuning/jobs',
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
      error.message || 'Internal server error',
      500,
      'internal_error'
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const after = searchParams.get('after');

    // Get all jobs and filter
    const allJobs = Array.from(fineTuningJobs.values());
    
    // Apply pagination
    let filteredJobs = allJobs;
    if (after) {
      const afterIndex = allJobs.findIndex(job => job.id === after);
      if (afterIndex !== -1) {
        filteredJobs = allJobs.slice(afterIndex + 1);
      }
    }
    
    const jobs = filteredJobs.slice(0, limit);

    const response_data = {
      object: 'list',
      data: jobs,
      has_more: filteredJobs.length > limit,
      first_id: jobs[0]?.id || null,
      last_id: jobs[jobs.length - 1]?.id || null,
    };

    return createApiResponse(response_data);

  } catch (error: any) {
    console.error('Fine-tuning jobs list error:', error);

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}