const {getContract, changeWeightsAndBalance, execTimelock, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");

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
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x6C93A2A9eBC61ce664eE3D44531B76365150BFd8",
            "name": "Rubicon USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },

        {
            "strategy": "0x2B65fb73A3fB0E738BBE0726754801BB422fad6d",
            "name": "Beets USDC",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x2c80d9ee6f42a9AF2f681fE569AB409Df3aa46f7",
            "name": "Rubicon USDT",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },


        {
            "strategy": "0xfa5328a029575f460d9fb499B1cDCE25b69B1038",
            "name": "Rubicon DAI",
            "minWeight": 0,
            "targetWeight": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
    ]



    let exchange = await getContract('Exchange' );
    let pm = await getContract('PortfolioManager' );


    await execTimelock(async (timelock)=>{

        await showM2M();

        weights = await convertWeights(weights);

        // await pm.connect(timelock).addStrategy('0x2C74452B89e078858eAe7bC829C18e62E920fe27');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelock.address);
        await pm.connect(timelock).setStrategyWeights(weights);
        // await pm.connect(timelock).balance();

        await showM2M();

    })
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

