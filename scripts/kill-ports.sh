#!/bin/bash
ports=(3001 5173)
for port in "${ports[@]}"; do
  pid=$(lsof -t -i:"$port")
  if [ -n "$pid" ]; then
    echo "Killing process on port $port (PID: $pid)..."
    kill -9 $pid
  else
    echo "No process running on port $port."
  fi
done