FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install axios
RUN npm install axios

# Copy all test files
COPY . .

# Create test-results directory
RUN mkdir -p test-results

# Default command
CMD ["npm", "test"]