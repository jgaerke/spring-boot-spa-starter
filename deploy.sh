#!/usr/bin/env bash

./gradlew clean bundleDeploymentFiles
eb create
eb swap
