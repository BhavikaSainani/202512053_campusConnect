# Step 2: Create the Dockerfile
# Select an appropriate base image
FROM node:20-alpine

# Set a working directory
WORKDIR /app

# Copy the dependency files first for layer caching
COPY package*.json ./

# Install the required dependencies
RUN npm install

# Copy the application source code
COPY . .

# Expose the API port
EXPOSE 3001

# Define the command required to start the application
CMD ["npm", "start"]
