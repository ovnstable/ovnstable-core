const hre = require("hardhat");
const fs = require("fs");
const {fromE18, fromUSDC, fromOvnGov} = require("../utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let UsdPlusToken = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
let OvnGovernor = JSON.parse(fs.readFileSync('./deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/OvnToken.json'));

let OldTimeLock = JSON.parse(fs.readFileSync('./deployments/polygon/TimelockController.json'));
let NewTimeLock = JSON.parse(fs.readFileSync('./deployments/polygon/OvnTimelockController.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let PortfolioManager = JSON.parse(fs.readFileSync('./deployments/polygon/PortfolioManager.json'));
let Mark2Market = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));


async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");


    let wallet = await initWallet();

    let usdPlus = await ethers.getContractAt(UsdPlusToken.abi, UsdPlusToken.address, wallet);
    const governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    const exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    const pm = await ethers.getContractAt(PortfolioManager.abi, PortfolioManager.address, wallet);
    const m2m = await ethers.getContractAt(Mark2Market.abi, Mark2Market.address, wallet);

    const oldTimeLock = await ethers.getContractAt(OldTimeLock.abi, OldTimeLock.address, wallet);
    const newTimeLock = await ethers.getContractAt(NewTimeLock.abi, NewTimeLock.address, wallet);


    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [await usdPlus.DEFAULT_ADMIN_ROLE(), newTimeLock.address]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('grantRole', [await usdPlus.UPGRADER_ROLE(), newTimeLock.address]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('revokeRole', [await usdPlus.UPGRADER_ROLE(), oldTimeLock.address]));

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('revokeRole', [await usdPlus.DEFAULT_ADMIN_ROLE(), oldTimeLock.address]));


    console.log('\n[UsdPlus]\n')
    console.log('hasRole(ADMIN) OLD_TIME_LOCK     ' + await usdPlus.hasRole(await usdPlus.DEFAULT_ADMIN_ROLE(), oldTimeLock.address));
    console.log('hasRole(ADMIN) WALLET            ' + await usdPlus.hasRole(await usdPlus.DEFAULT_ADMIN_ROLE(), wallet.address));
    console.log('hasRole(ADMIN) NEW_TIME_LOCK     ' + await usdPlus.hasRole(await usdPlus.DEFAULT_ADMIN_ROLE(), newTimeLock.address));

    console.log('hasRole(UPGRADED) OLD_TIME_LOCK  ' + await usdPlus.hasRole(await usdPlus.UPGRADER_ROLE(), oldTimeLock.address));
    console.log('hasRole(UPGRADED) WALLET         ' + await usdPlus.hasRole(await usdPlus.UPGRADER_ROLE(), wallet.address));
    console.log('hasRole(UPGRADED) NEW_TIME_LOCK  ' + await usdPlus.hasRole(await usdPlus.UPGRADER_ROLE(), newTimeLock.address));

    console.log('\n[Exchange]\n')
    console.log('hasRole(ADMIN) OLD_TIME_LOCK     ' + await exchange.hasRole(await exchange.DEFAULT_ADMIN_ROLE(), oldTimeLock.address));
    console.log('hasRole(ADMIN) WALLET            ' + await exchange.hasRole(await exchange.DEFAULT_ADMIN_ROLE(), wallet.address));
    console.log('hasRole(ADMIN) NEW_TIME_LOCK     ' + await exchange.hasRole(await exchange.DEFAULT_ADMIN_ROLE(), newTimeLock.address));

    console.log('hasRole(UPGRADED) OLD_TIME_LOCK  ' + await exchange.hasRole(await exchange.UPGRADER_ROLE(), oldTimeLock.address));
    console.log('hasRole(UPGRADED) WALLET         ' + await exchange.hasRole(await exchange.UPGRADER_ROLE(), wallet.address));
    console.log('hasRole(UPGRADED) NEW_TIME_LOCK  ' + await exchange.hasRole(await exchange.UPGRADER_ROLE(), newTimeLock.address));

    console.log('\n[M2M]\n')
    console.log('hasRole(ADMIN) OLD_TIME_LOCK     ' + await m2m.hasRole(await m2m.DEFAULT_ADMIN_ROLE(), oldTimeLock.address));
    console.log('hasRole(ADMIN) WALLET            ' + await m2m.hasRole(await m2m.DEFAULT_ADMIN_ROLE(), wallet.address));
    console.log('hasRole(ADMIN) NEW_TIME_LOCK     ' + await m2m.hasRole(await m2m.DEFAULT_ADMIN_ROLE(), newTimeLock.address));

    console.log('hasRole(UPGRADED) OLD_TIME_LOCK  ' + await m2m.hasRole(await m2m.UPGRADER_ROLE(), oldTimeLock.address));
    console.log('hasRole(UPGRADED) WALLET         ' + await m2m.hasRole(await m2m.UPGRADER_ROLE(), wallet.address));
    console.log('hasRole(UPGRADED) NEW_TIME_LOCK  ' + await m2m.hasRole(await m2m.UPGRADER_ROLE(), newTimeLock.address));

    console.log('\n[PM]\n')
    console.log('hasRole(ADMIN) OLD_TIME_LOCK     ' + await pm.hasRole(await pm.DEFAULT_ADMIN_ROLE(), oldTimeLock.address));
    console.log('hasRole(ADMIN) WALLET            ' + await pm.hasRole(await pm.DEFAULT_ADMIN_ROLE(), wallet.address));
    console.log('hasRole(ADMIN) NEW_TIME_LOCK     ' + await pm.hasRole(await pm.DEFAULT_ADMIN_ROLE(), newTimeLock.address));

    console.log('hasRole(UPGRADED) OLD_TIME_LOCK  ' + await pm.hasRole(await pm.UPGRADER_ROLE(), oldTimeLock.address));
    console.log('hasRole(UPGRADED) WALLET         ' + await pm.hasRole(await pm.UPGRADER_ROLE(), wallet.address));
    console.log('hasRole(UPGRADED) NEW_TIME_LOCK  ' + await pm.hasRole(await pm.UPGRADER_ROLE(), newTimeLock.address));


    // console.log('Creating a proposal...')
    // const proposeTx = await governor.proposeExec(
    //     addresses,
    //     values,
    //     abis,
    //     ethers.utils.id("Proposal #22 New core"),
    // );
    //
    // console.log('Tx ' + proposeTx.hash);
    // let tx = await proposeTx.wait();
    // const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    //
    // console.log('Proposal id ' + proposalId);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

async function execProposal(governator, ovn, id, wallet) {

    const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];


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


async function initWallet(){

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance))

    return wallet;
}
