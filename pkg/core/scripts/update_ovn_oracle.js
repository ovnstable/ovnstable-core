const {ethers, upgrades, deployments} = require("hardhat");
const hre = require("hardhat");
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
const {getContract, transferETH, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {toE8} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let oracle = await getContract('OvnOracleOffChain');
    await (await oracle.updatePriceAssetUsd(toE8(17.8)));

    console.log('Price updated');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

