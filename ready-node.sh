#!/bin/bash


rm -rf deployments/localhost
cp -r deployments/polygon_dev deployments/localhost
cp -r artifacts-external/ artifacts/

echo 31337 > deployments/localhost/.chainId
