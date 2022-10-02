const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc2c84ca763572c6aF596B703Df9232b4313AD4e3",
            "name": "Echidna USDC",
            "minWeight": 0,
            "targetWeight": 30,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x22EcC33bF964eD13d18419FDaE725919a757f230",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 67.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward":false
        },

    ]
    weights = await convertWeights(weights);

    // await changeWeightsAndBalance(weights);


}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

