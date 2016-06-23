#!/bin/sh

curl -kfsSL "$SMAUG_CONFIG" -o /etc/smaug.json && node /opt/smaug/src/main.js -f /etc/smaug.json
