#!/usr/bin/env bash

./gradlew clean bundleDeploymentFiles
eb create --cfg spring-boot-spa-starter

