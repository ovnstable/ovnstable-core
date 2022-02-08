const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic, fromOvnGov, fromE18, fromOvn} = require("../utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
let TimeLock = JSON.parse(fs.readFileSync('./deployments/polygon/TimelockController.json'));
let PortfolioManager = JSON.parse(fs.readFileSync('./deployments/polygon/PortfolioManager.json'));
let Mark2Market = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));
let OvnGovernor = JSON.parse(fs.readFileSync('./deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/OvnToken.json'));
let Vault = JSON.parse(fs.readFileSync('./deployments/polygon/Vault.json'));
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];
let assets = JSON.parse(fs.readFileSync('./assets.json'));


let PortfolioNew = JSON.parse(fs.readFileSync('./deployments/polygon_dev_new/PortfolioManager.json'));


async function main() {

    let wallet = await initWallet();

    let governator = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let vault = await ethers.getContractAt(Vault.abi, Vault.address);
    let pmOld = await ethers.getContractAt(PortfolioManager.abi, PortfolioManager.address, wallet);
    let pmNew = await ethers.getContractAt(PortfolioNew.abi, PortfolioNew.address, wallet);
    let m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address, wallet);
    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);
    const governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address);
    let usdc = await ethers.getContractAt(ERC20.abi, assets.usdc, wallet);
    let amUsdc = await ethers.getContractAt(ERC20.abi, assets.amUsdc, wallet);
    let aave = await ethers.getContract("StrategyAave");

    let addresses = [];
    let values = [];
    let abis = [];



    addresses.push(vault.address);
    values.push(0);
    abis.push(vault.interface.encodeFunctionData('grantRole', [await vault.PORTFOLIO_MANAGER(), TimeLock.address]));

    addresses.push(vault.address);
    values.push(0);
    abis.push(vault.interface.encodeFunctionData('transfer', [assets.usdc, pmNew.address, await usdc.balanceOf(vault.address)]));


    addresses.push(vault.address);
    values.push(0);
    abis.push(vault.interface.encodeFunctionData('transfer', [assets.amUsdc, aave.address, await amUsdc.balanceOf(vault.address)]));

    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal #12 Add Strategies"),
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;


    let balanceUsdc = await usdc.balanceOf(pmNew.address);

    await execProposal(governator, ovn, proposalId, wallet);

    let balanceUsdcNew = await usdc.balanceOf(pmNew.address);

    console.log(`Balance USDC ${balanceUsdc}:${balanceUsdcNew}`)
}

}

async function initWallet() {

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance));

    return wallet;
}

async function execProposal(governator, ovn, id, wallet) {

    let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber() - 1));
    console.log('Quorum: ' + quorum);

    const proposalId = id;

    let votes = ethers.utils.parseUnits("100000100", 9);

    let state = proposalStates[await governator.state(proposalId)];
    if (state === "Executed") {
        return;
    }

    console.log('State status: ' + state)
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting

    console.log('Votes: ' + votes)
    await governator.castVote(proposalId, 1);

    let item = await governator.proposals(proposalId);
    console.log('Votes for: ' + item.forVotes / 10 ** 18);

    let total = fromOvnGov(await ovn.getVotes(wallet.address));
    console.log('Delegated ' + total)

    let waitBlock = 200;
    const sevenDays = 7 * 24 * 60 * 60;
    for (let i = 0; i < waitBlock; i++) {
        await ethers.provider.send("evm_increaseTime", [sevenDays])
        await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    }

    state = proposalStates[await governator.state(proposalId)];
    expect(state).to.eq('Succeeded');
    await governator.queueExec(proposalId);
    await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    await governator.executeExec(proposalId);


    state = proposalStates[await governator.state(proposalId)];
    console.log('State status: ' + state)
    expect(state).to.eq('Executed');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

