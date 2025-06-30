# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set build arguments
ARG VITE_NETWORK_NAME
ARG VITE_CHAIN_ID
ARG VITE_RPC_URL
ARG VITE_CONTRACT_ADDRESS

# Set environment variables
ENV VITE_NETWORK_NAME=$VITE_NETWORK_NAME
ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_RPC_URL=$VITE_RPC_URL
ENV VITE_CONTRACT_ADDRESS=$VITE_CONTRACT_ADDRESS

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 