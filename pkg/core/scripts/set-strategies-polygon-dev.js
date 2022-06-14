const hre = require("hardhat");
const fs = require("fs");
const {fromE18, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/polygon_dev/PortfolioManager.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/polygon_dev/Mark2Market.json'));

let {POLYGON, DEFAULT} = require('@overnight-contracts/common/utils/assets');
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
    let USDC = await ethers.getContractAt(ERC20.abi, POLYGON.usdc, wallet);
    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);


    // await (await pm.setUsdc(FANTOM.usdc)).wait();
    // console.log('pm.setUsdc done')
    //
    // await (await pm.setCashStrategy("0xd2381abf796Fc9c83ca977E9153812B64712754A")).wait();
    // console.log('pm.setCashStrategy done');


    let aave = {
        strategy: "0x81AfC1b2b12C6bA97adf68f39bc819e1CC67cE2D",
        minWeight: 0,
        targetWeight: 6000,
        maxWeight: 25000,
        enabled: true,
        enabledReward: true,
    }

    let DodoUSDC = {
        strategy: "0x52664Dce9E0fc9aB63d148CeeEc365b93690a985",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let DodoUSDT = {
        strategy: "0x69C466cd299e9BcEdF29C56F713bd4b730CbAb1f",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let ArrakisUSDCUSDTBorrow = {
        strategy: "0x273313bA28bfb4F6C84fBFb09E64F849eA2099d3",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let DystopiaUSDCDAI = {
        strategy: "0x123a8643A90Bc2C03cC9Ba2A127c952f4e81236f",
        minWeight: 0,
        targetWeight: 15000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let MeshSwapUSDC = {
        strategy: "0x250A2A3A64972ca85A415b600D79f6F35dD7CF41",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let MeshSwapUSDCUSDT = {
        strategy: "0xb3329b664e4243259fDa55650d44C5f9B1Ca83fD",
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
        enabled: false,
        enabledReward: true,
    }

    let ArrakisUSDCWETHBorrow = {
        strategy: "0x34a525B2D55584D9974aECD6A6C53928bF953Dec",
        minWeight: 0,
        targetWeight: 7000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let ArrakisUSDCWMATICBorrow = {
        strategy: "0x28f16c9674671E2D6915518C67C99f93e4afE9Ee",
        minWeight: 0,
        targetWeight: 7000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let weights = [
        aave,
        DodoUSDC,
        DodoUSDT,
        ArrakisUSDCUSDTBorrow,
        DystopiaUSDCDAI,
        MeshSwapUSDC,
        MeshSwapUSDCUSDT,
        ArrakisUSDCWETHBorrow,
        ArrakisUSDCWMATICBorrow
    ]


    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
        sum += weights[i].targetWeight;
    }

    if (sum !== 100000) {
        console.log(`Total weight not 100000`)
        return
    }

    console.log('TargetWeight: ' + sum);

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.balance()).wait();
    console.log("portfolio.balance done");

    await showM2M(m2m);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

