# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# при сборке VITE должен знать адрес API. 
# в реальном продакшене это делается через proxy в nginx, но для тестового можно так:
ENV VITE_API_URL=http://localhost:3001/api/v1
RUN npm run build

# Production stage
FROM nginx:stable-alpine
# кастомный конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
# нужно добавить конфиг nginx для SPA (чтобы при обновлении страницы /item/1 не было 404),
# но для базового запуска может хватить дефолтного, если ходить только по ссылкам.
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]