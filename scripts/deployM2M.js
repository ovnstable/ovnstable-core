const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromOvnGov, fromE18, fromOvn} = require("../utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
let Mark2Market = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));
let OvnGovernor = JSON.parse(fs.readFileSync('./deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/OvnToken.json'));
let Vault = JSON.parse(fs.readFileSync('./deployments/polygon/Vault.json'));
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

async function main() {

    let wallet = await initWallet();

    let governator = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);
    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address, wallet);
    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);

    await execProposal(governator, ovn, "105135459147370785544922440762846673168766303493319499029502214459806662918844", wallet);

    console.log('Liq index before: ' + await usdPlus.liquidityIndex());
    console.log('Total supply before: ' + fromOvn(await usdPlus.totalSupply()));
    console.log('Total sell assets before: ' + fromE18(await m2m.totalSellAssets()));
    console.log('Total buy assets before: ' + fromE18(await m2m.totalBuyAssets()));
    console.log('NextPayout: ' + new Date(await exchange.nextPayoutTime() * 1000));

    await showBalances(Vault.address);

    let tx = await (await exchange.payout()).wait();

    console.log('Balance after')
    await showBalances(Vault.address);

    const args= tx.events.find((e) => e.event == 'PayoutEvent').args;
    console.log('PayoutEvent: total USD+ ' + args.totalUsdPlus + " total USDC " + args.totalUsdc + " difference " + args.totallyAmountPaid);

    console.log('Liq index after: ' + await usdPlus.liquidityIndex());
    console.log('Total supply after: ' + fromOvn(await usdPlus.totalSupply()));
    console.log('Total sell assets before: ' + fromE18(await m2m.totalSellAssets()));
    console.log('Total buy ssets before: ' + fromE18(await m2m.totalBuyAssets()));
    console.log('NextPayout: ' + new Date(await exchange.nextPayoutTime() * 1000));

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

    let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber()-1));
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
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F');
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

