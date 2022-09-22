const hre = require("hardhat");
const ethers = hre.ethers;

let Vault = require('@overnight-contracts/pools/abi/VaultBalancer.json');
let StablePhantomPoolFactory = require('@overnight-contracts/pools/abi/StablePhantomPoolFactory.json');
let StablePhantomPool = require('@overnight-contracts/pools/abi/StablePhantomPool.json');
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");


let StableFactory = "0xe2983b13b8f6631523a6177Cc7D926f49cEf3490";


let lpUsdPlus = "0x10Ea391ED29F643d58C24f56Da13DE035041Ec82";
let lpcUsdPlus = "0x6D133655aE3548B8a5BE1A385adcAabB089EaaF6";
let lptUsdPlus = "0x81D5355bA22eeD56dC5D0f201c7487BA0A2986C4";

async function main() {

    let wallet = await initWallet();

    let poolAddress = await createStablePool();

    // let stablePool = await ethers.getContractAt(StablePhantomPool, poolAddress, wallet);
    // let vault = await ethers.getContractAt(Vault, "0xEE1c8DbfBf958484c6a4571F5FB7b99B74A54AA7", wallet);

    await showBalances(vault, stablePool);

}

async function createStablePool() {

    let wallet = await initWallet();
    let factory = await ethers.getContractAt(StablePhantomPoolFactory, StableFactory, wallet);


    let tokens = [lpUsdPlus, lpcUsdPlus, lptUsdPlus];
    tokens.sort((tokenA, tokenB) => (tokenA.toLowerCase() > tokenB.toLowerCase() ? 1 : -1));


    let rateProviders = [lpUsdPlus, lpcUsdPlus, lptUsdPlus];

    let tokenRateCacheDurations = [1800, 1800, 1800];

    console.log(tokens);
    console.log(rateProviders);
    console.log(tokenRateCacheDurations);

    let amplificationParameter = "570";
    let swapFee = "100000000000000"; // 0.01%

    let promise = await factory.create(
        'Ascended USD+ pool (test)',
        'bb-USD+',
        tokens,
        amplificationParameter.toString(),
        rateProviders,
        tokenRateCacheDurations,
        swapFee,
        wallet.address,
        );


    let tx = await promise.wait();

    tx = await ethers.provider.getTransactionReceipt(tx.transactionHash);
    const poolAddress = tx.events.find((e) => e.event == 'PoolCreated').args[0];

    console.log('[Created Stable Pool] => ' + poolAddress);

    return poolAddress;
}


async function showBalances(vault, pool) {
    const {tokens, balances} = await vault.getPoolTokens(await pool.getPoolId());

    console.log('Balance Stable Pool:')
    console.log('Tokens:   ' + tokens);
    console.log('Balances: ' + balances);


    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        let balance = balances[i];

        let name = "";
        switch (token.toLowerCase()) {
            case "0x2791bca1f2de4661ed88a30c99a7a9449aa84174".toLowerCase():
                name = "USDC";
                break
            case "0xc2132d05d31c914a87c6611c10748aeb04b58e8f".toLowerCase():
                name = "USDT";
                break
            case "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063".toLowerCase():
                name = "DAI ";
                break
            case "0x1aAFc31091d93C3Ff003Cff5D2d8f7bA2e728425".toLowerCase():
                name = "USD+"
                break
            default:
                name = "LP  ";
                break

        }

        // console.log(`- ${name}:${balance}`);
    }

}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
