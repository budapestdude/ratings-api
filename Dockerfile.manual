# Multi-stage build for FIDE Rating API

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy backend source
COPY src ./src

# Build backend
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./
COPY client/tsconfig.json ./
COPY client/next.config.js ./
COPY client/tailwind.config.js ./
COPY client/postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY client/app ./app
COPY client/lib ./lib
COPY client/public ./public

# Build frontend for production
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend
COPY --from=frontend-builder /app/client/out ./client/out

# Create data directory for database
RUN mkdir -p ./data
# Note: Database will be mounted as a volume in production

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/index.js"]