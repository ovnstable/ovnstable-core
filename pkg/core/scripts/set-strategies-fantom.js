const hre = require("hardhat");
const fs = require("fs");
const {fromE18, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/fantom_dev/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/fantom_dev/PortfolioManager.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/fantom_dev/Mark2Market.json'));

let {FANTOM, DEFAULT} = require('@overnight-contracts/common/utils/assets');



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
    let USDC = await ethers.getContractAt(ERC20.abi, FANTOM.usdc, wallet);
    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);


    // await (await pm.setUsdc(FANTOM.usdc)).wait();
    // console.log('pm.setUsdc done')
    //
    // await (await pm.setCashStrategy("0x448e87779345cc2a4b3772DfD0f63200837B2615")).wait();
    // console.log('pm.setCashStrategy done');


    let aave = {
        strategy: "0x448e87779345cc2a4b3772DfD0f63200837B2615",
        minWeight: 0,
        targetWeight: 2000,
        maxWeight: 5000,
        enabled: true,
        enabledReward: true,
    }

    let beethovenxDeiUsdc= {
        strategy: "0x08d387BAb84706946dC92651Dc794D41bb7eb6b5",
        minWeight: 0,
        targetWeight: 38000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let cream = {
        strategy: "0xd2381abf796Fc9c83ca977E9153812B64712754A",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let curve2Pool= {
        strategy: "0x1E1F509963A6D33e169D9497b11c7DbFe73B7F13",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let curveGeist= {
        strategy: "0x1862f0115cc08dE3F24bE5109AdCcDf5E11B6350",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let tarotSpiritUsdcFtm = {
        strategy: "0xB290830AA01854Ae64D352Ac51aa2783aA4dDb2a",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let tarotSpookyUsdcFtm= {
        strategy: "0x3bE4a04d21D9cE2b38557CB9e89A9254AEE7c132",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let tarotSupplyVaultUsdc = {
        strategy: "0xF7d693CE960e70721F0353F967360046Ba7d4eFA",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }



    let weights = [
        aave,
        cream,
        beethovenxDeiUsdc,
        curve2Pool,
        curveGeist,
        tarotSpiritUsdcFtm,
        tarotSpookyUsdcFtm,
        tarotSupplyVaultUsdc
    ]


    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");


    // await (await pm.balance()).wait();
    // console.log("portfolio.balance done");

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

