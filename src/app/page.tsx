'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Key, BarChart3, Code, Plus, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  rateLimit: number;
  createdAt: string;
  lastUsedAt?: string;
}

interface UsageStats {
  period: string;
  totalRequests: number;
  totalCost: number;
  breakdown: Array<{
    endpoint: string;
    model?: string;
    requests: number;
    tokensUsed: number;
    cost: number;
    avgResponseTime: number;
  }>;
}

export default function Home() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('1000');

  useEffect(() => {
    loadApiKeys();
    loadUsageStats();
  }, []);

  const loadApiKeys = async () => {
    try {
      // Mock data for now - in real app, this would be from an API
      const mockKeys: ApiKey[] = [
        {
          id: '1',
          key: 'sk-abc123def456...',
          name: 'Production Key',
          isActive: true,
          rateLimit: 1000,
          createdAt: '2024-01-15T10:30:00Z',
          lastUsedAt: '2024-01-20T14:22:00Z',
        },
        {
          id: '2',
          key: 'sk-xyz789uvw012...',
          name: 'Development Key',
          isActive: true,
          rateLimit: 500,
          createdAt: '2024-01-10T08:15:00Z',
          lastUsedAt: '2024-01-19T16:45:00Z',
        },
      ];
      setApiKeys(mockKeys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      // Mock data for now
      const mockStats: UsageStats = {
        period: 'month',
        totalRequests: 1247,
        totalCost: 23.45,
        breakdown: [
          {
            endpoint: 'chat/completions',
            model: 'gpt-3.5-turbo',
            requests: 890,
            tokensUsed: 234500,
            cost: 12.34,
            avgResponseTime: 450,
          },
          {
            endpoint: 'chat/completions',
            model: 'gpt-4',
            requests: 234,
            tokensUsed: 89200,
            cost: 8.92,
            avgResponseTime: 1200,
          },
          {
            endpoint: 'images/generations',
            model: 'dall-e-3',
            requests: 123,
            tokensUsed: 0,
            cost: 2.19,
            avgResponseTime: 3400,
          },
        ],
      };
      setUsageStats(mockStats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      // Mock API call
      const newKey: ApiKey = {
        id: Date.now().toString(),
        key: `sk-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        name: newKeyName,
        isActive: true,
        rateLimit: parseInt(newKeyRateLimit),
        createdAt: new Date().toISOString(),
      };
      
      setApiKeys([newKey, ...apiKeys]);
      setNewKeyName('');
      setNewKeyRateLimit('1000');
      setShowCreateKey(false);
      toast.success('API key created successfully!');
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Salim API Platform</h1>
          <p className="text-muted-foreground text-lg">
            Professional AI API platform with OpenAI-compatible endpoints
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageStats?.totalRequests || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${usageStats?.totalCost.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
                  <Key className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{apiKeys.filter(k => k.isActive).length}</div>
                  <p className="text-xs text-muted-foreground">Total: {apiKeys.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">680ms</div>
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
  baseURL: 'https://your-domain.com/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});`}
                  </pre>
                </div>
              </CardContent>
            </Card>
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
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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

            {usageStats && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Breakdown</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {usageStats.breakdown.map((item, index) => (
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
                    https://your-domain.com/api/v1
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
                    <p className="text-sm text-muted-foreground">Create chat completions</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">POST /v1/images/generations</h4>
                    <p className="text-sm text-muted-foreground">Generate images</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">GET /v1/models</h4>
                    <p className="text-sm text-muted-foreground">List available models</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Supported Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold">Text Models</h4>
                      <ul className="text-sm text-muted-foreground">
                        <li>• gpt-3.5-turbo</li>
                        <li>• gpt-4</li>
                        <li>• gpt-4-turbo</li>
                        <li>• gpt-4o</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Image Models</h4>
                      <ul className="text-sm text-muted-foreground">
                        <li>• dall-e-3</li>
                        <li>• dall-e-2</li>
                      </ul>
                    </div>
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