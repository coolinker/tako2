apt-get update
apt-get install -y nodejs
apt-get install -y npm
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs
apt-get install -y git
npm install pm2 -g
git clone https://github.com/coolinker/tako2.git
cd tako2
npm install request
npm install https-proxy-agent
npm install get-pixels

