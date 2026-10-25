FROM node:20-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare yarn@4.9.2 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases .yarn/releases
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN yarn install --immutable

COPY server server
RUN yarn workspace server build

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist

WORKDIR /app/server
EXPOSE 4000

CMD ["node", "dist/main.js"]
