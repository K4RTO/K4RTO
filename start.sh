#!/bin/bash
cd "$(dirname "$0")"

if lsof -ti:3060 > /dev/null 2>&1; then
  echo "Port 3060 is already in use. Stop it first with ./stop.sh"
  exit 1
fi

echo "Starting dev server on port 3060..."
npm run dev &
echo "Dev server started (PID: $!)"
