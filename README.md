# 🚀 OpenAI Compatible API Platform

A high-performance, production-ready OpenAI-compatible API platform built with Next.js 15, TypeScript, and Prisma. Features GLM-4.5-Flash integration, real-time analytics, and a professional dashboard.

## ✨ Features

### 🎯 Core Functionality
- **OpenAI-Compatible API**: Full compatibility with OpenAI SDK and existing integrations
- **GLM-4.5-Flash Integration**: Default model with advanced AI capabilities
- **Real-time Analytics**: Live usage statistics, cost tracking, and performance metrics
- **API Key Management**: Secure key generation, rate limiting, and usage monitoring
- **Authentication**: Secure user authentication with NextAuth.js
- **Responsive Dashboard**: Modern UI built with shadcn/ui components

### 🛠️ API Endpoints
- `POST /v1/chat/completions` - Chat completions with GLM-4.5-Flash
- `POST /v1/images/generations` - DALL-E compatible image generation
- `POST /v1/embeddings` - Text embeddings
- `POST /v1/moderations` - Content moderation
- `POST /v1/fine-tuning/jobs` - Fine-tuning job management
- `GET /v1/models` - List available models (18+ models)

### 📊 Dashboard Features
- Overview statistics with real-time updates
- API key creation and management
- Usage analytics with breakdown by endpoint
- Cost tracking and budget monitoring
- Performance metrics and response times
- Recent activity logs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd openai-api-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=file:./db/custom.db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. **Initialize the database**
```bash
npm run db:push
```

5. **Create default user (optional)**
```bash
npx tsx src/scripts/create-default-user.ts
```

6. **Start the development server**
```bash
npm run dev
```

7. **Access the application**
- Dashboard: http://localhost:3000
- API Documentation: Available in the dashboard
- Default login: `admin@example.com` / `admin123`

## 📖 API Usage

### Authentication
Include your API key in the Authorization header:
```bash
Authorization: Bearer sk-your-api-key
```

### Example: Chat Completions
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-your-api-key',
  baseURL: 'http://localhost:3000/api/v1',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Example: Image Generation
```javascript
const response = await openai.images.generate({
  prompt: 'A beautiful sunset over mountains',
  n: 1,
  size: '1024x1024',
});
```

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Database**: Prisma ORM with SQLite
- **Authentication**: NextAuth.js v4
- **UI Components**: shadcn/ui with Tailwind CSS 4
- **State Management**: Zustand + TanStack Query
- **API Integration**: Z.ai Web Dev SDK

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── v1/           # OpenAI-compatible endpoints
│   │   └── dashboard/    # Dashboard API endpoints
│   ├── auth/             # Authentication pages
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── ui/              # shadcn/ui components
│   └── providers/       # Context providers
├── lib/                  # Utility libraries
│   ├── auth.ts          # NextAuth configuration
│   ├── db.ts            # Prisma client
│   ├── cache.ts         # Memory cache
│   └── api-client.ts    # API client
└── types/               # TypeScript definitions
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL`: Database connection string
- `NEXTAUTH_URL`: NextAuth.js URL
- `NEXTAUTH_SECRET`: NextAuth.js secret
- `NEXT_PUBLIC_API_URL`: Public API URL

### Database Configuration
The application uses SQLite by default for simplicity. To use PostgreSQL or MySQL:

1. Update `DATABASE_URL` in `.env`
2. Update `provider` in `prisma/schema.prisma`
3. Run `npm run db:push`

## 📊 Performance Features

### Caching
- 30-second TTL memory cache for dashboard data
- Intelligent cache invalidation
- Parallel database queries

### Rate Limiting
- Per-API-key rate limiting
- Configurable limits (requests/hour)
- Automatic throttling

### Monitoring
- Real-time usage statistics
- Performance metrics
- Error tracking
- Cost analysis

## 🔒 Security

- bcryptjs password hashing
- API key authentication
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set production environment variables
2. Configure database
3. Set up SSL certificates
4. Configure reverse proxy (nginx)

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Monitoring & Analytics

### Dashboard Metrics
- Total requests and costs
- Success rates and error tracking
- Response time analytics
- API key usage statistics
- Model performance breakdown

### API Usage Tracking
- Request logging
- Cost calculation
- Token usage tracking
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation in the dashboard
- Review the troubleshooting guide

## 🎯 Roadmap

- [ ] Multi-model support
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Custom model fine-tuning
- [ ] WebSocket real-time updates
- [ ] Advanced security features
- [ ] Multi-tenant support

---

Built with ❤️ using Next.js, TypeScript, and shadcn/ui