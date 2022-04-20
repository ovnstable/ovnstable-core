const govUtils = require("@overnight-contracts/common/utils/governance");
const hre = require("hardhat");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/polygon/PortfolioManager.json'));
let M2M = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));
let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/fantom/UsdPlusToken.json'));

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnToken.json'));

const govUtils = require("@overnight-contracts/common/utils/governance");
const fs = require("fs");

async function main(){

    await hre.run("compile");

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance))

    let pm = await ethers.getContractAt(PM.abi, PM.address, wallet);
    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);
    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);


    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('revokeRole', [await pm.DEFAULT_ADMIN_ROLE(), '0x0bE3f37201699F00C21dCba18861ed4F60288E1D']))

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal2 grantRole to Yarik"),
        {
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "100000000000"
        }
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)

    await govUtils.execProposal(governor, ovn, proposalId, wallet, ethers);
}
