const hre = require("hardhat");
const {deployments, getNamedAccounts, ethers} = require("hardhat");
const {resetHardhat, greatLess} = require("./tests");
const ERC20 = require("./abi/IERC20.json");
const {logStrategyGasUsage} = require("./strategyCommon");
const {toUSDC, fromUSDC} = require("./decimals");
const {expect} = require("chai");

function strategyTest(strategyName, network, assets) {

    describe(`${strategyName}`, function () {

        describe(`Stake/unstake`, function () {

            let account;
            let strategy;
            let usdc;

            before(async () => {
                await hre.run("compile");
                await resetHardhat(network);

                await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

                const {deployer} = await getNamedAccounts();
                account = deployer;

                strategy = await ethers.getContract(strategyName);
                await strategy.setPortfolioManager(account);

                usdc = await ethers.getContractAt(ERC20, assets.usdc);
            });

            it("log gas", async () => {
                await logStrategyGasUsage(strategyName, strategy, usdc, account)
            });

            describe("Stake 50000 + 50000 USDC", function () {

                let balanceUsdc;

                before(async () => {

                    let balanceUsdcBefore = await usdc.balanceOf(account);

                    await usdc.transfer(strategy.address, toUSDC(50000));
                    await strategy.stake(usdc.address, toUSDC(50000));

                    await usdc.transfer(strategy.address, toUSDC(50000));
                    await strategy.stake(usdc.address, toUSDC(50000));

                    let balanceUsdcAfter = await usdc.balanceOf(account);

                    balanceUsdc = fromUSDC(balanceUsdcBefore - balanceUsdcAfter);

                });

                it("Balance USDC should be greater than 99000 less than 101000", async function () {
                    greatLess(balanceUsdc, 100000, 1000);
                });

                it("NetAssetValue USDC should be greater than 99000 less than 101000", async function () {
                    greatLess(fromUSDC(await strategy.netAssetValue()), 100000, 1000);
                });

                it("LiquidationValue USDC should be greater than 99000 less than 101000", async function () {
                    greatLess(fromUSDC(await strategy.liquidationValue()), 100000, 1000);
                });

                describe("Unstake 25000 + 25000 USDC", function () {

                    let balanceUsdc;

                    before(async () => {

                        let balanceUsdcBefore = await usdc.balanceOf(account);

                        await strategy.unstake(usdc.address, toUSDC(25000), account, false);
                        await strategy.unstake(usdc.address, toUSDC(25000), account, false);

                        let balanceUsdcAfter = await usdc.balanceOf(account);

                        balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                    });

                    it("Balance USDC should be greater than 49000 less than 51000", async function () {
                        greatLess(balanceUsdc, 50000, 1000);
                    });

                    it("NetAssetValue USDC should be greater than 49000 less than 51000", async function () {
                        greatLess(fromUSDC(await strategy.netAssetValue()), 50000, 1000);
                    });

                    it("LiquidationValue USDC should be greater than 49000 less than 51000", async function () {
                        greatLess(fromUSDC(await strategy.liquidationValue()), 50000, 1000);
                    });

                    describe("Unstake Full", function () {

                        let balanceUsdc;

                        before(async () => {

                            let balanceUsdcBefore = await usdc.balanceOf(account);

                            await strategy.unstake(usdc.address, 0, account, true);

                            let balanceUsdcAfter = await usdc.balanceOf(account);

                            balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);

                        });

                        it("Balance USDC should be greater than 49000 less than 51000", async function () {
                            greatLess(balanceUsdc, 50000, 1000);
                        });

                        it("NetAssetValue USDC should be greater than 0 less than 1000", async function () {
                            greatLess(fromUSDC(await strategy.netAssetValue()), 500, 500);
                        });

                        it("LiquidationValue USDC should be greater than 0 less than 1000", async function () {
                            greatLess(fromUSDC(await strategy.liquidationValue()), 500, 500);
                        });

                    });

                });

            });

        });

        describe(`ClaimRewards`, function () {

            let account;
            let strategy;
            let usdc;

            before(async () => {
                await resetHardhat(network);

                await deployments.fixture([strategyName, `${strategyName}Setting`, 'test']);

                const {deployer} = await getNamedAccounts();
                account = deployer;

                strategy = await ethers.getContract(strategyName);
                await strategy.setPortfolioManager(account);

                usdc = await ethers.getContractAt(ERC20, assets.usdc);
            });

            describe("Stake 100000 USDC. Claim rewards", function () {

                let balanceUsdc;

                before(async () => {

                    await usdc.transfer(strategy.address, toUSDC(100000));
                    await strategy.stake(usdc.address, toUSDC(100000));

                    // timeout 7 days
                    const sevenDays = 7 * 24 * 60 * 60;
                    await ethers.provider.send("evm_increaseTime", [sevenDays])
                    await ethers.provider.send('evm_mine');

                    let balanceUsdcBefore = await usdc.balanceOf(account);
                    await strategy.claimRewards(account);
                    let balanceUsdcAfter = await usdc.balanceOf(account);

                    balanceUsdc = fromUSDC(balanceUsdcAfter - balanceUsdcBefore);
                    console.log("Rewards: " + balanceUsdc);
                });

                it("Rewards should be greater 0 USDC", async function () {
                    expect(balanceUsdc).to.greaterThan(0);
                });

            });

        });

    });

}

module.exports = {
    strategyTest: strategyTest,
}
