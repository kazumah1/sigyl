# Sigyl API

Express.js + TypeScript API server for the MCP (Model Context Protocol) package registry.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account with database set up
- Environment variables configured

### Installation

```bash
# From the monorepo root
npm install

# Or from this package directory
cd packages/registry-api
npm install
``` 

### Environment Setup

Create a `.env` file (copy from `env.example`):

```bash
# Registry API Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Configuration
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
```

### Running the API

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## 📦 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

### Health Check
- **GET** `/health` - API health status

### Packages

#### Create Package
- **POST** `/packages`
- **Body**: 
```json
{
  "name": "my-mcp-package",
  "version": "1.0.0",
  "description": "My awesome MCP package",
  "author_id": "uuid-here",
  "source_api_url": "http://localhost:8080",
  "tags": ["utility", "ai"],
  "tools": [
    {
      "tool_name": "my_tool",
      "description": "Does something useful",
      "input_schema": {},
      "output_schema": {}
    }
  ]
}
```

#### Search Packages
- **GET** `/packages/search?q=search-term&tags=tag1,tag2&limit=20&offset=0`
- **Query Parameters**:
  - `q` (optional): Search term
  - `tags` (optional): Comma-separated tags
  - `limit` (optional): Results limit (default: 20)
  - `offset` (optional): Results offset (default: 0)

#### Get Package by Name
- **GET** `/packages/:name`
- Returns package details with deployments and tools

#### List All Packages
- **GET** `/packages`
- Returns all packages (for admin/debugging)

## 🗄️ Database Schema

The API connects to these Supabase tables:

- `mcp_packages` - Package metadata
- `mcp_deployments` - Deployment information
- `mcp_tools` - Tool definitions per package

## 🔧 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code

### Project Structure
```
src/
├── config/          # Database and app configuration
├── routes/          # Express route handlers
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test package creation
curl -X POST http://localhost:3000/api/v1/packages \
  -H "Content-Type: application/json" \
  -d '{"name":"test-package","description":"Test package"}'

# Test search
curl "http://localhost:3000/api/v1/packages/search?q=test"
```

## 🐳 Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## 🚀 Deployment

### Google Cloud Run
```bash
# Set up Google Cloud authentication
gcloud auth login
gcloud config set project your-project-id

# Deploy the container
gcloud run deploy mcp-registry-api --source . --region us-central1
```

### Environment Variables for Deployment
Ensure these are set in your deployment environment:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (usually set by platform)
- `NODE_ENV=production`

## 🤝 Integration

This API is designed to work with:
- **CLI Tool** (`packages/cli`) - Uses API for package registration
- **Container Builder** (`packages/container-builder`) - Deploys packages via API
- **Web Frontend** (`packages/web-frontend`) - Displays packages from API 