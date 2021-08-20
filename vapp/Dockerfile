FROM node:lts-alpine

# install simple http server for serving static content
RUN npm install -g http-server

COPY dist/ ./dist

EXPOSE 8080
CMD [ "http-server", "dist" ]
