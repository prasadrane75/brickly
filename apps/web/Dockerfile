FROM node:20-bullseye AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app
COPY apps/web/ apps/web/
RUN npm --workspace apps/web run build

FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/.next ./apps/web/.next

EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "start"]
