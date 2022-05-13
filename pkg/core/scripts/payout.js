const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {showM2M} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));
let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));

let price = { maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000" };

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
    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);
    let usdPlusToken = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);

    await showM2M(m2m,usdPlusToken);
    await (await exchange.payout()).wait();
    await showM2M(m2m, usdPlusToken);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

