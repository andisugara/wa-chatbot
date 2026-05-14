FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Install all dependencies including devDependencies to run tsc
RUN npm install
COPY . .
# Generate Prisma Client and build TS to JS
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev
# Copy compiled output and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000
# Run the built app using node directly (Docker will handle restarts)
CMD ["node", "dist/index.js"]
