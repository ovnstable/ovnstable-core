const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
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

    let wallet = await initWallet(ethers);

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let contract = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let pm = await ethers.getContractAt(PortfolioManager.abi, PortfolioManager.address, wallet);
    let m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address, wallet);

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xEaBE41bcA0d580863258a58a98289b0309DdBeFe']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setPayoutListener', ['0xAE35d4F19be7897f8A11B2E61e73ae9cf38Bc90D']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('upgradeTo', ['0xa5Ec68A0031eb20fC9898858C71E883db8eDd890']));

    addresses.push(m2m.address);
    values.push(0);
    abis.push(m2m.interface.encodeFunctionData('upgradeTo', ['0xA1370B5b1115FdEDf7B12ABBBc7Ae6fDF646b368']));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal 2: Upgrade Strategies"),
        {
            maxFeePerGas: "600000000000",
            maxPriorityFeePerGas: "600000000000"
        }
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

