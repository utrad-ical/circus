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
RUN curl -SL https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add - &&\
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse"\
     | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
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
        mongodb-org=4.4.6 \
        mongodb-org-server=4.4.6 \
        mongodb-org-shell=4.4.6 \
        mongodb-org-mongos=4.4.6 \
        mongodb-org-tools=4.4.6 \
        nginx \
        docker-ce-cli=5:20.10.6~3-0~ubuntu-focal &&\
    apt-get clean

# Settings for MongoDB
RUN sed -i '8s@  dbPath: /var/lib/mongodb@  dbPath: /var/circus/data/mongodb@g' /etc/mongod.conf && \
    sed -i '19i\  logRotate: reopen' /etc/mongod.conf && \
    sed -i '20s@/var/log/mongodb/mongod.log@/var/circus/data/logs/mongodb/mongod.log@g' /etc/mongod.conf && \
    sed -i '25s/127.0.0.1/0.0.0.0/' /etc/mongod.conf && \
    sed -i '30i\  fork: true' /etc/mongod.conf

COPY . /var/circus/
RUN npm install -g pm2

# Settings for Nginx
COPY docker-build/nginx.default.conf /etc/nginx/conf.d/default.conf
RUN ln -s /etc/nginx/conf.d/default.conf /var/circus/nginx.default.conf && \
    sed -i 's@/var/log/nginx@/var/circus/data/logs/nginx@g' /etc/nginx/nginx.conf && \
    sed -i '/include \/etc\/nginx\/sites-enabled\//d' /etc/nginx/nginx.conf && \
    sed -i 's@/var/log/nginx@/var/circus/data/logs/nginx@g' /etc/logrotate.d/nginx && \
    sed -i '4s/rotate 52/rotate 14/g' /etc/logrotate.d/nginx

# Setting for CIRCUS system
WORKDIR /var/circus
RUN npm ci
RUN npm run build
    
COPY docker-build/circus.config.js /var/circus/circus.config.js
COPY docker-build/startup.sh /root/startup.sh
COPY docker-build/services.sh /root/services.sh
COPY docker-build/data_initialization.sh /root/data_initialization.sh
COPY docker-build/cad_plugin_registration.sh /root/cad_plugin_registration.sh
COPY docker-build/mongodb_dump.sh /root/mongodb_dump.sh

RUN chmod 755 /root/*.sh

WORKDIR /root

ENV PATH=/root:$PATH \
    DATA_PATH=/var/circus/data \
    DAEMON_MODE=0

CMD ["/root/startup.sh"]
