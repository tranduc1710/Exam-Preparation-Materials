FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=builder /app/dist ./dist
COPY server.mjs ./server.mjs
ENV PORT=3030
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 3030
CMD ["node", "server.mjs"]

