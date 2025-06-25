# Use Alpine as base image
FROM alpine

# Install required packages: WireGuard, Node.js, npm, and dependencies
RUN apk update && apk add --no-cache \
    wireguard-tools \
    nodejs \
    npm \
    iptables \
    bash \
    iproute2 \
    curl

# Create directory for WireGuard config
RUN mkdir -p /etc/wireguard

# Copy your Node.js app
WORKDIR /app

# Create directory for qrcode
RUN mkdir qrcode

# Copy all files
COPY . .

# Install required packages
RUN npm install

# Expose
EXPOSE 3000 51820/udp

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Run a the server
ENTRYPOINT ["node", "index.js"]
