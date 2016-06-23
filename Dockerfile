FROM docker-xp.dbc.dk/node:6
MAINTAINER Adam F. Tulinius <atu@dbc.dk>

ADD docker/start-smaug.sh /bin/start-smaug.sh
ADD . /opt/smaug
RUN cd /opt/smaug && npm install

CMD ["/bin/start-smaug.sh"]
