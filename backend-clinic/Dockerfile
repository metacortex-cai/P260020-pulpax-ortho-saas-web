FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package files and install ALL dependencies (including devDeps for build)
COPY backend-clinic/package*.json ./backend-clinic/
RUN cd backend-clinic && npm install --legacy-peer-deps --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-retries=5

# Copy application source code
COPY . .

# Generate Prisma clients (with correct binaryTargets already in schema files)
RUN cd backend-clinic && npx prisma generate --schema=prisma/schema.prisma
RUN cd backend-clinic && npx prisma generate --schema=prisma/tenant.prisma

# Build the NestJS app
RUN cd backend-clinic && npm run build

# Prod imajına devDependencies (typescript, jest, @nestjs/cli vb.) sızmasın diye
# build tamamlandıktan sonra sadece runtime bağımlılıkları bırakılır.
RUN cd backend-clinic && npm prune --omit=dev --legacy-peer-deps

# Production Stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# Copy package files for production install
COPY backend-clinic/package*.json ./backend-clinic/

# Copy dependencies and compiled files
COPY --from=builder /app/backend-clinic/node_modules ./backend-clinic/node_modules
COPY --from=builder /app/backend-clinic/dist ./backend-clinic/dist
COPY --from=builder /app/backend-clinic/prisma ./backend-clinic/prisma
COPY --from=builder /app/backend-clinic/src/prisma/tenant-client ./backend-clinic/dist/src/prisma/tenant-client

WORKDIR /app/backend-clinic

EXPOSE 7010

ENV NODE_ENV=production
ENV PORT=7010

CMD ["sh", "-c", "/app/backend-clinic/node_modules/.bin/prisma db push --schema=prisma/tenant.prisma && node dist/src/main.js"]
