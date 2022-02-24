const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC} = require("../utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/polygon_dev/PortfolioManager.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Mark2Market.json'));

async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance))

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let pm = await ethers.getContractAt(PM.abi, PM.address, wallet);
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', wallet);
    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);


    let items = await m2m.strategyAssets();
    for (let i = 0; i <items.length ; i++) {

        let item = items[i];
        console.log("strategy " + item.strategy);
        console.log("net asset " + fromUSDC(item.netAssetValue));
        console.log("liq value " + fromUSDC(item.liquidationValue));
    }

    let aave = {
        strategy: (await ethers.getContract("StrategyAave")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }
    let curve = {
        strategy: (await ethers.getContract("StrategyCurve")).address,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let mstable= {
        strategy: (await ethers.getContract("StrategyMStable")).address,
        minWeight: 0,
        targetWeight: 20000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let izumu = {
        strategy: (await ethers.getContract("StrategyIzumi")).address,
        minWeight: 0,
        targetWeight:75000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let balancer = {
        strategy: (await ethers.getContract("StrategyBalancer")).address,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let idle = {
        strategy: (await ethers.getContract("StrategyIdle")).address,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: false,
        enabledReward: false,
    }

    let weights = [
        aave,
        mstable,
        izumu,
        balancer,
        curve,
        idle
    ]


    // await(await pm.balance()).wait();

    // await (await pm.setStrategyWeights(weights)).wait();
    // console.log("portfolio.setWeights done");

    // let balanceUSDC = await USDC.balanceOf(wallet.address);
    // await USDC.approve(exchange.address, balanceUSDC);
    //
    // console.log('Balance USDC: ' + fromUSDC(balanceUSDC) )
    // await exchange.buy(USDC.address, balanceUSDC);
    // await exchange.payout();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

