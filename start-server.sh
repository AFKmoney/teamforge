#!/bin/bash
# Robust server startup script
while true; do
  echo "$(date): Starting Next.js..." >> /tmp/server-monitor.log
  bun run dev >> dev.log 2>&1
  EXIT=$?
  echo "$(date): Server exited ($EXIT), restarting in 2s..." >> /tmp/server-monitor.log
  sleep 2
done
