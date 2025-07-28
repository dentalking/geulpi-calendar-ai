# 🗓️ Geulpi Calendar Service

AI-powered calendar management system with advanced E2E test-driven development workflow.

## 🚀 Quick Start

```bash
# Setup the project
npm run setup

# Start all services
npm run dev

# Run smart E2E tests with AI-powered feedback
npm run test:e2e:smart
```

## 🎯 Project Overview

Geulpi Calendar Service is a modern, microservices-based calendar application featuring:

- **Frontend**: Next.js with TypeScript and GraphQL
- **Backend**: Spring Boot with GraphQL and OAuth2 authentication  
- **ML Server**: FastAPI with voice processing and Kafka integration
- **Smart E2E Testing**: AI-enhanced test-driven development with MCP integration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │    │   ML Server     │
│   (Next.js)     │◄──►│  (Spring Boot)  │◄──►│   (FastAPI)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │      Infrastructure     │
                    │ PostgreSQL │ Redis │ Kafka │
                    └─────────────────────────┘
```

## 🧪 Smart E2E Test-Driven Development

### Overview

Our revolutionary E2E testing system combines traditional TDD with AI-powered analysis:

1. **🧪 Intelligent Test Execution** - Tests run with smart failure analysis
2. **🔍 MCP-Enhanced Documentation** - Real-time library documentation fetching
3. **📝 AI-Generated Prompts** - Service-specific fix suggestions
4. **🤖 Multi-Claude Coordination** - Automated prompt distribution to service teams
5. **🔄 Continuous Feedback Loop** - Automated re-testing and iteration

### Smart Testing Commands

```bash
# Smart E2E cycle with AI-powered fixes
npm run test:e2e:smart

# Traditional E2E feedback loop
npm run test:e2e:feedback

# Standard E2E tests
npm run test:e2e

# Local development testing
npm run test:e2e:local

# Debug mode with browser visible
npm run test:e2e:headed
```

### Setting Up Smart TDD

1. **Start Claude Code in each service:**
   ```bash
   # Terminal 1 - Frontend
   cd frontend && claude-code
   
   # Terminal 2 - Backend  
   cd backend && claude-code
   
   # Terminal 3 - ML Server
   cd ml-server && claude-code
   ```

2. **Run the smart cycle:**
   ```bash
   npm run test:e2e:smart
   ```

3. **Watch the magic happen:**
   - Tests run and analyze failures intelligently
   - AI generates specific prompts for each service
   - Claude instances receive prompts and implement fixes
   - Tests re-run automatically until all pass

## 🛠️ Development Workflow

### Traditional TDD
```bash
# Create test for new feature
npm run tdd -- --feature user-authentication

# Run in watch mode
npm run tdd -- --feature user-authentication --watch
```

### Smart AI-Enhanced TDD
```bash
# Let AI analyze and fix test failures
npm run test:e2e:smart

# Manual feedback loop
npm run test:e2e:feedback --watch
```

## 📊 Test Coverage

Our E2E test suite covers:

- **Authentication Flow**: OAuth2 login, JWT tokens, session management
- **Calendar Operations**: Event CRUD, voice input, calendar navigation  
- **Notification System**: Real-time notifications, settings management
- **Integration Testing**: Service communication, data consistency

## 🧠 AI-Enhanced Features

### MCP Integration

The system leverages Context7 MCP (Model Context Protocol) to:

- **📚 Fetch Latest Documentation** - Real-time library docs from official sources
- **💻 Generate Code Examples** - Context-aware code snippets for fixes
- **✅ Suggest Best Practices** - Framework-specific recommendations
- **⚠️ Identify Common Mistakes** - Proactive issue prevention

### Smart Analysis

Each test failure triggers:

1. **Error Pattern Recognition** - Categorizes failures by service and type
2. **Documentation Lookup** - Fetches relevant docs via MCP
3. **Context-Aware Prompts** - Generates specific fix instructions
4. **Code Example Generation** - Provides working code samples
5. **Best Practice Integration** - Includes framework recommendations

## 🔧 Technical Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **GraphQL**: Apollo Client with Code Generation
- **Testing**: Jest, React Testing Library, Playwright

### Backend  
- **Framework**: Spring Boot 3.x
- **Language**: Java 21
- **Build**: Gradle with Kotlin DSL
- **GraphQL**: Spring GraphQL
- **Auth**: Spring Security OAuth2 + JWT
- **Database**: PostgreSQL with Liquibase
- **Cache**: Redis

### ML Server
- **Framework**: FastAPI
- **Language**: Python 3.11
- **ML**: Custom voice processing models
- **Messaging**: Kafka integration
- **Testing**: pytest with async support

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx with SSL
- **Databases**: PostgreSQL, Redis
- **Message Queue**: Apache Kafka
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
geulpi-project-1/
├── 📄 schema.graphql          # Single Source of Truth
├── 🐳 docker-compose.yml      # Production services
├── 🧪 docker-compose.test.yml # Test environment
├── 
├── 🎨 frontend/               # Next.js application
├── ⚙️ backend/                # Spring Boot service  
├── 🤖 ml-server/              # FastAPI ML service
├── 🧪 e2e/                    # E2E tests & AI analysis
│   ├── tests/                 # Test specifications
│   ├── reporters/             # Custom test reporters
│   └── analyzers/             # AI-powered analysis
├── 
├── 📜 scripts/                # Automation scripts
│   ├── smart-e2e-cycle.sh     # AI-enhanced TDD cycle
│   ├── e2e-feedback-loop.sh   # Traditional feedback loop
│   └── tdd-workflow.sh        # Feature-based TDD
├── 
├── 🌐 nginx/                  # Reverse proxy config
└── 📚 docs/                   # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Java 21 (for backend development)
- Python 3.11+ (for ML server development)

### Installation

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd geulpi-project-1
   npm run setup
   ```

2. **Start services:**
   ```bash
   npm run dev
   ```

3. **Run smart tests:**
   ```bash
   npm run test:e2e:smart
   ```

### Environment URLs
- **Frontend**: http://localhost:3000
- **Backend GraphQL**: http://localhost:8080/graphql
- **ML Server**: http://localhost:8000
- **GraphiQL**: http://localhost:8080/graphiql

## 🔍 Monitoring & Debugging

### Logs
```bash
# All services
npm run logs

# Specific service
docker-compose logs -f frontend
```

### Health Checks
- Frontend: http://localhost:3000/api/health
- Backend: http://localhost:8080/actuator/health  
- ML Server: http://localhost:8000/health

### Test Reports
- **HTML Report**: `e2e/playwright-report/index.html`
- **JSON Results**: `e2e/test-results/results.json`
- **AI Analysis**: Generated `PROMPT.md` files in each service

## 🤝 Contributing

1. **Traditional Development:**
   ```bash
   npm run tdd -- --feature new-feature
   ```

2. **AI-Enhanced Development:**
   ```bash
   npm run test:e2e:smart
   ```

3. **Follow the feedback prompts generated by AI**

4. **Ensure all tests pass before committing**

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- **Documentation**: `/docs/e2e-testing-guide.md`
- **Architecture**: `/architecture.md`
- **Issues**: Create a GitHub issue
- **AI Prompts**: Check generated `PROMPT.md` files for guidance

---

**🌟 Features powered by AI-enhanced test-driven development with Context7 MCP integration**