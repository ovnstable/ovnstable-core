const {getContract, changeWeightsAndBalance, execTimelock, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");

async function main() {

    let weights = [
        {
            "strategy": "0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },

        {
            "strategy": "0x9520aEF41161f09Dce78a8e79482b654d4FFe641",
            "name": "Pika USDC",
            "minWeight": 0,
            "targetWeight": 38,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x6C93A2A9eBC61ce664eE3D44531B76365150BFd8",
            "name": "Rubicon USDC",
            "minWeight": 0,
            "targetWeight": 11,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },

        {
            "strategy": "0x2c80d9ee6f42a9AF2f681fE569AB409Df3aa46f7",
            "name": "Rubicon USDT",
            "minWeight": 0,
            "targetWeight": 10,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },


        {
            "strategy": "0xfa5328a029575f460d9fb499B1cDCE25b69B1038",
            "name": "Rubicon DAI",
            "minWeight": 0,
            "targetWeight": 9,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x2B65fb73A3fB0E738BBE0726754801BB422fad6d",
            "name": "Beethovenx Usdc",
            "minWeight": 0,
            "targetWeight": 14,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },

        {
            "strategy": "0xd27a3640CDF245f97b739F20605e66a79160361B",
            "name": "Reaper Sonne DAI",
            "minWeight": 0,
            "targetWeight": 8,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xF3a75b6dD1A60526755A370afaB48fF3501e0D15",
            "name": "Reaper Sonne USDC",
            "minWeight": 0,
            "targetWeight": 5.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x8855e27ABE0C121c5B9e1D1572B40cab184daf21",
            "name": "Reaper Sonne USDT",
            "minWeight": 0,
            "targetWeight": 2,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]



    await execTimelock(async (timelock)=>{
        let pm = await getContract('PortfolioManager');

        await showM2M();

        weights = await convertWeights(weights);

        await pm.connect(timelock).addStrategy('0x8855e27ABE0C121c5B9e1D1572B40cab184daf21');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelock.address);
        await pm.connect(timelock).setStrategyWeights(weights);
        await pm.connect(timelock).balance();

        await showM2M();

    })
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

