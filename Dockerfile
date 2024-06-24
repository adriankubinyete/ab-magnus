# base
FROM node:20-alpine

# node pkgs
COPY package.json /app/

# code base
COPY src /app/src/

# logs folder
RUN mkdir -p /app/logs

# cd /app
WORKDIR /app

# install node pkgs
RUN npm install --verbose
RUN npm i -g npm-run-all

# run
# CMD ["tail", "-f", "/dev/null"]
CMD ["npm", "run", "production"]
