const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers, deployments, getNamedAccounts} = require("hardhat");
const {OPTIMISM, ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {toE18, toE8} = require("@overnight-contracts/common/utils/decimals");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments, getNamedAccounts}) => {

    await deployProxyMulti('OvnOracleOffChain', 'AssetOracleOffChain', deployments, deployments.save, {});

    console.log('Deploy OvnOracleOffChain done');

    let oracle = await ethers.getContract('OvnOracleOffChain');

    let roleManager = await getContract('RoleManager', 'arbitrum');

    let params = {
        roleManager: roleManager.address,
        asset: ARBITRUM.ovn,
        minPriceUsd: toE8(10),
        maxPriceUsd: toE8(50),
        duration: 24 * 60 * 60,
    }

    await (await oracle.setParams(params)).wait();
    console.log('SetParams done');

    let item = {
        assetAddress: ARBITRUM.usdc,
        oracle: ARBITRUM.oracleUsdc,
        dm: 0
    }

    await (await oracle.setUnderlyingItem(item)).wait();

    item = (await oracle.underlyingItems(item.assetAddress));
    console.log(`DM  ${item.dm.toString()}`);

    await (await oracle.updatePriceAssetUsd(toE8(17.8))).wait();

    console.log(`Add underlying item: ${JSON.stringify(item)} done`);
};

module.exports.tags = ['OvnOracleOffChain'];
