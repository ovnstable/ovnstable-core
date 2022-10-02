const {getContract, changeWeightsAndBalance, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0xA2007Ae378d95C7c5Fe9f166DB17307d32cb8893",
            "name": "Venus",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xb9D731080b9e862C3a6B7eaF0E5a086614d0a2d9",
            "name": "Synapse",
            "minWeight": 0,
            "targetWeight": 50,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0xed197258b388AfaAD5f0D46B608B583E395ede92",
            "name": "Unknown BUSD/USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward":false
        },
        {
            "strategy": "0x6A9d96f5eaCa97D61AD8f82C98591462Af9a7fc8",
            "name": "Unknown BUSD/TUSD",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x9D430C0A05da519335ee022ECF8f7690F1d402Ba",
            "minWeight": 0,
            "targetWeight": 47.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
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

