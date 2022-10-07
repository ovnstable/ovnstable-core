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

    await showBalances();

    // 0x88D07558470484c03d3bb44c3ECc36CAfCF43253
    let usdPool = await createPool('USD+', usdc.address, wUsdPlus.address);
    // await testPool(usdPool, usdc, usdPlus, wUsdPlus);

    // 0xFBf87D2C22d1d298298ab5b0Ec957583a2731d15
    let daiPool = await createPool('DAI+', dai.address, wDai.address);
    // await testPool(daiPool, dai, daiPus, wDai);


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

        await showPooBalances(pool);

        let toAsset;
        if (await asset.decimals() === 18){
            toAsset = toE18;
        }else {
            toAsset = toE6;
        }

        console.log('Put ' + await asset.symbol());
        await swap(asset, pool, toAsset(1), await pool.getPoolId());
        console.log('Put ' + await usdPlus.symbol());
        await swap(wUsdPlus, pool, toE6(1), await pool.getPoolId());

        await showPooBalances(pool);

        console.log('Unswap ' + await asset.symbol());
        await unSwap(pool, asset);
        console.log('Unswap ' + await wUsdPlus.symbol());
        await unSwap(pool, wUsdPlus);

        await showPooBalances(pool );

    }


    async function showPooBalances(pool ) {
        let poolId = await pool.getPoolId();

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
