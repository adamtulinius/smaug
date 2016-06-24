FROM docker-xp.dbc.dk/node:6
MAINTAINER Adam F. Tulinius <atu@dbc.dk>

ADD . /opt/smaug
RUN cd /opt/smaug && npm install
ADD docker/start-smaug.sh /bin/start-smaug.sh

EXPOSE 8001
EXPOSE 8002
EXPOSE 8003

CMD ["/bin/start-smaug.sh"]
