#!/bin/sh

curl -kfsSL "$SMAUG_CONFIG" -o /etc/smaug.json && PORT_OAUTH=8001 PORT_CONFIG=8002 PORT_ADMIN=8003 node /opt/smaug/src/main.js -f /etc/smaug.json
