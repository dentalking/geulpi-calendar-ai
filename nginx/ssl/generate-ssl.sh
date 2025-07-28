#!/bin/bash

# Generate self-signed SSL certificate for development
# For production, use proper certificates from Let's Encrypt or other CA

CERT_DIR="/etc/nginx/ssl"
mkdir -p $CERT_DIR

# Generate private key
openssl genrsa -out $CERT_DIR/key.pem 2048

# Generate certificate signing request
openssl req -new -key $CERT_DIR/key.pem -out $CERT_DIR/csr.pem -subj "/C=KR/ST=Seoul/L=Seoul/O=Geulpi/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in $CERT_DIR/csr.pem -signkey $CERT_DIR/key.pem -out $CERT_DIR/cert.pem

# Clean up CSR
rm $CERT_DIR/csr.pem

echo "SSL certificates generated successfully!"