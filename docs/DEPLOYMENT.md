# Produkcija - Gostilna POS

Vodic za namestitev v produkcijo na slovenskem trgu.

## Predpogoji

### Streznik
- OS: Ubuntu 22.04 LTS ali Debian 12
- RAM: min 4 GB (priporoceno 8 GB)
- Disk: min 20 GB SSD

### FURS predpogoji
- eDavki racun z digitalnim potrdilom (.p12)
- Davcna stevilka restavracije
- Identifikator poslovnega prostora
- Identifikator elektronske naprave

## 1. FURS certifikat

### Pridobitev
1. Prijavi se na eDavki
2. Prenesi .p12 certifikat
3. Shrani v /etc/icepos/certs/

### Konverzija v PEM

    openssl pkcs12 -in edavki.p12 -nocerts -nodes -out furs-private.pem
    openssl pkcs12 -in edavki.p12 -clcerts -nokeys -out furs-cert.pem
    openssl pkcs12 -in edavki.p12 -cacerts -nokeys -out furs-ca.pem

### FURS_PRIVATE_KEY

    base64 -w 0 furs-private.pem

## 2. PostgreSQL

### Docker Compose (priporoceno)
PostgreSQL se zazene avtomatsko.

### Roco

    sudo apt install postgresql-16
    sudo -u postgres psql -c "CREATE USER icepos WITH PASSWORD 'GESLO';"
    sudo -u postgres psql -c "CREATE DATABASE icepos OWNER icepos;"

### Backup

    0 2 * * * postgres pg_dump icepos | gzip > /var/backups/icepos.sql.gz

## 3. Reverse proxy z TLS

Uporabi reverse proxy za:
- TLS terminacija (Let is Encrypt)
- WebSocket routing za kitchen-service
- Security headers (HSTS, X-Frame-Options, itd.)

### Firewall

    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    sudo ufw deny 3000/tcp
    sudo ufw deny 3003/tcp
    sudo ufw deny 5432/tcp
    sudo ufw enable

## 4. Environment

    cd /opt/icepos
    cp .env.example .env

### Obvezne nastavitve

    DATABASE_URL=postgresql://icepos:GESLO@localhost:5432/icepos
    NEXTAUTH_SECRET=generiraj-nakljucno
    FURS_ENV=production
    FURS_TAX_NUMBER=12345678
    FURS_BUSINESS_UNIT=PREVOZ11
    FURS_CASH_REGISTER=BLAG01
    FURS_PRIVATE_KEY=base64-pem
    SUPER_ADMIN_KEY=generiraj-nakljucno
    REDIS_URL=redis://localhost:6379
    STRIPE_SECRET_KEY=sk_live_xxx
    STRIPE_WEBHOOK_SECRET=whsec_xxx

## 5. Docker Compose

    cd /opt/icepos
    git clone https://github.com/markec12345678/ICEPOS.git .
    
    # Preklopi na PostgreSQL v prisma/schema.prisma
    # provider = postgresql
    
    docker compose build
    docker compose up -d
    docker compose exec pos bun run db:migrate:prod

## 6. FURS INI registracija (OBVEZNO!)

    curl -X POST https://pos.tvoja-domena.si/api/furs/ini -H "x-operator-pin: 9999" -H "x-restaurant-id: TENANT_ID" -d "{}"

### Testni racun
1. FURS_ENV=test
2. Poslji 5-10 testnih racunov
3. Preveri na FURS ePogovor
4. Preklopi FURS_ENV=production

## 7. Post-deployment verifikacija

    ./scripts/production-check.sh https://pos.tvoja-domena.si

### Roco

    curl -sf https://pos.tvoja-domena.si/
    curl -sf https://pos.tvoja-domena.si/api/furs/status
    curl -s -o /dev/null -w "%{http_code}" https://pos.tvoja-domena.si/api/z-report
    curl -s https://pos.tvoja-domena.si/api/restaurants

## 8. Monitoring

    docker compose logs -f pos
    docker compose logs -f kitchen

### Posodobitve

    git pull origin main
    docker compose build
    docker compose up -d
    docker compose exec pos bun run db:migrate:prod

## 9. Troubleshooting

### FURS napake

| Napaka | Vzrok | Resitev |
|--------|-------|---------|
| sifraNapake=420 | Manjkajoci BusinessPremiseID | Preveri INI |
| sifraNapake=10 | Neveljaven certifikat | Preveri PEM |
| sifraNapake=100 | Neveljaven SOAP podpis | Preveri xml-crypto |
| Timeout | Pozarni zid | Odpri porte 9002/9003 |

## 10. Kontrolni seznam

- [ ] FURS certifikat namesten
- [ ] FURS_ENV testiran
- [ ] INI registracija uspesna
- [ ] PostgreSQL geslo mocno
- [ ] NEXTAUTH_SECRET generiran
- [ ] SUPER_ADMIN_KEY generiran
- [ ] TLS certifikat pridobljen
- [ ] Firewall konfiguriran
- [ ] API restavracij ne vraa obcutljivih podatkov
- [ ] Vsi API endpoint-i zahtevajo avtentikacijo
- [ ] Stripe webhook nastavljen
- [ ] PostgreSQL backup aktiven
- [ ] Testni placilni flow uspesne
- [ ] production-check.sh vsi zeleni

---

*Zadnja posodobitev: Julij 2025*
