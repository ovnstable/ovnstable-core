const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
const {toE18} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");
const ethers = hre.ethers;


let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));


let PreOvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/PreOvnToken.json'));
let StakingRewardQsUsdcWeth = JSON.parse(fs.readFileSync('./deployments/polygon_dev/StakingRewardQsUsdPlusWeth.json'));


async function main() {

    let wallet = await initWallet(ethers);

    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);


    let stakingRewardQsUsdcWeth = await ethers.getContractAt(StakingRewardQsUsdcWeth.abi, StakingRewardQsUsdcWeth.address, wallet);
    let preOvn = await ethers.getContractAt(PreOvnToken.abi, PreOvnToken.address, wallet);

    let addresses = [];
    let values = [];
    let abis = [];

    let value = await stakingRewardQsUsdcWeth.paid(wallet.address);
    console.log('Paid: '+ value);
    console.log('Paid: '+ fromE18(value ));

    // addresses.push(preOvn.address);
    // values.push(0);
    // abis.push(preOvn.interface.encodeFunctionData('mint', [wallet.address, toE18(10000)]));
    //
    // console.log('Creating a proposal...')
    // const proposeTx = await governor.proposeExec(
    //     addresses,
    //     values,
    //     abis,
    //     ethers.utils.id("Proposal 2: Upgrade Strategies"),
    //     {
    //         maxFeePerGas: "100000000000",
    //         maxPriorityFeePerGas: "100000000000"
    //     }
    // );
    // let tx = await proposeTx.wait();
    // const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    // console.log('Proposal id ' + proposalId)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

