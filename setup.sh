#!/bin/bash
####################################
#
# Install tako2 dependency
#
####################################

apt-get update
apt-get -y install nodejs

apt-get -y install npm

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs

apt-get -y install git


npm install pm2 -g
git clone https://github.com/coolinker/tako2.git
cd tako2
npm install request
npm install https-proxy-agent
npm install get-pixels
