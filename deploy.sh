#!/usr/bin/env bash

./gradlew bundleDeploymentFiles
eb create
