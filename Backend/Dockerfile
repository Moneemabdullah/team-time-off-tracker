FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# tsc does not copy .ejs files, so place them beside the build output. The
# runtime resolves templates from dist/templates first, which keeps the image
# self-contained instead of depending on src/ still being present.
COPY src/templates ./dist/templates

EXPOSE 5000

CMD ["npm", "start"]
