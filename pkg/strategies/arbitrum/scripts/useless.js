const {
    getContract,
    showM2M,
    execTimelock,
    getERC20ByAddress,
    initWallet,
    transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const { fromE18, toE6, toE18, fromE6, fromAsset } = require("@overnight-contracts/common/utils/decimals");
const { ARBITRUM, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { ethers } = require("hardhat");

async function main() {
    let wallet = await initWallet();
    await transferETH(10, wallet.address);

    let strategy = await getContract('StrategySiloUsdcArb', 'arbitrum');

    // console.log(await strategy.siloToken())
    // console.log(await strategy.siloTower())
    // console.log(await strategy.inchSwapper())
    // console.log(await strategy.assetDm())
    // console.log(await strategy.underlyingAsset())
    // console.log(await strategy.underlyingAssetDm())

    console.log('NAV: ' + await strategy.netAssetValue());
    // console.log('LIQ: ' + fromAsset(await strategy.liquidationValue()));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

