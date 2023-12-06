const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH, getERC20ByAddress, transferAsset
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
const {createRandomWallet, prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");

module.exports = async ({deployments}) => {


    let wallet = await initWallet();

    await transferETH(1, wallet.address);

    let testWallet = await createRandomWallet();

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let wrapped = await getContract('WrappedUsdPlusToken');
    let roleManager = await getContract('RoleManager');
    let market = await getContract('Market');


    await transferAsset(ARBITRUM.weth, wallet.address);
    await prepareEnvironment();

    await execTimelock(async (timelock) => {
        let roleManager = await getContract('RoleManager');
        await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await exchange.connect(timelock).unpause();
        await wrapped.connect(timelock).unpause();
        await usdPlus.connect(timelock).unpause();

        await roleManager.connect(timelock).grantRole(Roles.FREE_RIDER_ROLE, wallet.address);
    })

    console.log(`HasRole: FREE_RIDER_ROLE: ${await roleManager.hasRole(Roles.FREE_RIDER_ROLE, wallet.address)}`);
    let amount = '1000000000000000000'

    let assetAddress = await exchange.usdc();

    let asset = await getERC20ByAddress(assetAddress);

    await asset.approve(exchange.address, amount);
    await exchange.buy(asset.address, amount);

    await creditBalance('check credit balance');

    await balance('before buy');

    await asset.approve(exchange.address, amount);
    await exchange.buy(asset.address, amount);

    await balance('after buy');

    await usdPlus.approve(exchange.address, amount);
    await exchange.redeem(asset.address, amount);

    await balance('after redeem');

    await asset.approve(exchange.address, amount);
    await exchange.buy(asset.address, amount);

    await balanceWrapped('before buy wrapped');
    await (await usdPlus.approve(market.address, amount)).wait();
    await (await market.wrap(usdPlus.address, amount, wallet.address)).wait();

    await balanceWrapped('after buy wrapped');

    let amountToRedeem = await wrapped.convertToShares(amount);
    await (await wrapped.approve(market.address, amountToRedeem)).wait();
    await (await market.unwrap(usdPlus.address, amountToRedeem, wallet.address)).wait();

    await balanceWrapped('after redeem wrapped');

    await balance('before transfer');
    await usdPlus.transfer(testWallet.address, amount);
    await balance('after transfer');
    await usdPlus.connect(testWallet).transfer(wallet.address, amount);
    await balance('after return transfer');

    await showM2M();
    await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60);
    await exchange.payout(false, await getEmptyOdosData());
    await showM2M();

    await balance('after payout');

    async function balanceWrapped(label){
        console.log(label)
        console.log('totalSupply:       ' + await wrapped.totalSupply());
        console.log('wUSD+:             ' + await wrapped.balanceOf((wallet.address)));
        console.log('USD+:              ' + await usdPlus.balanceOf((wallet.address)));
    }

    async function balance(label){
        console.log(label);

        console.log(`totalSupply:       ${await usdPlus.totalSupply()}`);
        console.log(`totalSupplyOwners: ${await usdPlus.totalSupplyOwners()}`);
        console.log(`USD+ balance:      ${await usdPlus.balanceOf(wallet.address)}`);
    }

    async function creditBalance(label){
        console.log(label);

        console.log(`exact param:       ${await usdPlus.rebasingCreditsHighres()}`);
        let totalSupply = await usdPlus.totalSupply();
        let newLiqIndx = await usdPlus.rebasingCreditsPerTokenHighres();
        let newCredit = totalSupply.mul(newLiqIndx).div('1000000000000000000');
        console.log(`calc param:        ${newCredit}`);
    }



};


module.exports.tags = ['EmulateTest'];
