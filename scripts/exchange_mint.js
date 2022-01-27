const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic} = require("../utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon_dev_new/Exchange.json'));
let Balancer = JSON.parse(fs.readFileSync('./deployments/polygon_dev_new/Balancer.json'));
let Portfolio = JSON.parse(fs.readFileSync('./deployments/polygon_dev_new/Portfolio.json'));

async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');

    // await USDC.approve(exchange.address, 10);
    // await exchange.buy(USDC.address, 10);
    await exchange.payout();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

