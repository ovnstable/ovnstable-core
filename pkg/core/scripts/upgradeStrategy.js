const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromOvnGov} = require("@overnight-contracts/common/utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let Strategy = JSON.parse(fs.readFileSync('./artifacts/contracts/Strategy.sol/Strategy.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnToken.json'));

async function main() {

    let wallet = await initWallet();

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let strategyDodoUsdc = await ethers.getContractAt(Strategy.abi, "0xaF7800Ee99ABF99986978B0D357E5f6813aF8638", wallet);
    let strategyDodoUsdt = await ethers.getContractAt(Strategy.abi, "0x93FdE263299EA976f8a01a0239b9858528954299", wallet);

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategyDodoUsdc.address);
    values.push(0);
    abis.push(strategyDodoUsdc.interface.encodeFunctionData('upgradeTo', ['0xe1E36e93D31702019D38d2B0F6aB926f15008409']));

    addresses.push(strategyDodoUsdt.address);
    values.push(0);
    abis.push(strategyDodoUsdt.interface.encodeFunctionData('upgradeTo', ['0xcE7aE0a4C9a3C1697256594bC6C7E8040D2a1cc2']));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id("Proposal: Upgrade Strategies"),
        {
            maxFeePerGas: "100000000000",
            maxPriorityFeePerGas: "100000000000"
        }
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)
}

async function initWallet(){

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance));

    return wallet;
}

async function execProposal(governator, ovn, id, wallet){

    let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber('polygon')-1));
    console.log('Quorum: ' + quorum);

    const proposalId = id;

    let votes = ethers.utils.parseUnits("100000100", 9);

    let state = proposalStates[await governator.state(proposalId)];
    if (state==="Executed"){
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

async function showBalances(user){

    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x625E7708f30cA75bfd92586e17077590C60eb4cD');
    let am3CRV = await ethers.getContractAt(ERC20.abi, '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi, '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi, '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
    let wmatic = await ethers.getContractAt(ERC20.abi, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let vimUsd = await ethers.getContractAt(ERC20.abi, '0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29');
    let mta = await ethers.getContractAt(ERC20.abi, '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, vimUsd, mta];

    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(user) / 10 ** await meta.decimals()));
    }
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

