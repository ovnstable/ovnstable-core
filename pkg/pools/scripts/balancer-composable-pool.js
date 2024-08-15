const hre = require("hardhat");
const ethers = hre.ethers;
const BN = require('bn.js');
const {
    initWallet, getContract, getERC20,

} = require("@overnight-contracts/common/utils/script-utils");

let BalancerFactory = require('@overnight-contracts/pools/abi/ComposableStablePoolFactory.json');
let Pool = require('@overnight-contracts/pools/abi/ComposableStablePool.json');

let Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const {BSC} = require("@overnight-contracts/common/utils/assets");
const {toE18, toE6, fromE18, fromE6, toAsset, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");

let Factory = "0x7bc6C0E73EDAa66eF3F6E2f27b0EE8661834c6C9";
let VaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

const owner = "0xba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1ba1b"; // Owner DAO Balancer

const usdPlusLinearPool = "0x284EB68520C8fA83361C1A3a5910aEC7f873C18b";
const daiPlusLinearPool = "0x117a3d474976274B37B7b94aF5DcAde5c90C6e85";

async function main() {

    let wallet = await initWallet(ethers);

    let usdPool = await ethers.getContractAt(Pool, usdPlusLinearPool, wallet);
    let daiPool = await ethers.getContractAt(Pool, daiPlusLinearPool, wallet);

    let poolAddress = await createStablePool(wallet);

    console.log('PoolAddress: ' + poolAddress);

    await initPool(poolAddress, wallet);
    // await test(wallet);


    async function test(wallet){

        await showBalances();

        let stablePool = await ethers.getContractAt(Pool, poolAddress, wallet);
        let vault = await ethers.getContractAt(Vault, VaultAddress, wallet);



        let usdPoolBalanceBefore = fromE18(await usdPool.balanceOf(wallet.address));
        let daiPoolBalanceBefore = fromE18(await daiPool.balanceOf(wallet.address));
        let stableBalanceBefore = fromE18(await stablePool.balanceOf(wallet.address));

        await swap(stablePool, usdPool, toE18(0.5));
        await swap(stablePool, daiPool, toE18(0.5));

        await swap(usdPool, daiPool, toE18(0.5));
        await swap(daiPool, usdPool, toE18(0.5));

        await swap(usdPool, stablePool, toE18(0.5));
        await swap(daiPool, stablePool, toE18(0.5));

        await showBalances();


        // After all swaps balance must be equals
        expect(usdPoolBalanceBefore).to.equal(fromE18(await usdPool.balanceOf(wallet.address)));
        expect(daiPoolBalanceBefore).to.equal(fromE18(await daiPool.balanceOf(wallet.address)));
        expect(stableBalanceBefore).to.equal(fromE18(await stablePool.balanceOf(wallet.address)));

        async function swap(tokenIn, tokenOut, amount) {

            console.log(`[Swap ${await tokenIn.symbol()}:${fromE18(amount)} to ${await tokenOut.symbol()}] ...`);

            await tokenIn.approve(vault.address, amount);
            await vault.swap(
                {
                    poolId: await stablePool.getPoolId(),
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
            );

        }

    }

    async function initPool(poolAddress, wallet) {

        let stablePool = await ethers.getContractAt(Pool, poolAddress, wallet);
        let vault = await ethers.getContractAt(Vault, VaultAddress, wallet);

        console.log('[Init Stable pool] ...');
        console.log("stablePool.totalSupply: " + await stablePool.totalSupply());

        await showBalances();


        let {tokens, initAmountsIn} = await makeInitialBalances(vault, stablePool);

        // Same to (['uint256', 'uint256[]'], [StablePoolJoinKind.INIT, amountsIn]);
        let userData = ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]'], [0, initAmountsIn]);
        console.log(`userData: ${userData}`);

        await (await usdPool.approve(vault.address, toE18(1))).wait();
        await (await daiPool.approve(vault.address, toE18(1))).wait();
        console.log("Vault approved");

        let uint256Max = new BN(2).pow(new BN(256)).subn(1).toString(); // type(uint256).max

        console.log("Before stable joinPool")
        await (await vault.joinPool(
            await stablePool.getPoolId(),
            wallet.address,
            wallet.address,
            {
                assets: tokens,
                maxAmountsIn: [uint256Max, uint256Max, uint256Max ],
                userData: userData,
                fromInternalBalance: false
            },
        )).wait();
        console.log("joinPool done")

        await showBalances();
    }

    async function makeInitialBalances(vault, pool) {

        const {tokens, balances} = await vault.getPoolTokens(await pool.getPoolId());

        console.log('Init balances:')

        let initAmountsIn = []

        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];

            let name = "";
            switch (token.toLowerCase()) {
                case usdPlusLinearPool.toLowerCase():
                    name = "bb-USD+";
                    initAmountsIn[i] = toE18(2);
                    break
                case daiPlusLinearPool.toLowerCase():
                    name = "bb-DAI+";
                    initAmountsIn[i] = toE18(2);
                    break
                default:
                    name = "Stable LP  ";
                    initAmountsIn[i] = "9000000000000000000";
                    break
            }

            console.log(`- ${name}: ${initAmountsIn[i]}`);
        }

        console.log(`- tokens array: ${tokens}`);
        console.log(`- initAmountsIn array: ${initAmountsIn}`);
        console.log(`------------------------------------`);

        return {
            tokens: tokens,
            initAmountsIn: initAmountsIn
        };
    }

    async function createStablePool(wallet) {

        let factory = await ethers.getContractAt(BalancerFactory, Factory, wallet);

        let tokens = [usdPlusLinearPool, daiPlusLinearPool];

        tokens.sort((tokenA, tokenB) => (tokenA.toLowerCase() > tokenB.toLowerCase() ? 1 : -1));

        let rateProviders = tokens;

        let tokenRateCacheDurations = [1800, 1800];

        console.log(tokens);
        console.log(rateProviders);
        console.log(tokenRateCacheDurations);

        let amplificationParameter = "570";
        let swapFee = "100000000000000"; // 0.01%

        let promise = await factory.create(
            'Overnight Pulse',
            'BPT-USD+',
            tokens,
            amplificationParameter.toString(),
            rateProviders,
            tokenRateCacheDurations,
            [false, false],
            swapFee,
            owner,
        );


        let tx = await promise.wait();
        const poolAddress = tx.events.find((e) => e.event == 'PoolCreated').args[0];

        console.log('[Created ComposableStable Pool] => ' + poolAddress);

        return poolAddress;

    }

    async function showBalances(){

        let wallet = await initWallet();

        let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
        let daiPus = await getContract('UsdPlusToken', 'arbitrum_dai');

        let wUsdPlus = await getContract('WrappedUsdPlusToken', 'arbitrum');
        let wDai = await getContract('WrappedUsdPlusToken', 'arbitrum_dai');

        let usdPool = await ethers.getContractAt(Pool, usdPlusLinearPool, wallet);
        let daiPool = await ethers.getContractAt(Pool, daiPlusLinearPool, wallet);
        let stablePool = await ethers.getContractAt(Pool, poolAddress, wallet);

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
            },
            {
                name: 'bb-DAI+',
                amount: fromE18(await daiPool.balanceOf(wallet.address))
            },
            {
                name: 'bb-USD+',
                amount: fromE18(await usdPool.balanceOf(wallet.address))
            },
            {
                name: 'BPT-USD+',
                amount: fromE18(await stablePool.balanceOf(wallet.address))
            }
        ]

        console.table(arrays);

    }
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
