FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY backend-saas/package*.json ./backend-saas/
RUN cd backend-saas && npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Generate Prisma clients
RUN cd backend-saas && npx prisma generate --schema=prisma/schema.prisma
RUN cd backend-saas && npx prisma generate --schema=prisma/tenant.prisma

# Build the NestJS app
RUN cd backend-saas && npm run build

# Also compile seed.ts separately so it can be run as plain JS in production
RUN cd backend-saas && node_modules/.bin/tsc prisma/seed.ts \
    --outDir dist/prisma-seed \
    --esModuleInterop true \
    --resolveJsonModule true \
    --module commonjs \
    --target es2020 \
    --moduleResolution node \
    --skipLibCheck true || true

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma compatibility on Alpine
RUN apk add --no-cache openssl

COPY --from=builder /app/backend-saas/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/backend-saas/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend-saas/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/backend-saas/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/backend-saas/prisma ./backend-saas/prisma
COPY --from=builder /app/backend-saas/dist/prisma-seed ./backend-saas/dist/prisma-seed

# Copy dependencies and compiled files
COPY --from=builder /app/backend-saas/node_modules ./backend-saas/node_modules
COPY --from=builder /app/backend-saas/dist ./backend-saas/dist

WORKDIR /app/backend-saas

# Copy package.json for script resolution
COPY --from=builder /app/backend-saas/package*.json ./

EXPOSE 6010

ENV NODE_ENV=production
ENV PORT=6010

# Use absolute path to prisma binary to avoid symlink resolution issues
CMD ["sh", "-c", "/app/backend-saas/node_modules/.bin/prisma db push --schema=prisma/schema.prisma && node dist/src/main.js"]
