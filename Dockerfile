FROM caddy/caddy

ADD dist /var/www/html/vfeeg-web/

ADD caddy.conf /etc/caddy/Caddyfile
ADD keycloak-config.json /srv

#VOLUME /var/www/html/vfeeg-web/config
