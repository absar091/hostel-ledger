# Design Document: Vite to Node.js Migration

## Overview

This design outlines the migration from a dual-server architecture (Vite development server + separate Node.js backend) to a unified Node.js Express server that serves both the React frontend and backend API endpoints. The migration will maintain all existing functionality while simplifying deployment and reducing infrastructure complexity.

The approach involves building the React application into static assets using Vite's build process, then serving these assets through an Express server alongside the existing API endpoints. This creates a single deployable unit that handles both frontend and backend concerns.

## Architecture

### Current Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Vite Dev      │    │   Node.js       │
│   Server        │    │   Backend       │
│   (Port 8080)   │◄──►│   (Port 3000)   │
│                 │    │                 │
│ - React App     │    │ - Email API     │
│ - Hot Reload    │    │ - CORS Config   │
│ - TypeScript    │    │ - Rate Limiting │
└─────────────────┘    └─────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────┐
│         Unified Node.js Server      │
│              (Port 3000)            │
│                                     │
│  ┌─────────────┐  ┌─────────────┐   │
│  │   Static    │  │     API     │   │
│  │   Assets    │  │  Endpoints  │   │
│  │             │  │             │   │
│  │ - React App │  │ - Email API │   │
│  │ - CSS/JS    │  │ - CORS      │   │
│  │ - Images    │  │ - Security  │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

## Components and Interfaces

### Build System Component
**Purpose**: Transform React TypeScript source code into production-ready static assets

**Key Responsibilities**:
- Compile TypeScript to JavaScript with type checking
- Bundle and optimize React components
- Process Tailwind CSS and component library styles
- Generate source maps for debugging
- Implement code splitting and tree shaking
- Handle asset optimization (images, fonts, etc.)

**Configuration**:
- Maintain existing Vite configuration for build process
- Preserve import aliases (`@/` for `src/`)
- Support environment variable injection at build time
- Generate manifest for asset versioning

### Static File Server Component
**Purpose**: Serve built React application assets with optimal performance

**Key Responsibilities**:
- Serve HTML, CSS, JavaScript, and image files
- Implement proper MIME type detection
- Add caching headers for performance optimization
- Handle SPA routing fallback to index.html
- Compress responses when client supports it

**Interface**:
```typescript
interface StaticServerConfig {
  buildDirectory: string;
  cacheMaxAge: number;
  compressionEnabled: boolean;
  fallbackRoute: string;
}
```

### API Router Component
**Purpose**: Handle all backend API endpoints with existing functionality

**Key Responsibilities**:
- Preserve all existing email endpoints
- Maintain identical request/response formats
- Apply rate limiting and security middleware
- Handle CORS configuration
- Provide health check endpoints

**Endpoints**:
- `GET /` - Serve React application
- `GET /health` - Server health check
- `POST /api/send-email` - Generic email sending
- `POST /api/send-verification` - Verification email
- `POST /api/send-password-reset` - Password reset email

### Request Router Component
**Purpose**: Intelligently route requests between static assets and API endpoints

**Routing Logic**:
1. `/api/*` routes → API Router Component
2. `/health` route → Health check endpoint
3. Static asset requests → Static File Server Component
4. All other routes → React application (SPA fallback)

**Implementation**:
```javascript
// API routes take precedence
app.use('/api', apiRouter);
app.use('/health', healthRouter);

// Static assets
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

## Data Models

### Server Configuration Model
```typescript
interface ServerConfig {
  port: number;
  environment: 'development' | 'production';
  staticPath: string;
  corsOrigins: string[];
  rateLimits: {
    general: { windowMs: number; max: number };
    email: { windowMs: number; max: number };
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}
```

### Build Configuration Model
```typescript
interface BuildConfig {
  entry: string;
  outDir: string;
  assetsDir: string;
  sourcemap: boolean;
  minify: boolean;
  target: string;
  rollupOptions: {
    output: {
      manualChunks: Record<string, string[]>;
    };
  };
}
```

### Asset Manifest Model
```typescript
interface AssetManifest {
  [key: string]: {
    file: string;
    src?: string;
    isEntry?: boolean;
    imports?: string[];
    css?: string[];
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Converting EARS to Properties

Based on the prework analysis, I'll convert the testable acceptance criteria into universally quantified properties, eliminating redundancy through consolidation:

**Property 1: Static Asset Serving Completeness**
*For any* static asset request (HTML, CSS, JS, images), the Unified Server should serve the asset with correct MIME type, appropriate caching headers, and compression when supported by the client
**Validates: Requirements 1.1, 2.3, 6.1, 6.2, 6.4, 6.5**

**Property 2: API Endpoint Compatibility**
*For any* API endpoint from the original backend, the Unified Server should provide identical request/response formats, error handling, and functionality
**Validates: Requirements 1.2, 4.1, 4.2, 4.6**

**Property 3: Security and CORS Preservation**
*For any* request requiring CORS or rate limiting, the Unified Server should apply the same security measures and CORS configuration as the original backend
**Validates: Requirements 1.3, 1.4, 4.5**

**Property 4: API Route Precedence**
*For any* request to /api/* paths, the Unified Server should route to API handlers rather than static file serving
**Validates: Requirements 1.6**

**Property 5: Build Output Validity**
*For any* TypeScript source file, the build process should generate valid JavaScript with preserved import aliases, Tailwind CSS styles, and optimization features
**Validates: Requirements 2.1, 2.4, 2.5, 6.6**

**Property 6: Environment Configuration Compatibility**
*For any* environment variable used by the original backend, the Unified Server should read and use the same variable with identical behavior
**Validates: Requirements 4.4, 5.1, 5.2**

**Property 7: Development/Production Mode Differentiation**
*For any* configuration setting, the Unified Server should behave differently in development vs production mode when appropriate
**Validates: Requirements 5.3**

**Property 8: Environment Variable Runtime Updates**
*For any* environment variable change, the server should reflect the new configuration without requiring code changes
**Validates: Requirements 5.5**

**Property 9: SPA Routing Fallback**
*For any* non-API route request, the Unified Server should serve the React application's index.html to enable client-side routing
**Validates: Requirements 6.3, 8.2**

**Property 10: Build Completeness**
*For any* production deployment, the build process should generate all necessary files for the application to function correctly
**Validates: Requirements 7.2**

**Property 11: Request Logging**
*For any* request to the Unified Server, appropriate log entries should be created with sufficient detail for debugging
**Validates: Requirements 8.1**

**Property 12: Error Handling Security**
*For any* error condition, the server should provide meaningful error messages without exposing sensitive information
**Validates: Requirements 4.3, 8.3, 8.5**

## Error Handling

### Build Process Error Handling
- **TypeScript Compilation Errors**: Build process should fail fast with clear error messages when TypeScript compilation fails
- **Asset Processing Errors**: Build process should handle missing assets gracefully and provide clear error messages
- **Environment Variable Errors**: Build process should validate required environment variables and fail with helpful messages

### Runtime Error Handling
- **Static Asset 404s**: Non-existent static assets should return 404 with appropriate headers, while non-API routes should fallback to React app
- **API Error Preservation**: All existing API error handling should be preserved exactly, including error codes, messages, and response formats
- **Server Startup Errors**: Server should fail to start with clear error messages if configuration is invalid or required services are unavailable

### Development vs Production Error Handling
- **Development Mode**: Detailed error messages, stack traces, and debugging information should be available
- **Production Mode**: Error messages should be sanitized to prevent information leakage while maintaining usefulness for debugging

## Testing Strategy

### Dual Testing Approach
This migration requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of static asset serving
- Individual API endpoint functionality
- Error conditions and edge cases
- Server startup and configuration validation
- Integration points between components

**Property-Based Tests** focus on:
- Universal properties across all static assets
- API compatibility across all endpoints
- Security measures across all request types
- Build process validation across all source files
- Environment configuration across all variables

### Property-Based Testing Configuration
- **Testing Library**: Use `fast-check` for JavaScript/TypeScript property-based testing
- **Test Iterations**: Minimum 100 iterations per property test to ensure comprehensive coverage
- **Test Tagging**: Each property test must reference its design document property using the format:
  `// Feature: vite-to-nodejs-migration, Property {number}: {property_text}`

### Testing Phases

**Phase 1: Build Process Testing**
- Verify build output structure and content
- Test TypeScript compilation and optimization
- Validate asset processing and bundling
- Test environment variable injection

**Phase 2: Server Functionality Testing**
- Test static asset serving with various file types
- Verify API endpoint compatibility
- Test request routing and fallback behavior
- Validate security and CORS configuration

**Phase 3: Integration Testing**
- Test complete request flows from client to server
- Verify SPA routing works correctly
- Test error handling across all components
- Validate logging and monitoring functionality

**Phase 4: Performance and Production Testing**
- Test caching behavior and performance
- Verify compression and optimization
- Test production deployment configuration
- Validate monitoring and health checks

### Test Environment Setup
- **Development Testing**: Use local server with development configuration
- **Production Testing**: Use production build with production configuration
- **Cross-Environment Testing**: Verify behavior consistency across environments
- **Automated Testing**: Integrate tests into CI/CD pipeline for continuous validation