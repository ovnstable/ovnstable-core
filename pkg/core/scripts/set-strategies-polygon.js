const {changeWeightsAndBalance, getContract, getPrice, upgradeStrategy, showM2M} = require("@overnight-contracts/common/utils/script-utils");

const hre = require('hardhat');
const {execProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {


    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 5,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x4F46fdDa6e3BE4bcb1eBDD3c8D5697F6F64ae69b",
            "name": "Arrakis USDC/USDT",
            "minWeight": 0,
            "targetWeight": 20,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0xaF7800Ee99ABF99986978B0D357E5f6813aF8638",
            "name": "Dodo USDC",
            "minWeight": 0,
            "targetWeight": 28.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
            "name": "Tetu USDC",
            "minWeight": 0,
            "targetWeight": 1.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
            "name": "Dystopia USDC/USDT",
            "minWeight": 0,
            "targetWeight": 47.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xD339B3291f7545967bF0eE0ABE967435598917C5",
            "name": "Dystopia USDC/DAI",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        }
    ]


    weights = weights.map(value => {

        delete value.name
        value.targetWeight = value.targetWeight * 1000;
        value.maxWeight = value.maxWeight * 1000;

        return value;
    })

    await changeWeightsAndBalance(weights);
    // await createProposal(weights);

}





async function createProposal(weights){
    let governor = await getContract('OvnGovernor', 'polygon');
    let pm = await getContract('PortfolioManager', 'polygon');

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


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

