FROM ubuntu:18.04
MAINTAINER Byeonghoon, Yoo <bh322yoo@gmail.com>

RUN sed -Ei -e 's/http:\/\/archive.ubuntu.com\/ubuntu\//http:\/\/kr.archive.ubuntu.com\/ubuntu\//' -e 's/http:\/\/security.ubuntu.com\/ubuntu\//http:\/\/kr.archive.ubuntu.com\/ubuntu\//' /etc/apt/sources.list

RUN apt update && apt install g++ openjdk-11-jdk python3 make -y && rm -rf /var/lib/apt/lists/* && apt clean

ARG uid=1000
RUN groupadd -g ${uid} tester && useradd -m -g tester -u ${uid} tester

COPY judge.py /home/tester/
RUN chown tester:tester /home/tester/judge.py && chmod 500 /home/tester/judge.py

WORKDIR /home/tester
USER tester