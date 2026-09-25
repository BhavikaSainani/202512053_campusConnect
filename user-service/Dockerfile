# Base Image: Lightweight Node.js 20 on Alpine Linux
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package descriptors first for Docker layer caching
COPY package*.json ./

# Install dependencies inside container image
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the User Service port
EXPOSE 3001

# Start command for the container
CMD ["node", "server.js"]
