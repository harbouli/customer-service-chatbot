# Customer Support Chatbot 🤖

An AI-powered customer support chatbot built with Clean Architecture, TypeScript, and modern best practices.

## ✨ Features

- 🤖 **AI-Powered Conversations** - Google Gemini integration
- 🔍 **Semantic Search** - Weaviate vector database for product discovery
- 🏗️ **Clean Architecture** - Domain-driven design with clear separation of concerns
- 🔒 **Security First** - Rate limiting, validation, and security headers
- 📊 **Monitoring** - Comprehensive logging and metrics
- 🧪 **Testing** - Unit, integration, and E2E tests
- 🐳 **Docker Ready** - Containerized deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd customer-support-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Weaviate (optional)**
   ```bash
   npm run docker:up
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── domain/           # Business logic and entities
├── application/      # Use cases and DTOs
├── infrastructure/   # External services and data access
├── presentation/     # Controllers, routes, and middleware
└── shared/          # Common utilities and errors
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## 🔧 VSCode Setup

This project includes VSCode configuration for optimal development experience:

- **Extensions** - Auto-suggested extensions for TypeScript, ESLint, Prettier
- **Settings** - Optimized settings for formatting and linting
- **Tasks** - Pre-configured build and test tasks
- **Debugging** - Ready-to-use debug configurations

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🧪 Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## 🐳 Docker Deployment

```bash
docker-compose up -d  # Start all services
```

## 📚 API Documentation

- **Health Check**: `GET /health`
- **Chat**: `POST /api/chat/message`
- **Products**: `GET /api/products/search`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
