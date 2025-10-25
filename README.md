# 🚀 Salim API Platform

A professional OpenAI-compatible API platform that proxies to Z.ai's powerful AI models. Built with Next.js 15, TypeScript, and modern web technologies.

## ✨ Features

### 🎯 Core Functionality
- **🔄 OpenAI-Compatible API** - Drop-in replacement for OpenAI SDK
- **🤖 Z.ai Integration** - Leverages Z.ai's powerful AI models behind the scenes
- **🔐 API Key Management** - Secure authentication and rate limiting
- **📊 Usage Analytics** - Real-time monitoring and cost tracking
- **🎨 Developer Dashboard** - Professional UI for API management

### 🛠️ Technical Stack
- **⚡ Next.js 15** - Modern React framework with App Router
- **📘 TypeScript 5** - Type-safe development
- **🎨 Tailwind CSS 4** - Utility-first styling
- **🧩 shadcn/ui** - Professional UI components
- **🗄️ Prisma** - Type-safe database ORM
- **🔐 NextAuth.js** - Authentication solution

### 🌐 API Endpoints
- **POST /v1/chat/completions** - Chat completions with GPT models
- **POST /v1/images/generations** - Image generation with DALL-E models
- **GET /v1/models** - List available models
- **🔒 Rate Limiting** - Configurable per-key rate limits
- **📈 Usage Tracking** - Detailed analytics and cost monitoring

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the developer dashboard.

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# API Configuration
API_BASE_URL="http://localhost:3000/api/v1"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 📖 API Usage

### Basic Example

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'http://localhost:3000/api/v1',
});

// Chat completion
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Image generation
const image = await openai.images.generate({
  model: 'dall-e-3',
  prompt: 'A beautiful sunset',
  size: '1024x1024',
});
```

### cURL Example

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🎯 Supported Models

### Text Models
- `gpt-3.5-turbo` - Fast and efficient
- `gpt-4` - Most capable
- `gpt-4-turbo` - Optimized performance
- `gpt-4o` - Latest GPT-4 variant
- `gpt-4o-mini` - Cost-effective

### Image Models
- `dall-e-3` - High-quality generation
- `dall-e-2` - Standard generation

## 📊 Developer Dashboard

The platform includes a comprehensive dashboard for:

- **🔑 API Key Management** - Create, manage, and revoke API keys
- **📈 Usage Analytics** - Monitor requests, costs, and performance
- **📋 Model Information** - View available models and pricing
- **📖 Documentation** - Integrated API documentation

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/v1/              # API endpoints
│   │   ├── chat/
│   │   ├── images/
│   │   └── models/
│   └── page.tsx             # Developer dashboard
├── lib/
│   ├── api-auth.ts          # Authentication middleware
│   ├── api-usage.ts         # Usage tracking
│   ├── api-keys.ts          # API key management
│   └── db.ts                # Database client
├── types/
│   └── openai.ts            # OpenAI-compatible types
└── components/
    └── ui/                  # shadcn/ui components
```

## 🔐 Security Features

- **🔑 API Key Authentication** - Secure Bearer token authentication
- **🚦 Rate Limiting** - Configurable per-key rate limits
- **📊 Usage Monitoring** - Real-time usage tracking
- **🔒 CORS Protection** - Proper cross-origin resource sharing
- **🛡️ Input Validation** - Comprehensive request validation

## 📈 Pricing

Pricing is calculated based on actual usage:

### Text Models (per 1K tokens)
- `gpt-3.5-turbo`: $0.002
- `gpt-4`: $0.03
- `gpt-4o`: $0.005
- `gpt-4o-mini`: $0.00015

### Image Models (per image)
- `dall-e-3` (1024x1024): $0.04
- `dall-e-2` (1024x1024): $0.02

## 🧪 Testing

Run the test script to verify API functionality:

```bash
node examples/test-api.js
```

## 📚 Documentation

- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Examples](./examples/)** - Code examples and integrations
- **[Developer Guide](./docs/DEVELOPER.md)** - Development setup

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build image
docker build -t salim-api-platform .

# Run container
docker run -p 3000:3000 salim-api-platform
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 Check the [documentation](./docs/API.md)
- 🐛 Report issues on GitHub
- 💬 Join our community discussions

---

Built with ❤️ for developers. Powered by [Z.ai](https://z.ai) 🚀
