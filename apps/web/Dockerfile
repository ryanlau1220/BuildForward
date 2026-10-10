FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps/web ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start", "--", "--hostname", "0.0.0.0"]
