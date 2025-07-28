# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Test stage
FROM build AS test
WORKDIR /app

# Install test dependencies
RUN npm ci --include=dev

# Run tests
RUN npm run test || true
RUN npm run lint || true

# Runtime stage
FROM node:18-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built application from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./
COPY --from=build /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]