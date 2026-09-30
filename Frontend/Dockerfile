FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Listed explicitly rather than `COPY . .`: copying the whole directory
# overwrote the node_modules installed above with the host's, which broke the
# native Rolldown and Tailwind addons with SIGBUS. Frontend/.dockerignore also
# keeps node_modules out of the build context.
COPY index.html vite.config.js tsconfig.json components.json ./
COPY public ./public
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]