FROM ubuntu:16.10
MAINTAINER ByeongHun, Yoo <bh322yoo@gmail.com>

RUN apt update
RUN apt install software-properties-common -y
RUN add-apt-repository ppa:webupd8team/java -y

RUN echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
RUN apt update
RUN apt install g++ oracle-java8-installer -y

RUN apt install jq -y

RUN rm -rf /var/lib/apt/lists/*
RUN rm -rf /var/cache/oracle-jdk8-installer
RUN apt-get clean