#!/bin/bash
echo 'stopping pm2 services ...'
sudo pm2 kill
# find pid of elasticsearch daemon
PID=`ps -ef | awk '/lib\/elasticsearch-1.4.2.jar/{print $2}'`
echo 'killing elasticsearch daemon with pid  '$PID
kill -9 $PID
echo 'Done stopping all services'
