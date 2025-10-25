import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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