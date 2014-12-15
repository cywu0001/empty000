#!/bin/bash
if [ -d node_modules ];then
  echo "No need to install libraries"
else
  echo "Need to install libraries\n"
  echo "=========================\n"
  npm install
  echo "=========================\n"
fi
#sudo pm2 start ./utils/BlackloudLogAutoUpdate.js -i 1
#Zephyr: add for daily update available product
sudo pm2 start ./routes/billing/BillingRefreshProduct.js -i 1
#Zephyr: end
sudo pm2 start ./routes/weather/WeatherUpdateService.js -i 1
sudo pm2 start ./bin/www -i 1
if [ $? != 0 ];then
  echo "Stop run weather server...."
fi
