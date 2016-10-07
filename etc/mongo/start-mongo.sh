#!/usr/bin/env bash
#mongod --auth --config mongod.conf
pkill -f 'mongod'
rm -rf data
rm -rf logs
mkdir data
mkdir logs
cp .gitkeep data/
cp .gitkeep logs/
mongod --config mongod.conf &>/dev/null &