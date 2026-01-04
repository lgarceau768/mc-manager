# Backend Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy app source (copy src directory explicitly)
COPY src ./src

# Copy compose examples for template suggestions
COPY compose_examples ./compose_examples

# Create data directories
RUN mkdir -p /app/data/database /app/data/servers /app/logs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "src/server.js"]
