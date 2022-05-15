const hre = require("hardhat");
const fs = require("fs");
const {initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const BN = require("bn.js");
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let StrategyArrakisWeth = JSON.parse(fs.readFileSync('../strategies/polygon/deployments/polygon_dev/StrategyArrakisWeth.json'));



async function main() {

    let wallet = await initWallet(ethers);
    let price = await getPrice();

    let strategyArrakisWeth = await ethers.getContractAt(StrategyArrakisWeth.abi, StrategyArrakisWeth.address, wallet);
    let usdc = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', wallet);

    await (await strategyArrakisWeth.setPortfolioManager(wallet.address, price)).wait();

    console.log('Set PM');

    let amount = toUSDC(50);
    await (await usdc.transfer(strategyArrakisWeth.address, amount, price)).wait();

    console.log('Transfer');

    await (await strategyArrakisWeth.stake(usdc.address, amount, price)).wait();

    console.log('Stake');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

