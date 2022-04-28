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


async function main() {

    let wallet = await initWallet(ethers);

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let contract = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData('upgradeTo', ['0x772D49f2547cC343E4Acd3F23d32A51e69fAf4d2']));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal 2: Upgrade Strategies"),
        {
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "100000000000"
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

