FROM node:22-alpine
WORKDIR /app
COPY packages/backend/package*.json ./
RUN npm ci --only=production
COPY packages/backend/dist ./dist
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
