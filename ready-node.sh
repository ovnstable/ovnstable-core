#!/bin/bash


rm -rf deployments/localhost
cp -r deployments/polygon deployments/localhost
echo 31337 > deployments/localhost/.chainId
