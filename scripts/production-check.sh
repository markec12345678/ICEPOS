#!/bin/bash
# Produkcija zdravstvena kontrola
# Uporaba: ./scripts/production-check.sh https://pos.tvoja-domena.si

set -e
URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
    local desc="$1"
    local cmd="$2"
    if eval "$cmd" >/dev/null 2>&1; then
        echo "✅ $desc"
        PASS=$((PASS+1))
    else
        echo "❌ $desc"
        FAIL=$((FAIL+1))
    fi
}

echo "🔍 Preverjam $URL ..."
echo ""

check "Homepage dosegljiv" "curl -sf $URL/ | grep -q '<title>'"
check "API /furs/status dosegljiv" "curl -sf $URL/api/furs/status"
check "/api/auth/me vrača 401 brez auth" "[ \$(curl -s -o /dev/null -w '%{http_code}' $URL/api/auth/me) = '401' ]"
check "/api/z-report vrača 401 brez auth" "[ \$(curl -s -o /dev/null -w '%{http_code}' $URL/api/z-report) = '401' ]"
check "/api/restaurants ne vrača taxNumber" "! curl -sf $URL/api/restaurants | grep -q taxNumber"
check "/api/stripe/webhook vrača 400 brez sig" "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' $URL/api/stripe/webhook) = '400' ]"
check "/api-docs (Swagger UI) dosegljiv" "curl -sf $URL/api-docs | grep -q 'swagger'"

echo ""
echo "=================="
echo "✅ Pass: $PASS"
echo "❌ Fail: $FAIL"
echo "=================="
[ $FAIL -eq 0 ] && exit 0 || exit 1
