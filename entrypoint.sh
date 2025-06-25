#!/bin/sh

# Setup NAT (MASQUERADE) for WireGuard traffic
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Start Node.js app
exec node index.js
