#!/bin/bash
# Robustno zažene kitchen WebSocket service kot daemon
cd /home/z/my-project/mini-services/kitchen-service

# Ustani morebitne obstoječe
pkill -f "kitchen-service/index.ts" 2>/dev/null
sleep 1

# Zaženi s setsid + nohup, popolnoma odklopljen
setsid nohup bun --hot index.ts > /tmp/kitchen.log 2>&1 < /dev/null &
PID=$!
disown $PID 2>/dev/null

# Počakaj da je pripravljen
for i in $(seq 1 15); do
  if ss -tlnp 2>/dev/null | grep -q ":3003 "; then
    echo "OK: kitchen service pripravljen (pid $PID)"
    exit 0
  fi
  sleep 1
done
echo "FAIL: kitchen service se ni zagnal v 15s"
cat /tmp/kitchen.log
exit 1
