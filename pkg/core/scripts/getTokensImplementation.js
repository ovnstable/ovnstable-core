const {
    getContract,
    showM2M,
    showRewardsFromPayout, execTimelock, findEvent, showPoolOperationsFromPayout, showPayoutEvent, transferETH,
    getWalletAddress, showProfitOnRewardWallet
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6, fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {getOdosSwapData, getOdosAmountOut, getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require('hardhat');
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');

async function main() {

    if (hre.network.name === 'arbitrum') {
        let usdPlusArb = await getContract('UsdPlusToken', 'arbitrum');
        let usdtPlusArb = await getContract('UsdPlusToken', 'arbitrum_usdt');
        let daiPlusArb = await getContract('UsdPlusToken', 'arbitrum_dai');
        let ethPlusArb = await getContract('UsdPlusToken', 'arbitrum_eth');
        console.log("Arbitrum");
        console.log("usdPlusArb", usdPlusArb.address, await getImplementationAddress(ethers.provider, usdPlusArb.address));
        console.log("usdtPlusArb", usdtPlusArb.address, await getImplementationAddress(ethers.provider, usdtPlusArb.address));
        console.log("daiPlusArb", daiPlusArb.address, await getImplementationAddress(ethers.provider, daiPlusArb.address));
        console.log("ethPlusArb", ethPlusArb.address, await getImplementationAddress(ethers.provider, ethPlusArb.address));

        let usdPlusArbEx = await getContract('Exchange', 'arbitrum');
        let usdtPlusArbEx = await getContract('Exchange', 'arbitrum_usdt');
        let daiPlusArbEx = await getContract('Exchange', 'arbitrum_dai');
        let ethPlusArbEx = await getContract('Exchange', 'arbitrum_eth');
        console.log("usdPlusArbEx", usdPlusArbEx.address, await getImplementationAddress(ethers.provider, usdPlusArbEx.address));
        console.log("usdtPlusArbEx", usdtPlusArbEx.address, await getImplementationAddress(ethers.provider, usdtPlusArbEx.address));
        console.log("daiPlusArbEx", daiPlusArbEx.address, await getImplementationAddress(ethers.provider, daiPlusArbEx.address));
        console.log("ethPlusArbEx", ethPlusArbEx.address, await getImplementationAddress(ethers.provider, ethPlusArbEx.address));

        let usdPlusArbIns = await getContract('InsuranceExchange', 'arbitrum');
        console.log("usdPlusArbIns", usdPlusArbIns.address, await getImplementationAddress(ethers.provider, usdPlusArbIns.address));

    }

    if (hre.network.name === 'optimism') {
        let usdPlusOp = await getContract('UsdPlusToken', 'optimism');
        let daiPlusOp = await getContract('UsdPlusToken', 'optimism_dai');
        console.log("Optimism");
        console.log("usdPlusOp", usdPlusOp.address, await getImplementationAddress(ethers.provider, usdPlusOp.address));
        console.log("daiPlusOp", daiPlusOp.address, await getImplementationAddress(ethers.provider, daiPlusOp.address));
    }

    if (hre.network.name === 'linea') {
        let usdPlusLinea = await getContract('UsdPlusToken', 'linea');
        let usdtPlusLinea = await getContract('UsdPlusToken', 'linea_usdt');
        console.log("Linea");
        console.log("usdPlusLinea", usdPlusLinea.address, await getImplementationAddress(ethers.provider, usdPlusLinea.address));
        console.log("usdtPlusLinea", usdtPlusLinea.address, await getImplementationAddress(ethers.provider, usdtPlusLinea.address));
    }

    if (hre.network.name === 'base') {
        let usdPlusBase = await getContract('UsdPlusToken', 'base');
        let daiPlusBase = await getContract('UsdPlusToken', 'base_dai');
        let usdcPlusBase = await getContract('UsdPlusToken', 'base_usdc');
        console.log("Base");
        console.log("usdPlusBase", usdPlusBase.address, await getImplementationAddress(ethers.provider, usdPlusBase.address));
        console.log("daiPlusBase", daiPlusBase.address, await getImplementationAddress(ethers.provider, daiPlusBase.address));
        console.log("usdcPlusBase", usdcPlusBase.address, await getImplementationAddress(ethers.provider, usdcPlusBase.address));
    }

    if (hre.network.name === 'bsc') {
        let usdPlusBsc = await getContract('UsdPlusToken', 'bsc');
        let usdtPlusBsc = await getContract('UsdPlusToken', 'bsc_usdt');
        console.log("Bsc");
        console.log("usdPlusBsc", usdPlusBsc.address, await getImplementationAddress(ethers.provider, usdPlusBsc.address));
        console.log("usdtPlusBsc", usdtPlusBsc.address, await getImplementationAddress(ethers.provider, usdtPlusBsc.address));
    }

    if (hre.network.name === 'zksync') {
        let usdPlusZksync = await getContract('UsdPlusToken', 'zksync');
        console.log("Zksync");
        console.log("usdPlusZksync", usdPlusZksync.address, await getImplementationAddress(ethers.provider, usdPlusZksync.address));
    }

    if (hre.network.name === 'polygon') {
        let usdPlusPolygon = await getContract('UsdPlusToken', 'polygon');
        console.log("Polygon");
        console.log("usdPlusPolygon", usdPlusPolygon.address, await getImplementationAddress(ethers.provider, usdPlusPolygon.address));
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
