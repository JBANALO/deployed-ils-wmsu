FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install root dependencies (needed for Vite build)
RUN npm ci

# Install server dependencies
RUN cd server && npm ci

# Copy all source files
COPY . .

# Build frontend with production API URL
ENV VITE_API_URL=/api
RUN npm run build

# Expose the port Railway uses
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the Node.js backend server (which also serves the built frontend)
CMD ["node", "server/server.js"]
