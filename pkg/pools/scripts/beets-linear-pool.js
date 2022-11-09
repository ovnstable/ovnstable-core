const hre = require("hardhat");
const ethers = hre.ethers;
const BN = require('bn.js');
const {
    initWallet,
    getContract,
    getCoreAsset,
    getERC20,
    transferUSDPlus,
    execTimelock, getERC20ByAddress
} = require("@overnight-contracts/common/utils/script-utils");

let BalancerFactory = require('@overnight-contracts/pools/abi/ERC4626LinearPoolFactory.json');
let Pool = require('@overnight-contracts/pools/abi/ERC4626LinearPool.json');
let Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const {BSC} = require("@overnight-contracts/common/utils/assets");
const {toE18, toE6, fromE18, fromE6, toAsset, fromAsset} = require("@overnight-contracts/common/utils/decimals");

let ERC4626LinearPoolAddress = "0x4C4287b07d293E361281bCeEe8715c8CDeB64E34";
let VaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let owner = "0xd9e2889ac8c6fff8e94c7c1beeade1352df1a513"; // Owner Beets

let upperTarget = new BN(10).pow(new BN(18)).muln(25000); // 25 000
let swapFee = "60000000000000000"; // 0.06%

async function main() {

    let wallet = await initWallet(ethers);

    let factory = await ethers.getContractAt(BalancerFactory, ERC4626LinearPoolAddress, wallet);
    let vault = await ethers.getContractAt(Vault, VaultAddress, wallet);

    let usdc = await getERC20('usdc');
    let dai = await getERC20('dai');

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPus = await getContract('UsdPlusToken', 'optimism_dai');

    let wUsdPlus = await getContract('WrappedUsdPlusToken', 'optimism');
    let wDai = await getContract('WrappedUsdPlusToken', 'optimism_dai');


    // 0x88D07558470484c03d3bb44c3ECc36CAfCF43253
    // let usdPool = await createPool('USD+', usdc.address, wUsdPlus.address);
    // await testPool(usdPool, usdc, usdPlus, wUsdPlus);

    await (await daiPus.approve(wDai.address, toE18(1))).wait();
    await (await wDai.deposit(toE18(1), wallet.address)).wait();

    let daiBalanceBefore = fromE18(await dai.balanceOf(wallet.address));
    let wDaiBalanceBefore = fromE18(await wDai.balanceOf(wallet.address));
    let daiPlusBalanceBefore = fromE18(await daiPus.balanceOf(wallet.address));

    // 0xb5ad7d6d6F92a77F47f98C28C84893FBccc94809
    // let daiPool = await createPool('DAI+', dai.address, wDai.address);
    // await testPool(daiPool, dai, daiPus, wDai);

    let daiBalanceAfter = fromE18(await dai.balanceOf(wallet.address));
    let wDaiBalanceAfter = fromE18(await wDai.balanceOf(wallet.address));
    let daiPlusBalanceAfter = fromE18(await daiPus.balanceOf(wallet.address));


    let pool = await ethers.getContractAt(Pool, '0xb5ad7d6d6F92a77F47f98C28C84893FBccc94809', wallet);
    let poolId = await pool.getPoolId();

    await showPooBalances(pool);


    // console.log('Unswap ' + await dai.symbol());
    // await unSwap(pool, dai);
    // console.log('Unswap ' + await wDai.symbol());
    // await unSwap(pool, wDai);
    //
    // await showPooBalances(pool);

    // console.table([
    //     {
    //         name: await  dai.symbol(),
    //         before: daiBalanceBefore,
    //         after: daiBalanceAfter,
    //         diff: daiBalanceBefore - daiBalanceAfter
    //     },
    //     {
    //         name: await  wDai.symbol(),
    //         before: wDaiBalanceBefore,
    //         after: wDaiBalanceAfter,
    //         diff: wDaiBalanceBefore - wDaiBalanceAfter
    //     },
    //     {
    //         name: await  daiPus.symbol(),
    //         before: daiPlusBalanceBefore,
    //         after: daiPlusBalanceAfter,
    //         diff: daiPlusBalanceBefore - daiPlusBalanceAfter
    //     }
    // ])


    async function createPool(pairName, asset, wrapper) {

        let tx = await (await factory.create(`Beets Boosted ${pairName}`, `bb-${pairName}`, asset, wrapper, upperTarget.toString(), swapFee, owner)).wait();
        const poolAddress = tx.events.find((e) => e.event == 'PoolCreated').args[0];

        let pool = await ethers.getContractAt(Pool, poolAddress, wallet);

        console.log('----');
        console.log('Name:    ' + pairName);
        console.log('address: ' + poolAddress);
        console.log('poolId:  ' + await pool.getPoolId());

        return pool;
    }

    async function testPool(pool, asset, usdPlus, wUsdPlus) {

        // await showPooBalances(pool);

        let toAsset;
        if (await asset.decimals() === 18){
            toAsset = toE18;
        }else {
            toAsset = toE6;
        }

        console.log('Put ' + await asset.symbol());
        await swap(asset, pool, toAsset(1), await pool.getPoolId());
        console.log('Put ' + await usdPlus.symbol());
        await swap(wUsdPlus, pool, toAsset(1), await pool.getPoolId());

        // await showPooBalances(pool);

        // await (await daiPus.setExchanger(wallet.address)).wait();
        // await (await daiPus.setLiquidityIndex('1033539704147588662777413882')).wait();
        // await (await daiPus.setExchanger('0x7C7938B6a1eF49470aa53Da53bE9A0baa8CE0b10')).wait();
        //
        // console.log('DAI:    ' + fromE18(await dai.balanceOf(wallet.address)));
        // console.log('wDAI+: ' + fromE18(await wDai.balanceOf(wallet.address)));
        //
        // console.log('Swap DAI-> wDAI+');
        // await swap(asset, wUsdPlus, toAsset(1), await pool.getPoolId());
        //
        // console.log('DAI:    ' + fromE18(await dai.balanceOf(wallet.address)));
        // console.log('wDAI+: ' + fromE18(await wDai.balanceOf(wallet.address)));
        //
        // console.log('Swap wDAI+ -> DAI');
        // await swap(wUsdPlus, asset, toAsset(0.5), await pool.getPoolId());
        //
        // console.log('DAI:    ' + fromE18(await dai.balanceOf(wallet.address)));
        // console.log('wDAI+: ' + fromE18(await wDai.balanceOf(wallet.address)));
        //
        // // await showPooBalances(pool);
        //
        //
        // console.log('Unswap ' + await asset.symbol());
        // await unSwap(pool, asset);
        // console.log('Unswap ' + await wUsdPlus.symbol());
        // await unSwap(pool, wUsdPlus);

        // await showPooBalances(pool );

    }


    async function showPooBalances(pool ) {
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

    async function swap(tokenIn, tokenOut, amount, poolId) {

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

}

async function showBalances(){

    let wallet =await initWallet();

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

async function showTokenAmount(address, amount){

    let token = await getERC20ByAddress(address);

    let fromAsset;
    if (await token.decimals() === 18){
        fromAsset = fromE18;
    }else {
        fromAsset = fromE6;
    }

    return {
        name:await token.symbol(),
        amount: fromAsset(amount)
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
