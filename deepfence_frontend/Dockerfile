FROM node:18-bullseye as build-stage
RUN mkdir -p /app
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@7.17.1 --activate
COPY pnpm-lock.yaml ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true pnpm fetch
COPY . .
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true pnpm install --offline --frozen-lockfile
RUN pnpm run build

FROM nginx:stable-alpine as production-stage
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build-stage /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]