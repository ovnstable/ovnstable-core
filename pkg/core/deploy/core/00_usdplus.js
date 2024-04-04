const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params;
    const stand = hre.ovn.stand || hre.network.name;
    if (stand === "optimism_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (stand === "arbitrum_dai") {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (stand === "arbitrum_eth") {
        params = {args: ["ETH+", "ETH+", 18]}
    } else if (stand === "bsc_usdt") {
        params = {args: ["USDT+", "USDT+", 18]}
    } else if (stand === 'base_dai') {
        params = {args: ["DAI+", "DAI+", 18]}
    } else if (stand === 'linea_usdt') {
        params = {args: ["USDT+", "USDT+", 6]}
    } else if (stand === 'arbitrum_usdt') {
        params = {args: ["USDT+", "USDT+", 6]}
    } else if (stand === 'base_usdc') {
        params = {args: ["USDC+", "USDC+", 6]};
    } else if (stand === 'blast') {
        params = {args: ["USD+", "USD+", 18]};
    } else if (stand === 'blast_usdc') {
        params = {args: ["USDC+", "USDC+", 18]};
    } else if (stand === 'zksync_usdt') {
        params = {args: ["USDT+", "USDT+", 6]}
    } else {
        params = {args: ["USD+", "USD+", 6]};
    }
    // await deployProxy('UsdPlusToken', deployments, save, params);
    deployProxyMulti("UsdPlusToken", "UsdPlusToken", deployments, deployments.save, {
        args: params,
    })

    let usdPlus = await ethers.getContract('UsdPlusToken');

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:      ' + await usdPlus.symbol());
    console.log('Name:        ' + await usdPlus.name());
    console.log('Decimals:    ' + await usdPlus.decimals());
    console.log('totalSupply: ' + await usdPlus.totalSupply());

};

module.exports.tags = ['base', 'UsdPlusToken'];
