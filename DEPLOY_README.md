
# How to deploy to dev/prod ? 

1) Check file .env:
- Have PK_POLYGON 
- Have ETH_NODE_URI_POLYGON

2) Go to scripts/deployProxy.js

Set value *upgradeTo* to false


3) Deploy contracts and save impl addresses

> You should deploy contracts only with logic changes!

Command for deploy - example:

`npx hardhat deploy --tags Connectors --network polygon_dev`

4) Write deploy script 

> For example see deploy/92_deployM2MFix.js

Use impl addresses in deploy script

5) 
