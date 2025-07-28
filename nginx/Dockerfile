FROM nginx:1.25-alpine

# Install dependencies
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL generation script
COPY ssl/generate-ssl.sh /generate-ssl.sh
RUN chmod +x /generate-ssl.sh

# Generate SSL certificates at build time (for development)
# Use sh explicitly to avoid shebang issues
RUN sh /generate-ssl.sh

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/run

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/nginx_status || exit 1

CMD ["nginx", "-g", "daemon off;"]