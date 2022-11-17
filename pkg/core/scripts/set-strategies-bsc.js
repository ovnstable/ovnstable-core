const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights =[
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Venus BUSD",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 50,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xb9D731080b9e862C3a6B7eaF0E5a086614d0a2d9",
            "name": "Synapse BUSD",
            "minWeight": 0,
            "targetWeight": 55.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x621409Ad21B486eA8688c5608abc904Cd8DB8e9b",
            "name": "Wombex USDC",
            "minWeight": 0,
            "targetWeight": 10,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x53fF0d71645D106E058d83404ccD975924c26dCB",
            "name": "Wombex USDT",
            "minWeight": 0,
            "targetWeight": 13,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xFe7f3FEa8972313F859194EE00158798be3ED108",
            "name": "Wombex BUSD",
            "minWeight": 0,
            "targetWeight": 19,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]


    weights = await convertWeights(weights);

    await execTimelock(async (timelock)=>{

        await showM2M();
        let pm = await getContract('PortfolioManager');

//        await pm.connect(timelock).addStrategy('0x53fF0d71645D106E058d83404ccD975924c26dCB');
//        await pm.connect(timelock).removeStrategy('0x6A9d96f5eaCa97D61AD8f82C98591462Af9a7fc8');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), (await initWallet()).address);
        await pm.setStrategyWeights(weights);
        await pm.balance();
        await showM2M();
    });

    // await changeWeightsAndBalance(weights);


}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

