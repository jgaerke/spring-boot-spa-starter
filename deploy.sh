#!/usr/bin/env bash

./gradlew clean bundleDeploymentFiles
eb create
eb setenv SPRING_PROFILES_ACTIVE=production

