FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /data/streams /app/logs

EXPOSE 4000

CMD ["node", "src/server.js"]
