import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Use localhost for development, deployed URL for production
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      this.baseUrl = 'http://localhost:3000';
    } else {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add CSRF token for server-side requests
    if (typeof window === 'undefined') {
      defaultHeaders['x-forwarded-for'] = '127.0.0.1';
    }
    
    const response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      ...options,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response format: ${contentType}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Dashboard API methods
  async getOverview() {
    return this.request('/api/dashboard/overview');
  }

  async getApiKeys() {
    return this.request('/api/dashboard/keys');
  }

  async createApiKey(data: { name: string; rateLimit: number }) {
    return this.request('/api/dashboard/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApiKey(id: string, data: Partial<{ name: string; isActive: boolean; rateLimit: number }>) {
    return this.request(`/api/dashboard/keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(id: string) {
    return this.request(`/api/dashboard/keys/${id}`, {
      method: 'DELETE',
    });
  }

  async getUsageAnalytics(params?: { period?: string; limit?: number; offset?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return this.request(`/api/dashboard/usage${query ? `?${query}` : ''}`);
  }

  // Public API methods
  async getModels() {
    return this.request('/api/v1/models');
  }

  async createChatCompletion(data: any) {
    return this.request('/api/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateImage(data: any) {
    return this.request('/api/v1/images/generations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();