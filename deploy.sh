#!/usr/bin/env bash

./gradlew clean bundleDeploymentFiles
eb create --envvars SPRING_PROFILES_ACTIVE=production

