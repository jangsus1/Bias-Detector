# Build frontend
FROM node:16-alpine

WORKDIR /app

COPY frontend/package*.json /app/

RUN npm install

COPY frontend/ /app/

RUN npm run build

# Use nginx for servering
FROM nginx:alpine

COPY --from=0 /app/build /usr/share/nginx/html

# Copy nginx config for single page react app
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]