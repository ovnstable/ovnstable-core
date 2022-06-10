const {
    getContract, getPrice, changeWeightsAndBalance
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");

async function main() {


    let weights = [
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 5,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x50D3560397864a3c7a24116D0dcd27A27Ef852c7",
            "name": "Vector USDC",
            "minWeight": 0,
            "targetWeight": 50,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0xc2c84ca763572c6aF596B703Df9232b4313AD4e3",
            "name": "Echidna USDC",
            "minWeight": 0,
            "targetWeight": 47.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]


    weights = weights.map(value => {

        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    // await changeWeightsAndBalance(weights);
    await createProposal(weights);
    // await setWeights(weights);

}

async function createProposal(weights, weightsNew) {
    let governor = await getContract('OvnGovernor');
    let pm = await getContract('PortfolioManager');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [weights]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('balance', []));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        hre.ethers.utils.id("Proposal 2: Upgrade Strategies"),
        await getPrice()
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)

}


async function setWeights(weights) {
    let pm = await getContract('PortfolioManager', 'avalanche');

    await (await pm.setStrategyWeights(weights)).wait();
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

