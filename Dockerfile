# Use official Node.js image
FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies (use --production if needed)
RUN npm install

# Copy all files including .env
COPY . .


# Create required directories
RUN mkdir -p /usr/src/app/templates && \
    mkdir -p /usr/src/app/invoice-files

# Expose port
EXPOSE 5001

# Run the app
CMD ["npm", "start"]