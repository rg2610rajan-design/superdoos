# Use the official Microsoft Playwright image
# This image comes with Node.js AND all browser dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Set environment variable for the port
ENV PORT=3000
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
