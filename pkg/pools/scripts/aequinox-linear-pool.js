const hre = require("hardhat");
const ethers = hre.ethers;
const BN = require('bn.js');
const {initWallet, getContract, getCoreAsset, getERC20, transferUSDPlus, execTimelock} = require("@overnight-contracts/common/utils/script-utils");

let BalancerFactory = require('@overnight-contracts/pools/abi/ERC4626LinearPoolFactory.json');
let Pool = require('@overnight-contracts/pools/abi/ERC4626LinearPool.json');
let Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
const {BSC} = require("@overnight-contracts/common/utils/assets");
const {toE18, toE6, fromE18, fromE6, toAsset, fromAsset} = require("@overnight-contracts/common/utils/decimals");

let BalancerFactoryAddress = "0x202fE8BA86cA85872577fab79Ba78aD192E79C02";
// let owner = "0xe497285e466227f4e8648209e34b465daa1f90a0";
let upperTarget = new BN(10).pow(new BN(18)).muln(25000); // 25 000
let swapFee = "600000000000000"; // 0.06%

async function main() {

    let wallet = await initWallet(ethers);
    let factory = await ethers.getContractAt(BalancerFactory, BalancerFactoryAddress, wallet);
    let vault = await ethers.getContractAt(Vault, "0xEE1c8DbfBf958484c6a4571F5FB7b99B74A54AA7", wallet);

    let busd = await getERC20('busd');

    let usdPlus = await getContract('UsdPlusToken', 'bsc');
    let cUsdPlus = await getContract('UsdPlusToken', 'bsc_usdc');
    let tUsdPlus = await getContract('UsdPlusToken', 'bsc_usdt');


    let wUsdPlus = await getContract('WrappedUsdPlusToken', 'bsc');
    let wcUsdPlus = await getContract('WrappedUsdPlusToken', 'bsc_usdc');
    let wtUsdPlus = await getContract('WrappedUsdPlusToken', 'bsc_usdt');

    // await transferUSDPlus(100000, wallet.address);
    // await getcUsdPlus(10000, wallet.address);
    // await gettUsdPlus(10000, wallet.address);
    //
    // await usdPlus.approve(wUsdPlus.address, toE6(1));
    // await wUsdPlus.deposit(toE6(1), wallet.address);
    //
    // await cUsdPlus.approve(wcUsdPlus.address, toE6(1));
    // await wcUsdPlus.deposit(toE6(1), wallet.address);
    //
    // await tUsdPlus.approve(wtUsdPlus.address, toE6(1));
    // await wtUsdPlus.deposit(toE6(1), wallet.address);


    // let usdPool = await createPool('BUSD/USD+', BSC.busd, wUsdPlus.address);
    // await testPool(usdPool, usdPlus, wUsdPlus);

    let tUsdPool = await createPool('BUSD/tUSD+', BSC.usdt, wtUsdPlus.address);
    // await testPool(tUsdPool, tUsdPlus, wtUsdPlus);

    let cUsdPool = await createPool('BUSD/cUSD+', BSC.usdc, wcUsdPlus.address);
    // await testPool(cUsdPool, cUsdPlus, wcUsdPlus);

    async function createPool(pairName, asset, wrapper){

        let tx = await (await factory.create(`Linear Pool ${pairName}`, `LP ${pairName}`, asset, wrapper, upperTarget.toString(), swapFee, wallet.address)).wait();
        const poolAddress = tx.events.find((e) => e.event == 'PoolCreated').args[0];

        let pool = await ethers.getContractAt(Pool, poolAddress, wallet);

        console.log('----');
        console.log('Name:    ' + pairName);
        console.log('address: ' + poolAddress);
        console.log('poolId:  ' + await pool.getPoolId());

        return pool;
    }

    async function testPool(pool, usdPlus, wUsdPlus){

        await showBalances(pool, wUsdPlus, usdPlus);

        console.log('Put BUSD ');
        await swap(busd, pool, toE18(1), await pool.getPoolId());
        console.log('Put wUSD+');
        await swap(wUsdPlus, pool, await wUsdPlus.balanceOf(wallet.address), await pool.getPoolId());

        await showBalances(pool, wUsdPlus, usdPlus);

        console.log('Unswap BUSD');
        await unSwap(pool, busd);
        console.log('Unswap wUSD+');
        await unSwap(pool, wUsdPlus);

        await showBalances(pool, wUsdPlus, usdPlus);

    }


    async function showBalances(pool, wrapper, usdPlus){
        let poolId = await pool.getPoolId();

        let targets = await pool.getTargets();
        let balances = await vault.getPoolTokens(poolId);

        console.log('--- User ---');
        console.log('Balance  BUSD: ' + fromE18((await busd.balanceOf(wallet.address)).toString()));
        console.log('Balance wUSD+: ' + fromE6(await wrapper.balanceOf(wallet.address)));
        console.log('Balance  USD+: ' + fromE6(await usdPlus.balanceOf(wallet.address)));
        console.log('Balance  LP  : ' + fromE18((await pool.balanceOf(wallet.address)).toString()));

        console.log('--- Pool ---');
        console.log(`Targets: lower: ${targets[0].toString()} upper: ${targets[1].toString()}`);

        console.log(`BPT:     ${balances[0][0]}: ${fromE18(balances[1][0].toString())}`);
        console.log(`wUSD:    ${balances[0][1]}: ${fromE6(balances[1][1].toString())}`);
        console.log(`BUSD:    ${balances[0][2]}: ${fromE18(balances[1][2].toString())}`);

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


    async function unSwap(pool, tokenOut){

        await pool.approve(vault.address, await pool.balanceOf(wallet.address));
        let tokenInfo = await vault.getPoolTokenInfo(await pool.getPoolId(), tokenOut.address);

        await vault.swap(
            {
                poolId: await pool.getPoolId(),
                kind: 1,
                assetIn: pool.address,
                assetOut: tokenOut.address,
                amount: tokenInfo[0] ,
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

async function getcUsdPlus(amount, to) {

    let usdPlus = await getContract('UsdPlusToken', 'bsc_usdc');

    let exchange = await usdPlus.exchange();

    await usdPlus.setExchanger(to);
    await usdPlus.mint(to, toAsset(amount));
    await usdPlus.setExchanger(exchange);

    console.log('Balance USD+: ' + fromAsset(await usdPlus.balanceOf(to)));
}

async function gettUsdPlus(amount , to){

    let usdPlus = await getContract('UsdPlusToken', 'bsc_usdt');

    let exchange = await usdPlus.exchange();

    await usdPlus.setExchanger(to);
    await usdPlus.mint(to, toAsset(amount));
    await usdPlus.setExchanger(exchange);

    console.log('Balance USD+: ' + fromAsset(await usdPlus.balanceOf(to)));
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
