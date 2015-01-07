#!/bin/bash
#node BlackloudLoggerServer.js &
#node public_html/BlackloudQueryServer.js &
#node BlackloudLogAutoUpdate.js &
sudo pm2 start BlackloudLoggerServer.js -i 1 
sudo pm2 start public_html/BlackloudQueryServer.js -i 1 
sudo pm2 start BlackloudLogAutoUpdate.js -i 1
