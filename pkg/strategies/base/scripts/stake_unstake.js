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

    let wallet = await initWallet();

    let strategy = await getContract('StrategyAerodromeUsdc', 'base_usdc');
    let pm = await getContract('PortfolioManager', "base_usdc");
    let roleManager = await getContract('RoleManager', "base_usdc");
    let usdc = await getERC20ByAddress(BASE.usdc);

    // await (await strategy.setStrategyParams(wallet.address, roleManager.address)).wait();

    // await usdc.connect(wallet).transfer(strategy.address, toE6(1));

    // console.log((await strategy.swapRouter()).toString());
    // console.log((await strategy.netAssetValue()).toString());

    // await strategy.stake(BASE.usdc, toE6(1));
    // console.log((await strategy.netAssetValue()).toString());

    // await strategy.unstake(BASE.usdc, 0, wallet.address, true);
    // console.log((await strategy.netAssetValue()).toString());

    await (await strategy.setStrategyParams(pm.address, roleManager.address)).wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

