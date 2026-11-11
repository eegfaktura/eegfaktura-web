FROM caddy:2.11.7

ADD dist /var/www/html/vfeeg-web/

ADD caddy.conf /etc/caddy/Caddyfile
ADD keycloak-config.json /srv

#VOLUME /var/www/html/vfeeg-web/config

# CVE-2026-111497: caddy:2.11.7 bringt brotli-libs 1.2.0 mit, ein neueres Caddy-Image gibt es
# noch nicht. Entfernen, sobald die Basis mindestens 1.2.1-r0 enthaelt.
RUN apk add --no-cache 'brotli-libs>=1.2.1-r0'

# Nicht als root laufen (Befund A06 der Altsystem-Analyse).
# Caddy lauscht laut caddy.conf auf :8080, also oberhalb von 1024 - es braucht
# dafuer keine Privilegien. /data und /config sind Caddys XDG-Pfade (siehe
# XDG_DATA_HOME / XDG_CONFIG_HOME im Basis-Image) und muessen dem Benutzer
# gehoeren, sonst scheitert der Start beim Anlegen seines Zustands.
# Die ausgelieferten Dateien unter /var/www bleiben root-eigen; Caddy liest sie nur.
RUN addgroup -g 1000 -S app \
 && adduser -u 1000 -S app -G app \
 && chown -R app:app /data /config
USER app
