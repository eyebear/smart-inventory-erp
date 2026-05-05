FROM node:24-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG SERVER_API_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV SERVER_API_BASE_URL=$SERVER_API_BASE_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM node:24-alpine AS runner

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG SERVER_API_BASE_URL

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV SERVER_API_BASE_URL=$SERVER_API_BASE_URL

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "start"]