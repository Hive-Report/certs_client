FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY . .

RUN apk add --no-cache python3 make g++ \
 && npm ci \
 && npm run build \
 && npm prune --production \
 && apk del python3 make g++

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data


USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
