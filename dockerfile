FROM node:8.9.1

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm i

