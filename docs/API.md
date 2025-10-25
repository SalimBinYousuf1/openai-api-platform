# Salim API Platform Documentation

## Overview

Salim API Platform provides OpenAI-compatible endpoints that proxy to Z.ai's powerful AI models. Our API allows developers to integrate AI capabilities into their applications with minimal changes to existing OpenAI SDK code.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

Include your API key in the Authorization header:

```http
Authorization: Bearer sk-your-api-key
```

## Supported Models

### Text Models
- `gpt-3.5-turbo` - Fast and efficient for most tasks
- `gpt-3.5-turbo-16k` - Extended context window
- `gpt-4` - Most capable model
- `gpt-4-32k` - Extended context for GPT-4
- `gpt-4-turbo` - Faster version of GPT-4
- `gpt-4o` - Optimized GPT-4 model
- `gpt-4o-mini` - Cost-effective GPT-4 variant

### Image Models
- `dall-e-3` - High-quality image generation
- `dall-e-2` - Standard image generation

## Endpoints

### Chat Completions

Create chat completions with our language models.

**Endpoint:** `POST /v1/chat/completions`

#### Request Body

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150,
  "top_p": 1,
  "frequency_penalty": 0,
  "presence_penalty": 0,
  "stop": null,
  "stream": false
}
```

#### Response

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

#### Example Usage

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'https://your-domain.com/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Write a poem about AI' }
  ],
});

console.log(response.choices[0].message.content);
```

### Image Generation

Generate images using our DALL-E models.

**Endpoint:** `POST /v1/images/generations`

#### Request Body

```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "dall-e-3",
  "n": 1,
  "size": "1024x1024",
  "quality": "standard",
  "response_format": "url",
  "style": "vivid"
}
```

#### Response

```json
{
  "created": 1677652288,
  "data": [
    {
      "url": "https://example.com/image.png",
      "revised_prompt": "A beautiful sunset over mountain peaks"
    }
  ]
}
```

#### Supported Sizes

**DALL-E 3:**
- `1024x1024`
- `1024x1792`
- `1792x1024`

**DALL-E 2:**
- `256x256`
- `512x512`
- `1024x1024`

#### Example Usage

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'https://your-domain.com/api/v1',
});

const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: 'A cute cat wearing a wizard hat',
  size: '1024x1024',
  n: 1,
});

console.log(response.data[0].url);
```

### Models

List all available models.

**Endpoint:** `GET /v1/models`

#### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    },
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1687882410,
      "owned_by": "openai"
    }
  ]
}
```

## Rate Limiting

API requests are rate-limited based on your API key configuration. Rate limit information is included in response headers:

```http
x-ratelimit-limit-requests: 1000
x-ratelimit-remaining-requests: 999
x-ratelimit-reset-requests: 1640995200
```

## Error Handling

Errors follow OpenAI's error format:

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

### Common Error Codes

- `invalid_api_key` - The provided API key is invalid
- `insufficient_quota` - API key has exceeded its quota
- `rate_limit_exceeded` - Too many requests in a short time
- `invalid_request` - Request parameters are invalid
- `model_not_found` - The specified model doesn't exist

## SDK Integration

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key",
    base_url="https://your-domain.com/api/v1"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'https://your-domain.com/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### cURL

```bash
curl https://your-domain.com/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Pricing

Pricing is calculated based on token usage for text models and per-image generation for image models. View your usage analytics in the developer dashboard.

### Text Model Pricing (per 1K tokens)
- `gpt-3.5-turbo`: $0.002
- `gpt-4`: $0.03
- `gpt-4-turbo`: $0.01
- `gpt-4o`: $0.005
- `gpt-4o-mini`: $0.00015

### Image Model Pricing (per image)
- `dall-e-3` (1024x1024): $0.04
- `dall-e-3` (1024x1792, 1792x1024): $0.08
- `dall-e-2` (1024x1024): $0.02

## Best Practices

1. **Use appropriate models** - Choose the right model for your use case to optimize costs
2. **Implement retry logic** - Handle temporary failures with exponential backoff
3. **Monitor usage** - Keep track of your API usage through the dashboard
4. **Cache responses** - Cache frequently requested responses to reduce costs
5. **Use streaming** - For long responses, consider using streaming to improve user experience

## Support

For support and questions:
- Check the developer dashboard for usage analytics
- Review error messages for debugging
- Contact support through the dashboard

## Changelog

### v1.0.0
- Initial release with OpenAI-compatible endpoints
- Chat completions support
- Image generation support
- Models listing
- Rate limiting and usage tracking