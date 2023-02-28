const hre = require("hardhat");
const ethers = hre.ethers;
const BN = require('bn.js');
const {
    initWallet,
    getContract,
    getERC20,
    getERC20ByAddress
} = require("@overnight-contracts/common/utils/script-utils");

let BalancerFactory = require('@overnight-contracts/pools/abi/ERC4626LinearPoolFactory.json');
let Pool = require('@overnight-contracts/pools/abi/ERC4626LinearPool.json');
let Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const {toE18, toE6, fromE18, fromE6, toAsset, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const {BigNumber} = require("ethers");

const ERC4626LinearPoolAddress = "0xa3B9515A9c557455BC53F7a535A85219b59e8B2E";
const VaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const owner = "0xba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1b"; // Owner DAO Balancer

const upperTarget = new BN(10).pow(new BN(18)).muln(25000); // 25 000
const swapFee = "60000000000000000"; // 0.06%

const protocolId = 19;

async function main() {

    let wallet = await initWallet(ethers);

    let factory = await ethers.getContractAt(BalancerFactory, ERC4626LinearPoolAddress, wallet);
    let vault = await ethers.getContractAt(Vault, VaultAddress, wallet);

    await createAndTestUsdc();
    await createAndTestDai();


    async function createAndTestUsdc(){

        let usdc = await getERC20('usdc');
        let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
        let wUsdPlus = await getContract('WrappedUsdPlusToken', 'arbitrum');
        let usdPool = await createPool('USD+', usdc.address, wUsdPlus.address);

        await testPool(usdPool, usdc, usdPlus, wUsdPlus, '1000000000000000000000000000'); // Rate 1:1 USD+<->wUSD+
        await testPool(usdPool, usdc, usdPlus, wUsdPlus, '1500000000000000000000000000'); // Rate 1:1.5 USD+<->wUSD+
    }

    async function createAndTestDai(){

        let dai = await getERC20('dai');
        let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');
        let wDai = await getContract('WrappedUsdPlusToken', 'arbitrum_dai');
        let daiPool = await createPool('DAI+', dai.address, wDai.address);

        await testPool(daiPool, dai, daiPlus, wDai, '1000000000000000000000000000');
        await testPool(daiPool, dai, daiPlus, wDai, '1500000000000000000000000000');
    }


    async function createPool(pairName, asset, wrapper) {

        let tx = await (await factory.create(`Balancer Boosted ${pairName}`, `bb-${pairName}`, asset, wrapper, upperTarget.toString(), swapFee, owner, protocolId)).wait();
        const poolAddress = tx.events.find((e) => e.event == 'PoolCreated').args[0];

        let pool = await ethers.getContractAt(Pool, poolAddress, wallet);

        console.log('----');
        console.log('Name:    ' + pairName);
        console.log('address: ' + poolAddress);
        console.log('poolId:  ' + await pool.getPoolId());

        return pool;
    }

    async function testPool(pool, asset, usdPlus, wUsdPlus, liquidityIndex) {

        console.log('\n---------- [Test pool] ----------\n');

        let toAsset;
        let toPool = toE18;
        let poolId = await pool.getPoolId();
        if (await asset.decimals() === 18) {
            toAsset = toE18;
        } else {
            toAsset = toE6;
        }

        await setLiqIndex(usdPlus, '1000000000000000000000000000');

        await showBalancesByTokens([asset, usdPlus, wUsdPlus, pool]);

        let assetBalanceBefore = await asset.balanceOf(wallet.address);
        let usdPlusBalanceBefore = await usdPlus.balanceOf(wallet.address);
        let wUsdPlusBalanceBefore = await wUsdPlus.balanceOf(wallet.address);
        let poolBalanceBefore = await pool.balanceOf(wallet.address);

        // Add liquidity
        await swap(asset, pool, toAsset(1), poolId, toPool(1));
        await swap(wUsdPlus, pool, toAsset(1), poolId, toPool(1));

        await setLiqIndex(usdPlus, liquidityIndex);

        // Swap
        let expectedWrapped = await wUsdPlus.convertToShares(toAsset(1));
        let expectedAsset = await wUsdPlus.convertToAssets(expectedWrapped);

        await swap(asset, wUsdPlus, toAsset(1), poolId, expectedWrapped);
        await swap(wUsdPlus, asset, expectedWrapped, poolId, expectedAsset);

        await showBalancesByTokens([asset, usdPlus, wUsdPlus, pool]);

        await showPooBalances(pool);

        // Remove liquidity
        await unSwap(pool, asset);
        await unSwap(pool, wUsdPlus);

        await setLiqIndex(usdPlus, '1000000000000000000000000000');

        await showBalancesByTokens([asset, usdPlus, wUsdPlus, pool]);

        // After all swaps balance must be equals
        expect(assetBalanceBefore).to.equal(await asset.balanceOf(wallet.address));
        expect(usdPlusBalanceBefore).to.equal(await usdPlus.balanceOf(wallet.address));
        expect(wUsdPlusBalanceBefore).to.equal(await wUsdPlus.balanceOf(wallet.address));
        expect(poolBalanceBefore).to.equal(await pool.balanceOf(wallet.address));

    }

    async function setLiqIndex(usdPlus, liquidityIndex){

        let exchanger = await usdPlus.exchange();
        await (await usdPlus.setExchanger(wallet.address)).wait();
        await (await usdPlus.setLiquidityIndex(liquidityIndex)).wait();
        await (await usdPlus.setExchanger(exchanger)).wait();
        console.log('Update liquidity index');
    }


    async function showPooBalances(pool) {
        let poolId = await pool.getPoolId();

        let targets = await pool.getTargets();
        let balances = await vault.getPoolTokens(poolId);

        // console.log('--- User ---');
        // await showBalances();
        //
        // console.log('--- Pool ---');
        // console.log(`Targets: lower: ${targets[0].toString()} upper: ${targets[1].toString()}`);

        console.table([
            await showTokenAmount(balances[0][0], balances[1][0]),
            await showTokenAmount(balances[0][1], balances[1][1]),
            await showTokenAmount(balances[0][2], balances[1][2])
        ])
    }

    async function swap(tokenIn, tokenOut, amount, poolId, increaseAmount) {


        let amountInExpected = await tokenIn.balanceOf(wallet.address);
        amountInExpected = amountInExpected.sub(BigNumber.from(amount));

        let amountOutExpected = await tokenOut.balanceOf(wallet.address);
        amountOutExpected = amountOutExpected.add(BigNumber.from(increaseAmount));

        console.log(`Swap ${await tokenIn.symbol()}:${amount} -> ${await tokenOut.symbol()}:${increaseAmount}`);

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
                sender: wallet.address,
                fromInternalBalance: false,
                recipient: wallet.address,
                toInternalBalance: false,
            },
            0,
            1000000000000
        )).wait();


        expect(amountInExpected).to.equal(await tokenIn.balanceOf(wallet.address));
        expect(amountOutExpected).to.equal(await tokenOut.balanceOf(wallet.address));
    }

    async function unSwap(pool, tokenOut) {

        await pool.approve(vault.address, await pool.balanceOf(wallet.address));
        let tokenInfo = await vault.getPoolTokenInfo(await pool.getPoolId(), tokenOut.address);

        await vault.swap(
            {
                poolId: await pool.getPoolId(),
                kind: 1,
                assetIn: pool.address,
                assetOut: tokenOut.address,
                amount: tokenInfo[0],
                userData: "0x",
            },
            {
                sender: wallet.address,
                fromInternalBalance: false,
                recipient: wallet.address,
                toInternalBalance: false,
            },
            new BN(10).pow(new BN(27)).toString(),
            new BN(10).pow(new BN(27)).toString()
        );
    }



    async function showBalancesByTokens(tokens){

        let items = [];

        for (const token of tokens) {

            let fromAsset;
            if (await token.decimals() === 18) {
                fromAsset = fromE18;
            } else {
                fromAsset = fromE6;
            }

            items.push({
                symbol: await token.symbol(),
                balance: fromAsset(await token.balanceOf(wallet.address))
            })
        }

        console.table(items);
    }

}



async function showBalances() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let daiPus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let wUsdPlus = await getContract('WrappedUsdPlusToken', 'arbitrum');
    let wDai = await getContract('WrappedUsdPlusToken', 'arbitrum_dai');

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
            amount: fromE18(await daiPus.balanceOf(wallet.address))
        },
        {
            name: 'wUSD+',
            amount: fromE6(await wUsdPlus.balanceOf(wallet.address))
        },
        {
            name: 'wDAI+',
            amount: fromE18(await wDai.balanceOf(wallet.address))
        }
    ]

    console.table(arrays);

}

async function showBalancesPair(isDai) {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let daiPus = await getContract('UsdPlusToken', 'arbitrum_dai');

    let wUsdPlus = await getContract('WrappedUsdPlusToken', 'arbitrum');
    let wDai = await getContract('WrappedUsdPlusToken', 'arbitrum_dai');

    let usdc = await getERC20('usdc');
    let dai = await getERC20('dai');


    let arrays = [];
    if (isDai) {

        arrays.push({
            name: 'DAI',
            amount: fromE18(await dai.balanceOf(wallet.address))
        })

        arrays.push({
            name: 'DAI+',
            amount: fromE18(await daiPus.balanceOf(wallet.address))
        })

        arrays.push({
            name: 'wDAI+',
            amount: fromE18(await wDai.balanceOf(wallet.address))
        })
    } else {
        arrays = [
            {
                name: 'USDC',
                amount: fromE6(await usdc.balanceOf(wallet.address))
            },
            {
                name: 'USD+',
                amount: fromE6(await usdPlus.balanceOf(wallet.address))
            },
            {
                name: 'wUSD+',
                amount: fromE6(await wUsdPlus.balanceOf(wallet.address))
            },
        ]

    }


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


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
