# Use official Node.js image
FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create directory for templates
RUN mkdir -p /usr/src/app/templates

# Copy templates
COPY templatesemplates/* src/Templates

# Expose port
EXPOSE 5000

# Run the app
CMD ["npm", "start"]