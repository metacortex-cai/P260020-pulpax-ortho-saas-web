FROM node:20-alpine

# Install openssl for cert generation script
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files for dependency installation
COPY frontend-clinic/package*.json ./frontend-clinic/

# Install dependencies
RUN cd frontend-clinic && npm install --legacy-peer-deps

# Copy the rest of the application source code
COPY . .

# Expose port 7001
EXPOSE 7001

WORKDIR /app/frontend-clinic

# Set default HOSTNAME to 0.0.0.0 so the server is reachable from the host machine
ENV HOSTNAME=0.0.0.0
ENV PORT=7001

# Generate SSL certs if they don't exist, then start development server
CMD ["sh", "-c", "node ../scripts/setup-https.js && npm run dev"]
