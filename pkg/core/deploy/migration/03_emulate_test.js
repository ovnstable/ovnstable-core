const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH, getERC20ByAddress
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset, toE6, toAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {BigNumber} = require("ethers");

module.exports = async ({deployments}) => {


    let wallet = await initWallet();
    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');

    let factory = await ethers.getContractFactory('UsdPlusToken');
    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address);

    await exchange.unpause();
    await usdPlus.unpause();

    let assetAddress = await exchange.usdc();

    let asset = await getERC20ByAddress(assetAddress);

    await balance('before buy');

    await asset.approve(exchange.address, toAsset(1));
    await exchange.buy(asset.address, toAsset(1));

    await balance('after buy');

    await usdPlus.approve(exchange.address, toAsset(1));
    await exchange.redeem(asset.address, toAsset(1));

    await balance('after redeem');

    async function balance(label){
        console.log(label);

        console.log(`totalSupply:       ${await usdPlus.totalSupply()}`);
        console.log(`USD+ balance:      ${await usdPlus.balanceOf(wallet.address)}`);
    }




};


module.exports.tags = ['EmulateTest'];
