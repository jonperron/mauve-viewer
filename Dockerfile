# Stage 1: Install all dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Stage 2: Build client and server
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production dependencies only
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# Stage 4: Production
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY bin/linux-x64/ ./bin/linux-x64/
RUN chmod +x ./bin/linux-x64/mauveAligner ./bin/linux-x64/progressiveMauve
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
