import { NextRequest } from 'next/server';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage } from '@/lib/api-usage';

// Mock storage for fine-tuning jobs (shared with the main jobs endpoint)
const fineTuningJobs = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    const jobId = params.id;
    const job = fineTuningJobs.get(jobId);

    if (!job) {
      return createApiError(
        'Fine-tuning job not found',
        404,
        'not_found'
      );
    }

    return createApiResponse(job);

  } catch (error: any) {
    console.error('Fine-tuning job get error:', error);

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    const jobId = params.id;
    const job = fineTuningJobs.get(jobId);

    if (!job) {
      return createApiError(
        'Fine-tuning job not found',
        404,
        'not_found'
      );
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'cancel') {
      if (job.status === 'queued' || job.status === 'running') {
        job.status = 'cancelled';
        job.finished_at = Math.floor(Date.now() / 1000);
      }
    }

    return createApiResponse(job);

  } catch (error: any) {
    console.error('Fine-tuning job action error:', error);

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