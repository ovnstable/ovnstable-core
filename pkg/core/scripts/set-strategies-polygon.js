const hre = require("hardhat");
const fs = require("fs");
const {fromE18, toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
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

async function main() {
    // need to run inside IDEA via node script running
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


    let mstable = {
        strategy: "0xC647A43cF67Ecae5C4C5aC18378FD45C210E8Fbc",
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let aave = {
        strategy: "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
        minWeight: 0,
        targetWeight: 2500,
        maxWeight: 5000,
        enabled: true,
        enabledReward: true,
    }


    let dodoUsdc = {
        strategy: "0xaF7800Ee99ABF99986978B0D357E5f6813aF8638",
        minWeight: 0,
        targetWeight: 45000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let dodoUsdt = {
        strategy: "0x93FdE263299EA976f8a01a0239b9858528954299",
        minWeight: 0,
        targetWeight: 27500,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let impermaxUsdcUsdt = {
        strategy: "0x8f4d8799188B8360bD3c1C652aD699771E0e667e",
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
        enabled: false,
        enabledReward: false,
    }

    let arrakis = {
        strategy: "0x84152E7d666fC05cC64dE99959176338f783F8Eb",
        minWeight: 0,
        targetWeight: 20000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let weights = [
        aave,
        mstable,
        dodoUsdc,
        dodoUsdt,
        impermaxUsdcUsdt,
        arrakis
    ]

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [weights]))


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal: Update "),
        {
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "100000000000"
        }
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)

    // await govUtils.execProposal(governor, ovn, proposalId, wallet, ethers);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

