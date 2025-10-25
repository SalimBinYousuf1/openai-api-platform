// Z.ai API Configuration
export const ZAI_CONFIG = {
  apiKey: '9796dd02e01a4d2ea224aafc59ae0922.oF50LFShuXR8VmZ7',
  baseURL: 'https://api.z.ai/v1',
  defaultModel: 'glm4.5-flash',
  timeout: 60000, // 60 seconds
};

// Model configurations
export const MODEL_CONFIGS = {
  'glm4.5-flash': {
    name: 'glm4.5-flash',
    displayName: 'GLM-4.5 Flash',
    type: 'chat',
    maxTokens: 8192,
    costPer1KTokens: 0.001,
  },
  'gpt-3.5-turbo': {
    name: 'glm4.5-flash',
    displayName: 'GPT-3.5 Turbo (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 4096,
    costPer1KTokens: 0.002,
  },
  'gpt-4': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 8192,
    costPer1KTokens: 0.03,
  },
  'gpt-4-turbo': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4 Turbo (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 128000,
    costPer1KTokens: 0.01,
  },
  'gpt-4o': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4o (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 128000,
    costPer1KTokens: 0.005,
  },
  'gpt-4o-mini': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4o Mini (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 128000,
    costPer1KTokens: 0.00015,
  },
  'dall-e-3': {
    name: 'glm4.5-flash',
    displayName: 'DALL-E 3 (GLM-4.5 Flash)',
    type: 'image',
    costPerImage: {
      '1024x1024': 0.04,
      '1024x1792': 0.08,
      '1792x1024': 0.08,
    },
  },
  'dall-e-2': {
    name: 'glm4.5-flash',
    displayName: 'DALL-E 2 (GLM-4.5 Flash)',
    type: 'image',
    costPerImage: {
      '256x256': 0.016,
      '512x512': 0.018,
      '1024x1024': 0.02,
    },
  },
};

// Map OpenAI models to Z.ai models
export function mapToZaiModel(openaiModel: string): string {
  const config = MODEL_CONFIGS[openaiModel as keyof typeof MODEL_CONFIGS];
  return config?.name || ZAI_CONFIG.defaultModel;
}

// Get model configuration
export function getModelConfig(model: string) {
  return MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS] || MODEL_CONFIGS['glm4.5-flash'];
}