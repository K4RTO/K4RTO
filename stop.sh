#!/bin/bash
PIDS=$(lsof -ti:3060 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "No process found on port 3060."
  exit 0
fi

echo "Stopping processes on port 3060: $PIDS"
kill $PIDS 2>/dev/null
sleep 1

# Force kill if still running
PIDS=$(lsof -ti:3060 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "Force killing remaining processes: $PIDS"
  kill -9 $PIDS 2>/dev/null
fi

echo "Port 3060 is now free."
