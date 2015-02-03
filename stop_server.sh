#!/bin/bash
echo 'stopping pm2 services ...'
sudo pm2 kill
# find pid of elasticsearch daemon
PROCESS=/lib/elasticsearch-1.4.2.jar
if ps ax | grep -v grep | grep $PROCESS > /dev/null
then
	PID=`ps -ef | awk '/lib\/elasticsearch-1.4.2.jar/{print $2}'`
	echo 'killing elasticsearch daemon with pid  '$PID
	sudo kill -9 $PID
	echo 'Done stopping all services'
else
	echo 'elasticsearch is not running, do nothing.'
fi
