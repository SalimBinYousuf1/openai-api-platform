'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Key, BarChart3, Code, Plus, Trash2, Settings, LogOut, TrendingUp, TrendingDown, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  rateLimit: number;
  createdAt: string;
  lastUsedAt?: string;
  usageCount?: number;
}

interface OverviewStats {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  activeKeys: number;
  totalKeys: number;
}

interface UsageData {
  period: string;
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  breakdown: Array<{
    endpoint: string;
    model?: string;
    requests: number;
    tokensUsed: number;
    cost: number;
    avgResponseTime: number;
  }>;
  recentUsage: Array<{
    id: string;
    endpoint: string;
    model?: string;
    cost: number;
    statusCode: number;
    requestTime: number;
    apiKeyName: string;
    createdAt: string;
  }>;
  summary: {
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('1000');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    loadDashboardData();
  }, [session, status, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, keysRes] = await Promise.all([
        apiClient.getOverview(),
        apiClient.getApiKeys(),
      ]);

      if (overviewRes.success) {
        setOverviewStats(overviewRes.data.stats);
      }
      
      if (keysRes.success) {
        setApiKeys(keysRes.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageData = async (period = 'month') => {
    try {
      const response = await apiClient.getUsageAnalytics({ period });
      if (response.success) {
        setUsageData(response.data);
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
      toast.error('Failed to load usage data');
    }
  };

  useEffect(() => {
    if (session && activeTab === 'usage') {
      loadUsageData();
    }
  }, [session, activeTab]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.createApiKey({
        name: newKeyName.trim(),
        rateLimit: parseInt(newKeyRateLimit),
      });

      if (response.success) {
        setApiKeys([response.data, ...apiKeys]);
        setNewKeyName('');
        setNewKeyRateLimit('1000');
        setShowCreateKey(false);
        toast.success('API key created successfully!');
        
        // Show the full key in a toast for the user to copy
        toast.success(`Your new API key: ${response.data.key}`, {
          duration: 10000,
          action: {
            label: 'Copy',
            onClick: () => copyToClipboard(response.data.key),
          },
        });
        
        // Refresh the overview data
        loadDashboardData();
      } else {
        toast.error(response.error || 'Failed to create API key');
      }
    } catch (error: any) {
      console.error('Create API key error:', error);
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.deleteApiKey(id);
      if (response.success) {
        setApiKeys(apiKeys.filter(key => key.id !== id));
        toast.success('API key deleted successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const toggleApiKeyStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await apiClient.updateApiKey(id, { isActive: !isActive });
      if (response.success) {
        setApiKeys(apiKeys.map(key => 
          key.id === id ? { ...key, isActive: !isActive } : key
        ));
        toast.success(`API key ${!isActive ? 'activated' : 'deactivated'} successfully`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update API key');
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">API Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Welcome back, {session.user?.name}!
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {overviewStats && (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewStats.totalRequests.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${overviewStats.totalCost.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewStats.activeKeys}</div>
                      <p className="text-xs text-muted-foreground">Total: {overviewStats.totalKeys}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{overviewStats.avgResponseTime}ms</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Start</CardTitle>
                    <CardDescription>
                      Get started with our OpenAI-compatible API in minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Code className="h-4 w-4" />
                      <AlertDescription>
                        Our API is fully compatible with OpenAI SDK. Just change the base URL and use your API key.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm">
{`import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="keys" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">API Keys</h2>
                <p className="text-muted-foreground">Manage your API keys and permissions</p>
              </div>
              <Button onClick={() => setShowCreateKey(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>

            {showCreateKey && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New API Key</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production Key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(e.target.value)}
                      placeholder="1000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createApiKey}>Create Key</Button>
                    <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{apiKey.name}</h3>
                          <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                            {apiKey.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {apiKey.usageCount && (
                            <Badge variant="outline">
                              {apiKey.usageCount} uses
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{apiKey.key}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.key)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rate Limit: {apiKey.rateLimit} requests/hour
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                          {apiKey.lastUsedAt && (
                            <> • Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleApiKeyStatus(apiKey.id, apiKey.isActive)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteApiKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Usage Analytics</h2>
              <p className="text-muted-foreground">Monitor your API usage and costs</p>
            </div>

            {usageData && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{usageData.totalRequests.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Last {usageData.period}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${usageData.totalCost.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">Last {usageData.period}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      {usageData.summary.successRate >= 95 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{usageData.summary.successRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">
                        {usageData.summary.successfulRequests} / {usageData.totalRequests} successful
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{usageData.avgResponseTime}ms</div>
                      <p className="text-xs text-muted-foreground">Last {usageData.period}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage Breakdown</CardTitle>
                    <CardDescription>Last {usageData.period}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {usageData.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <div className="font-semibold">{item.endpoint}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.model} • {item.requests} requests • {item.tokensUsed.toLocaleString()} tokens
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${item.cost.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.avgResponseTime}ms avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest API calls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {usageData.recentUsage.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <div className="font-semibold">{item.endpoint}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.apiKeyName} • {item.model} • {new Date(item.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${item.cost.toFixed(4)}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.requestTime}ms • Status: {item.statusCode}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">API Documentation</h2>
              <p className="text-muted-foreground">Complete documentation for our OpenAI-compatible API</p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Base URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="bg-muted px-2 py-1 rounded">
                    {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1
                  </code>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>Include your API key in the Authorization header:</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm">
{`Authorization: Bearer sk-your-api-key`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold">POST /v1/chat/completions</h4>
                    <p className="text-sm text-muted-foreground">Create chat completions with GLM-4.5-Flash</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">POST /v1/images/generations</h4>
                    <p className="text-sm text-muted-foreground">Generate images with DALL-E compatible API</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">POST /v1/embeddings</h4>
                    <p className="text-sm text-muted-foreground">Create text embeddings</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">POST /v1/moderations</h4>
                    <p className="text-sm text-muted-foreground">Check content for policy violations</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">POST /v1/fine-tuning/jobs</h4>
                    <p className="text-sm text-muted-foreground">Create fine-tuning jobs</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">GET /v1/fine-tuning/jobs</h4>
                    <p className="text-sm text-muted-foreground">List fine-tuning jobs</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">GET /v1/models</h4>
                    <p className="text-sm text-muted-foreground">List available models</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}