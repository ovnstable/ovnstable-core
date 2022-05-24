const hre = require("hardhat");
const fs = require("fs");
const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let Strategy = JSON.parse(fs.readFileSync('./artifacts/contracts/Strategy.sol/Strategy.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnToken.json'));

let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let PortfolioManager = JSON.parse(fs.readFileSync('./deployments/polygon/PortfolioManager.json'));
let Mark2Market = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));


async function main() {

    let price = await getPrice();

    let governor = await getContract('OvnGovernor', 'polygon');

    let aave = await getContract('StrategyAave', 'polygon');
    let dodoUsdc = await getContract('StrategyDodoUsdc', 'polygon');
    let arrakis = await getContract('StrategyArrakis', 'polygon');
    let meshSwap = await getContract('StrategyMeshSwapUsdc', 'polygon');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(aave.address);
    values.push(0);
    abis.push(aave.interface.encodeFunctionData('upgradeTo', ['0x20275a7B10bA4d897301Ae2c17E67b0eeb5A8024']));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal 2: Upgrade Strategies"),
        price
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

