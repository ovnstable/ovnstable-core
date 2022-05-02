const hre = require("hardhat");
const fs = require("fs");
const {fromE18, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/fantom/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/fantom/PortfolioManager.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/fantom/Mark2Market.json'));
let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/fantom/UsdPlusToken.json'));

let {FANTOM } = require('@overnight-contracts/common/utils/assets');
const {showM2M} = require("@overnight-contracts/common/utils/script-utils");



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
    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);


    // await (await pm.setUsdc(FANTOM.usdc)).wait();
    // console.log('pm.setUsdc done')
    //
    // await (await pm.setCashStrategy("0xF91FAbcC4bFFe1Dd91E1cC856379fF6b0D14e572")).wait();
    // console.log('pm.setCashStrategy done');


    let aave = {
        strategy: "0xF91FAbcC4bFFe1Dd91E1cC856379fF6b0D14e572",
        minWeight: 0,
        targetWeight: 2500,
        maxWeight: 5000,
        enabled: true,
        enabledReward: true,
    }


    let tarotSpiritUsdcFtm = {
        strategy: "0xBE24082cf05aAaabb1C479aded4D8a6C015ADd27",
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let tarotSpookyUsdcFtm= {
        strategy: "0x3E93772B43bF4bEFa4b22bdC08c254e6354FB4ee",
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let curveGeist = {
        strategy: "0x67C37De5832b063c32b5AaDaa2C9283ED1434C90",
        minWeight: 0,
        targetWeight: 12500,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let spookySwapTusdUsdc = {
        strategy: "0xB83e6cE3543156A03a867c6e293bc8bF8dCf2475",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let wigoUsdcDai = {
        strategy: "0x4863AC0165575683A3e434cE02c39bB4A1E7aF5b",
        minWeight: 0,
        targetWeight: 35000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let wigoUsdcFusdt = {
        strategy: "0xdAaCB26806171f188f077142a955Bf4Ee421974a",
        minWeight: 0,
        targetWeight: 35000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }



    let weights = [
        aave,
        tarotSpiritUsdcFtm,
        tarotSpookyUsdcFtm,
        wigoUsdcDai,
        wigoUsdcFusdt,
        curveGeist,
        spookySwapTusdUsdc
    ]


    // await (await pm.setStrategyWeights(weights)).wait();
    // console.log("portfolio.setWeights done");


    // await (await USDC.approve(exchange.address, toUSDC(50))).wait();
    // console.log('Approve USDC done');
    //
    // await (await exchange.buy(FANTOM.usdc, toUSDC(50) )).wait();
    //

    // await (await pm.balance()).wait();
    // console.log("portfolio.balance done");

    await showM2M(m2m);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

