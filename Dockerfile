FROM node:8-slim

WORKDIR /starter
ENV NODE_ENV development

RUN \
  apt-get update \
  && apt-get -y install python build-essential \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json /starter/package.json

RUN npm install --production
RUN npm install -g nodemon

COPY .env.example /starter/.env.example
COPY . /starter

CMD ["npm","start"]

EXPOSE 8080
