const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC, toUSDC} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/fantom_dev/Exchange.json'));

let price = {maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000"};

let {POLYGON, FANTOM} = require('@overnight-contracts/common/utils/assets');
const {initWallet, getContract, getERC20} = require("@overnight-contracts/common/utils/script-utils");
const {execProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {

    let exchange = await getContract('Exchange', 'polygon');
    let usdc = await getERC20('usdc');

    let governor = await getContract('OvnGovernor', 'polygon');
    let ovn = await getContract('OvnToken', 'polygon');

    await execProposal(governor, ovn, '39210703643475922650499549302332291617589563501533150084674038012492453689368', await initWallet(ethers), ethers);

    await (await usdc.approve(exchange.address, toUSDC(10))).wait();
    console.log('USDC approve done');
    await (await exchange.buy(POLYGON.usdc, toUSDC(10))).wait();
    console.log('Exchange.buy done');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

