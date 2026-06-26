#!/bin/bash
# Robustno zažene Next.js dev strežnik kot daemon
cd /home/z/my-project

# Ustavi morebitne obstoječe
pkill -f "next dev" 2>/dev/null
sleep 1

# Zaženi s setsid + nohup, popolnoma odklopljen od terminala
setsid nohup bun run dev > /home/z/my-project/dev.log 2>&1 < /dev/null &
PID=$!
disown $PID 2>/dev/null

# Počakaj da je pripravljen
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "OK: dev server pripravljen (pid $PID)"
    exit 0
  fi
  sleep 1
done
echo "FAIL: dev server se ni zagnal v 30s"
cat /home/z/my-project/dev.log
exit 1
