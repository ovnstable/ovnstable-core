const hre = require("hardhat");
const {waffle} = require("hardhat");
const {
    getAbi,
    getContract,
    getERC20,
    impersonateAccount,
    transferUSDC,
    transferETH,
    getERC20ByAddress,
    initWallet, execTimelock
} = require("@overnight-contracts/common/utils/script-utils");
const {expect} = require("chai");
const {sharedBeforeEach} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const fs = require("fs");
const {deployContract, deployMockContract, provider} = waffle;
const chai = require("chai");
const {deployments, ethers, getNamedAccounts} = require('hardhat');
const {toE6, fromE6, fromE18, toE18} = require("@overnight-contracts/common/utils/decimals");
const {expectRevert} = require("@openzeppelin/test-helpers");
chai.use(require('chai-bignumber')());

/**
 * This test working on blockNumber: 33061177
 */

describe("RebalancerPlus", function () {

    let rebalancerPlus;
    let deployer;

    let vault;
    let pool;

    let usdPlus;
    let usdc;
    let wUsdPlus;
    let exchange;
    let poolId;

    sharedBeforeEach("deploy contracts", async () => {
        await hre.run("compile");

        await deployments.fixture(['BeethovenxUsdPlus']);
        [deployer] = provider.getWallets();

        usdPlus = (await getContract('UsdPlusToken')).connect(deployer);
        exchange = (await getContract('Exchange')).connect(deployer);
        usdc = (await getERC20('usdc')).connect(deployer);
        wUsdPlus = (await getContract('WrappedUsdPlusToken')).connect(deployer);

        rebalancerPlus = (await ethers.getContract('RebalancerPlus')).connect(deployer);

        vault = await ethers.getContractAt(await getAbi('IVault'), "0xBA12222222228d8Ba445958a75a0704d566BF2C8", deployer);
        pool = await ethers.getContractAt(await getAbi('LinearPool'), "0x88D07558470484c03d3bb44c3ECc36CAfCF43253", deployer);
        poolId = await pool.getPoolId();

        await setUpLinearPool();
    });


    describe("Rebalance", function () {

        sharedBeforeEach("Rebalance", async () => {

        });

        // it("Already in range and no desired balance specified", async function () {
        //     await expectRevert(rebalancerPlus.approveAmountRequirement(pool.address, 0), 'Already in range and no desired balance specified');
        // });
        //
        // it("rebalance: LowerTarget [1k]", async function () {
        //
        //     await swap(wUsdPlus, usdc, toE6(1000), poolId);
        //
        //     expect(8970594072).to.equal( await getMainTokenBalance(pool));
        //     let balanceUsdcBefore = await usdc.balanceOf(deployer.address);
        //     let amount = await rebalancerPlus.approveAmountRequirement(pool.address, 0);
        //     expect(1029405928).to.equal(amount[0]);
        //
        //     await rebalancerPlus.rebalance(pool.address, 0, true);
        //
        //     await expectRevert(rebalancerPlus.approveAmountRequirement(pool.address, 0), 'Already in range and no desired balance specified');
        //     let balanceUsdcAfter = await usdc.balanceOf(deployer.address);
        //     expect(51468).to.equal(balanceUsdcAfter.sub(balanceUsdcBefore).toNumber());
        //     expect(10000000000).to.equal( await getMainTokenBalance(pool));
        //
        // });
        //
        // it("rebalance: LowerTarget [5k]", async function () {
        //
        //     await swap(wUsdPlus, usdc, toE6(5000), poolId);
        //
        //     expect(4848828200).to.equal( await getMainTokenBalance(pool));
        //     let balanceUsdcBefore = await usdc.balanceOf(deployer.address);
        //     let amount = await rebalancerPlus.approveAmountRequirement(pool.address, 0);
        //     expect(5151171800).to.equal(amount[0]);
        //
        //     await rebalancerPlus.rebalance(pool.address, 0, true);
        //
        //     await expectRevert(rebalancerPlus.approveAmountRequirement(pool.address, 0), 'Already in range and no desired balance specified');
        //     let balanceUsdcAfter = await usdc.balanceOf(deployer.address);
        //     expect(257557).to.equal(balanceUsdcAfter.sub(balanceUsdcBefore).toNumber());
        //     expect(10000000000).to.equal( await getMainTokenBalance(pool));
        //
        // });


        it("rebalance: UpperTarget [1k]", async function () {

            await swap(usdc, wUsdPlus, toE6(11000), poolId);

            console.log(await getMainTokenBalance(pool));
            // expect(8970594072).to.equal( await getMainTokenBalance(pool));
            let balanceUsdcBefore = await usdc.balanceOf(deployer.address);
            let amount = await rebalancerPlus.approveAmountRequirement(pool.address, 0);
            console.log(amount[0]);
            // expect(1029405928).to.equal(amount[0]);

            await rebalancerPlus.rebalance(pool.address, 0, true);

            await expectRevert(rebalancerPlus.approveAmountRequirement(pool.address, 0), 'Already in range and no desired balance specified');
            let balanceUsdcAfter = await usdc.balanceOf(deployer.address);
            console.log(balanceUsdcAfter.sub(balanceUsdcBefore).toNumber());
            console.log(await getMainTokenBalance(pool));
            // expect(51468).to.equal(balanceUsdcAfter.sub(balanceUsdcBefore).toNumber());
            // expect(10000000000).to.equal( await getMainTokenBalance(pool));

        });

    });

    async function setUpLinearPool() {

        await transferUSDC(10, deployer.address);
        await transferETH(10, deployer.address);

        await mintUsdPlus(toE6(50000));

        await showBalances();

        await swap(usdc, pool, toE6(10000), poolId);
        await swap(wUsdPlus, pool, toE6(15000), poolId);

        let owner = await impersonateAccount(await pool.getOwner());

        await showPooBalances(pool);

        await transferETH(10, owner.address);

        await pool.connect(owner).setTargets(toE18(10000), toE18(20000));

        await execTimelock(async (timelock)=>{
            await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), rebalancerPlus.address);
        });
    }

    async function mintUsdPlus(amount) {

        let mintParams = {
            asset: usdc.address,
            amount: amount,
            referral: ''
        }

        await usdc.approve(exchange.address, amount);
        await exchange.mint(mintParams);

        amount = await usdPlus.balanceOf(deployer.address);
        await usdPlus.approve(wUsdPlus.address, amount);
        await wUsdPlus.deposit(amount, deployer.address);
    }

    async function getMainTokenBalance(pool){

        let balances = await vault.getPoolTokens(poolId);

        return balances[1][0];
    }

    async function showPooBalances(pool) {

        let targets = await pool.getTargets();
        let balances = await vault.getPoolTokens(poolId);

        console.log('--- User ---');
        await showBalances();

        console.log('--- Pool ---');
        console.log(`Targets: lower: ${targets[0].toString()} upper: ${targets[1].toString()}`);

        console.table([
            await showTokenAmount(balances[0][0], balances[1][0]),
            await showTokenAmount(balances[0][1], balances[1][1]),
            await showTokenAmount(balances[0][2], balances[1][2])
        ])
    }

    async function showBalances() {

        let wallet = deployer;

        let usdPlus = await getContract('UsdPlusToken', 'optimism');
        let daiPus = await getContract('UsdPlusToken', 'optimism_dai');

        let wUsdPlus = await getContract('WrappedUsdPlusToken', 'optimism');
        let wDai = await getContract('WrappedUsdPlusToken', 'optimism_dai');

        let usdc = await getERC20('usdc');
        let dai = await getERC20('dai');

        let arrays = [
            {
                name: 'USDC',
                amount: fromE6(await usdc.balanceOf(wallet.address))
            },

            {
                name: 'USD+',
                amount: fromE6(await usdPlus.balanceOf(wallet.address))
            },
            {
                name: 'DAI',
                amount: fromE18(await dai.balanceOf(wallet.address))
            },
            {
                name: 'DAI+',
                amount: fromE6(await daiPus.balanceOf(wallet.address))
            },
            {
                name: 'wUSD+',
                amount: fromE6(await wUsdPlus.balanceOf(wallet.address))
            },
            {
                name: 'wDAI+',
                amount: fromE6(await wDai.balanceOf(wallet.address))
            }
        ]

        console.table(arrays);

    }


    async function showTokenAmount(address, amount) {

        let token = await getERC20ByAddress(address);

        let fromAsset;
        if (await token.decimals() === 18) {
            fromAsset = fromE18;
        } else {
            fromAsset = fromE6;
        }

        return {
            name: await token.symbol(),
            amount: fromAsset(amount)
        }
    }


    async function swap(tokenIn, tokenOut, amount, poolId) {

        console.log('Swap')
        await (await tokenIn.approve(vault.address, amount)).wait();

        await (await vault.swap(
            {
                poolId: poolId,
                kind: 0,
                assetIn: tokenIn.address,
                assetOut: tokenOut.address,
                amount: amount,
                userData: "0x",
            },
            {
                sender: deployer.address,
                fromInternalBalance: false,
                recipient: deployer.address,
                toInternalBalance: false,
            },
            0,
            1000000000000
        )).wait();
    }

});
