FROM node:24-alpine

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# code
COPY . .

CMD ["pnpm", "start", "--consumer", "--producer", "--http"]