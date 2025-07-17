# Use official Node.js image
FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (include all needed packages)
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Create directories if they don't exist
RUN mkdir -p /usr/src/app/templates && \
    mkdir -p /usr/src/app/invoice-files

# Expose port
EXPOSE 5000

# Run the app
CMD ["npm", "start"]