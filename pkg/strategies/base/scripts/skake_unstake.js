const {
    getContract,
    showM2M,
    execTimelock,
    getERC20ByAddress,
    initWallet
} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6, toE18, fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {ethers} = require("hardhat");

async function main() {

    let strategy = await getContract('StrategyMoonwell', 'base');

    let usdc = await getERC20ByAddress(BASE.usdc);

    // await usdc.transfer(strategy.address, "2000000");

    console.log((await strategy.netAssetValue()).toString());
    // await strategy.stake(BASE.usdc, "2000000");
    // await strategy.unstake(BASE.usdc, "1000000", "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9", false);
    // console.log((await strategy.netAssetValue()).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

