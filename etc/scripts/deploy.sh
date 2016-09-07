#!/usr/bin/env bash

cd ../../
./gradlew clean build
if [ $? -eq 0 ]; then
  printf "Successfully built"
else
  printf "Failed to build"
  exit -1
fi
cp -r .elasticbeanstalk/Procfile server/build/libs/
cd server/build/libs
rm spring-boot-spa-starter-1.0.0.jar.original
zip bundle.zip -r * .[^.]*
cd ../../../
eb setenv SPRING_PROFILES_ACTIVE=production
