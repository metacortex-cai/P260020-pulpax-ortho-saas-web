FROM node:20-alpine

# Install openssl for cert generation script
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files for dependency installation
COPY frontend-saas/package*.json ./frontend-saas/

# Install dependencies
RUN cd frontend-saas && npm install

# Copy the rest of the application source code
COPY . .

# Expose port 6001
EXPOSE 6001

WORKDIR /app/frontend-saas

# Set default HOSTNAME to 0.0.0.0 so the server is reachable from the host machine
ENV HOSTNAME=0.0.0.0
ENV PORT=6001

# Generate SSL certs if they don't exist, then start development server
CMD ["sh", "-c", "node ../scripts/setup-https.js && npm run dev"]
