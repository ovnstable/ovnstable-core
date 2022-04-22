const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let Strategy = JSON.parse(fs.readFileSync('./artifacts/contracts/Strategy.sol/Strategy.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnToken.json'));

async function main() {

    let wallet = await initWallet(ethers);

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let strategy = await ethers.getContractAt(Strategy.abi, "0x84152E7d666fC05cC64dE99959176338f783F8Eb", wallet);

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x2C3bDE5E5e7Bf70e41e870e087C0f01d127A61cB']));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal 1: Upgrade Strategies"),
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

