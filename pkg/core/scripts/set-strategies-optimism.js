const {getContract, changeWeightsAndBalance} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 100,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x9520aEF41161f09Dce78a8e79482b654d4FFe641",
            "name": "Pika USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x6C93A2A9eBC61ce664eE3D44531B76365150BFd8",
            "name": "Rubicon USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x2c80d9ee6f42a9AF2f681fE569AB409Df3aa46f7",
            "name": "Rubicon USDT",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },


        {
            "strategy": "0xfa5328a029575f460d9fb499B1cDCE25b69B1038",
            "name": "Rubicon DAI",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]

    await changeWeightsAndBalance(weights);
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

