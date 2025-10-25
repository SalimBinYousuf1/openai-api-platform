// Z.ai API Configuration
export const ZAI_CONFIG = {
  apiKey: '9796dd02e01a4d2ea224aafc59ae0922.oF50LFShuXR8VmZ7',
  baseURL: 'https://api.z.ai/v1',
  defaultModel: 'glm4.5-flash',
  timeout: 60000, // 60 seconds
};

// Model configurations
export const MODEL_CONFIGS = {
  // Text generation models
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
  'gpt-4-turbo': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4 Turbo (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 128000,
    costPer1KTokens: 0.01,
  },
  'gpt-4': {
    name: 'glm4.5-flash',
    displayName: 'GPT-4 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 8192,
    costPer1KTokens: 0.03,
  },
  'gpt-3.5-turbo': {
    name: 'glm4.5-flash',
    displayName: 'GPT-3.5 Turbo (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 4096,
    costPer1KTokens: 0.002,
  },
  'gpt-3.5-turbo-16k': {
    name: 'glm4.5-flash',
    displayName: 'GPT-3.5 Turbo 16K (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 16384,
    costPer1KTokens: 0.004,
  },
  
  // Fine-tuning base models
  'babbage-002': {
    name: 'glm4.5-flash',
    displayName: 'Babbage-002 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 2048,
    costPer1KTokens: 0.0004,
  },
  'davinci-002': {
    name: 'glm4.5-flash',
    displayName: 'Davinci-002 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 2048,
    costPer1KTokens: 0.002,
  },
  
  // Embedding models
  'text-embedding-3-large': {
    name: 'glm4.5-flash',
    displayName: 'Text Embedding 3 Large (GLM-4.5 Flash)',
    type: 'embedding',
    maxTokens: 8191,
    costPer1KTokens: 0.00013,
  },
  'text-embedding-3-small': {
    name: 'glm4.5-flash',
    displayName: 'Text Embedding 3 Small (GLM-4.5 Flash)',
    type: 'embedding',
    maxTokens: 8191,
    costPer1KTokens: 0.00002,
  },
  'text-embedding-ada-002': {
    name: 'glm4.5-flash',
    displayName: 'Text Embedding Ada 002 (GLM-4.5 Flash)',
    type: 'embedding',
    maxTokens: 8191,
    costPer1KTokens: 0.0001,
  },
  
  // Image generation models
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
  
  // Moderation models
  'text-moderation-latest': {
    name: 'glm4.5-flash',
    displayName: 'Text Moderation Latest (GLM-4.5 Flash)',
    type: 'moderation',
    maxTokens: 2048,
    costPer1KTokens: 0.00001,
  },
  'text-moderation-stable': {
    name: 'glm4.5-flash',
    displayName: 'Text Moderation Stable (GLM-4.5 Flash)',
    type: 'moderation',
    maxTokens: 2048,
    costPer1KTokens: 0.00001,
  },
  
  // Legacy models (for compatibility)
  'text-davinci-003': {
    name: 'glm4.5-flash',
    displayName: 'Text Davinci 003 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 4096,
    costPer1KTokens: 0.02,
  },
  'text-curie-001': {
    name: 'glm4.5-flash',
    displayName: 'Text Curie 001 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 2048,
    costPer1KTokens: 0.002,
  },
  'text-babbage-001': {
    name: 'glm4.5-flash',
    displayName: 'Text Babbage 001 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 2048,
    costPer1KTokens: 0.0004,
  },
  'text-ada-001': {
    name: 'glm4.5-flash',
    displayName: 'Text Ada 001 (GLM-4.5 Flash)',
    type: 'chat',
    maxTokens: 2048,
    costPer1KTokens: 0.0004,
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