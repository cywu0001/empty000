#!/bin/bash
if [ -d node_modules ];then
  echo "No need to install libraries"
else
  echo "Need to install libraries\n"
  echo "=========================\n"
  npm install
  echo "=========================\n"
fi
sudo pm2 start ./routes/weather/WeatherUpdateService.js -i 1
sudo pm2 start ./bin/www -i 1
if [ $? != 0 ];then
  echo "Stop run weather server...."
fi

#Zephyr: add for daily update available product
#sudo pm2 start utils/BlackloudLoggerServer/BlackloudLoggerServer.js -i 1 
#sudo pm2 start utils/BlackloudLoggerServer/public_html/BlackloudQueryServer.js -i 1
#sudo pm2 start utils/BlackloudLoggerServer/BlackloudLogAutoUpdate.js -i 1
#cd $ROOT_DIR/utils/BlackloudLoggerServer/
#./start.sh
#cd $ROOT_DIR

ROOT_DIR=$(pwd)
echo $ROOT_DIR
sudo pm2 start ./routes/billing/BillingRefreshProduct.js -i 1
$ROOT_DIR/utils/BlackloudElsServer/elasticsearch-1.4.2/bin/elasticsearch &
sudo pm2 start utils/BlackloudElsServer/kibana.js -i 1 
#Zephyr: end
