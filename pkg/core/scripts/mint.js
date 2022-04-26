const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC, toUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/fantom_dev/Exchange.json'));

let price = {maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000"};

let {POLYGON, FANTOM} = require('@overnight-contracts/common/utils/assets');
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let wallet = await initWallet(ethers);

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let usdc = await ethers.getContractAt(ERC20.abi, FANTOM.usdc, wallet);

    // await (await usdc.approve(exchange.address, toUSDC(500))).wait();
    // console.log('USDC approve done');
    await (await exchange.buy(FANTOM.usdc, toUSDC(500))).wait();
    console.log('Exchange.buy done');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

