# Use Node.js 18 Alpine image
FROM node:18-alpine

# Install OpenSSL and other dependencies
RUN apk add --no-cache openssl curl

# Set working directory
WORKDIR /app

# Copy package files (from backend directory)
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema first (from backend/prisma)
COPY backend/prisma ./prisma

# Generate Prisma client (must be done before copying all source)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy rest of backend source code
COPY backend/ .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
