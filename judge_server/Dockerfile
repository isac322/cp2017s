FROM ubuntu:16.10
MAINTAINER ByeongHun, Yoo <bh322yoo@gmail.com>

RUN apt-get update
RUN apt-get install dirmngr -y

RUN sh -c 'echo "deb http://ppa.launchpad.net/webupd8team/java/ubuntu xenial main" >> /etc/apt/sources.list.d/webupd8team-ubuntu-java-xenial.list'
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys EEA14886

RUN echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
RUN apt-get update
RUN apt-get install g++ oracle-java8-installer python3 jq -y

RUN rm -rf /var/lib/apt/lists/*
RUN rm -rf /var/cache/oracle-jdk8-installer
RUN apt-get clean
RUN groupadd tester && useradd -m -g tester tester

COPY judge.sh /home/tester/
COPY compare.py /home/tester/
RUN chown tester:tester /home/tester/judge.sh /home/tester/compare.py
RUN chmod 500 /home/tester/judge.sh /home/tester/compare.py

WORKDIR /home/tester
USER tester