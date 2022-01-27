const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic, fromOvnGov} = require("../utils/decimals");
const {expect} = require("chai");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));

let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let RewardManager = JSON.parse(fs.readFileSync('./deployments/polygon/RewardManager.json'));
let OvnGovernor = JSON.parse(fs.readFileSync('./deployments/polygon/OvnGovernor.json'));
let OvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/OvnToken.json'));
const proposalStates = ['Pending', 'Active', 'Canceled', 'Defeated', 'Succeeded', 'Queued', 'Expired', 'Executed'];

async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let provider = ethers.provider;

    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(process.env.PK_POLYGON, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let governator = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);
    let reward = await ethers.getContractAt(RewardManager.abi, RewardManager.address, wallet);
    let ovn = await ethers.getContractAt(OvnToken.abi, OvnToken.address);


    const proposeTx = await governator.proposeExec(
        [reward.address],
        [0],
        [reward.interface.encodeFunctionData('upgradeTo', ["0xdF211EA6783eD3Dc4ccc78D6Ce00dD31b84EC86d"])],
        ethers.utils.id(new Date().toUTCString())
    );

    // let quorum = fromOvnGov(await governator.quorum(await ethers.provider.getBlockNumber()-1));
    // console.log('Quorum: ' + quorum);
    //
    // const tx = await proposeTx.wait();
    // await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    // const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    //
    // let votes = ethers.utils.parseUnits("100000100", 9);
    //
    // console.log('Votes: ' + votes)
    // await governator.castVote(proposalId, 1);
    //
    // let item = await governator.proposals(proposalId);
    // console.log('Fotes for: ' + item.forVotes / 10 ** 18);
    //
    // let total = fromOvnGov(await ovn.getVotes(wallet.address));
    // console.log('Deletegated ' + total)
    //
    // let waitBlock = 200;
    // const sevenDays = 7 * 24 * 60 * 60;
    // for (let i = 0; i < waitBlock; i++) {
    //     await ethers.provider.send("evm_increaseTime", [sevenDays])
    //     await ethers.provider.send('evm_mine'); // wait 1 block before opening voting
    // }
    //
    // let state = proposalStates[await governator.state(proposalId)];
    // expect(state).to.eq('Succeeded');
    // await governator.queueExec(proposalId);
    // await governator.executeExec(proposalId);
    //
    //
    // console.log('Exec payout')
    //
    // await exchange.payout();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

