FROM ubuntu:20.04

RUN sed -i.bak -e "s%http://[^ ]\+%http://ftp.jaist.ac.jp/pub/Linux/ubuntu/%g" /etc/apt/sources.list

# To bypass tzdata configuration
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

RUN apt-get update &&\
    apt-get install -y tzdata

RUN apt-get install -y\
        curl\
        jq \
        vim\
        git\
        apt-transport-https\
        ca-certificates\
        software-properties-common\
        gnupg

# Get GPG keys
RUN curl -SL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add - &&\
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse"\
     | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - &&\
    touch /etc/apt/sources.list.d/nginx.list &&\
    echo "deb http://nginx.org/packages/ubuntu/ precise nginx" >> /etc/apt/sources.list.d/nginx.list &&\
    echo "deb-src http://nginx.org/packages/ubuntu/ precise nginx" >> /etc/apt/sources.list.d/nginx.list &&\
    curl -sL http://nginx.org/keys/nginx_signing.key | apt-key add - &&\
    curl -sL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) \
    stable"

RUN apt-get update &&\
    apt-get install -y\
        nodejs \
        mongodb-org=5.0.6 \
        mongodb-org-server=5.0.6 \
        mongodb-org-shell=5.0.6 \
        mongodb-org-mongos=5.0.6 \
        mongodb-org-tools=5.0.6 \
        nginx \
        docker-ce-cli=5:20.10.12~3-0~ubuntu-focal &&\
    apt-get clean

# Settings for MongoDB
RUN sed -i '8s@  dbPath: /var/lib/mongodb@  dbPath: /var/circus/data/mongodb@g' /etc/mongod.conf && \
    sed -i '18s@/var/log/mongodb/mongod.log@/var/circus/data/logs/mongodb/mongod.log@g' /etc/mongod.conf && \
    sed -i '19i\  logRotate: reopen' /etc/mongod.conf && \
    sed -i '24s/127.0.0.1/0.0.0.0/' /etc/mongod.conf && \
    sed -i '30i\  fork: true' /etc/mongod.conf && \
    sed -i -e '36s:^#::' /etc/mongod.conf && \
    sed -i '37i\  replSetName: "rs0"' /etc/mongod.conf

COPY . /var/circus/
RUN npm install -g pm2

# Settings for Nginx
COPY docker-build/nginx.default.conf /etc/nginx/conf.d/default.conf
RUN ln -s /etc/nginx/conf.d/default.conf /var/circus/nginx.default.conf && \
    sed -i 's@/run/nginx.pid@/tmp/nginx.pid@g' /etc/nginx/nginx.conf && \
    sed -i '16i\        proxy_temp_path /tmp/proxy_temp;' /etc/nginx/nginx.conf && \
    sed -i '17i\        client_body_temp_path /tmp/client_temp;' /etc/nginx/nginx.conf && \
    sed -i '18i\        fastcgi_temp_path /tmp/fastcgi_temp;' /etc/nginx/nginx.conf && \
    sed -i '19i\        uwsgi_temp_path /tmp/uwsgi_temp;' /etc/nginx/nginx.conf && \
    sed -i '20i\        scgi_temp_path /tmp/scgi_temp;' /etc/nginx/nginx.conf && \
    sed -i 's@/var/log/nginx@/var/circus/data/logs/nginx@g' /etc/nginx/nginx.conf && \
    sed -i '/include \/etc\/nginx\/sites-enabled\//d' /etc/nginx/nginx.conf && \
    sed -i 's@/var/log/nginx@/var/circus/data/logs/nginx@g' /etc/logrotate.d/nginx && \
    sed -i '4s/rotate 52/rotate 14/g' /etc/logrotate.d/nginx && \
    chmod a+w /var/log/nginx/access.log /var/log/nginx/error.log

# Setting for CIRCUS system
WORKDIR /var/circus
RUN npm ci
RUN npm run build

RUN mkdir -p /circus/.pm2 && \
    chmod 755 /circus && \
    chmod 777 /circus/.pm2

COPY docker-build/circus.config.js /var/circus/circus.config.js
COPY docker-build/startup.sh /circus/startup.sh
COPY docker-build/services.sh /circus/services.sh
COPY docker-build/data_initialization.sh /circus/data_initialization.sh
COPY docker-build/cad_plugin_registration.sh /circus/cad_plugin_registration.sh
COPY docker-build/mongodb_dump.sh /circus/mongodb_dump.sh

RUN chmod 755 /circus/*.sh && \
    chmod 777 /var/circus/circus.config.js

WORKDIR /circus

EXPOSE 8000

ENV PATH=/circus:$PATH \
    HOST_DATA_PATH=/var/circus/data \
    LOCAL_HOST_IP=127.0.0.1 \
    DAEMON_MODE=0 \
    PM2_HOME=/circus/.pm2

CMD ["/circus/startup.sh"]
