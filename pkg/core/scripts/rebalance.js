const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let PM = JSON.parse(fs.readFileSync('./deployments/polygon_dev/PortfolioManager.json'));

let price = {maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000"};

async function main() {

    let wallet = await initWallet(ethers);

    let pm = await ethers.getContractAt(PM.abi, PM.address, wallet);
    await (await pm.balance(price)).wait();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

