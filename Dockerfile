FROM node:18

WORKDIR /tmp/repo

RUN apt-get update

RUN apt-get install -y python3

RUN apt-get install -y ffmpeg

COPY . .

RUN npm install node-gyp

RUN npm install fluent-ffmpeg

RUN npm install

EXPOSE 80

CMD [ "npm", "start"]
