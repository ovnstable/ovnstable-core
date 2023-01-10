const {getContract, changeWeightsAndBalance, execTimelock, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");

async function main() {

    let weights = [{
        "strategy": "0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76",
        "name": "Aave",
        "minWeight": 0,
        "targetWeight": 2.49,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }, {
        "strategy": "0x9520aEF41161f09Dce78a8e79482b654d4FFe641",
        "name": "Pika USDC",
        "minWeight": 0,
        "targetWeight": 27,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x6C93A2A9eBC61ce664eE3D44531B76365150BFd8",
        "name": "Rubicon USDC",
        "minWeight": 0,
        "targetWeight": 7,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x2c80d9ee6f42a9AF2f681fE569AB409Df3aa46f7",
        "name": "Rubicon USDT",
        "minWeight": 0,
        "targetWeight": 7,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xfa5328a029575f460d9fb499B1cDCE25b69B1038",
        "name": "Rubicon DAI",
        "minWeight": 0,
        "targetWeight": 9,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x2B65fb73A3fB0E738BBE0726754801BB422fad6d",
        "name": "Beethovenx USDC",
        "minWeight": 0,
        "targetWeight": 4.5,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }, {
        "strategy": "0xd27a3640CDF245f97b739F20605e66a79160361B",
        "name": "Reaper-Sonne DAI",
        "minWeight": 0,
        "targetWeight": 10,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xF3a75b6dD1A60526755A370afaB48fF3501e0D15",
        "name": "Reaper-Sonne USDC",
        "minWeight": 0,
        "targetWeight": 10.5,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x8855e27ABE0C121c5B9e1D1572B40cab184daf21",
        "name": "Reaper-Sonne USDT",
        "minWeight": 0,
        "targetWeight": 11,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x1B797450434e0DEdA4D2c3198eEe1d677d3dCe4C",
        "name": "Not found",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": null,
        "maxWeight": 0,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x24f06E7B44426235ff097CB098f0E78E90F12A09",
        "name": "ETS BETA+",
        "minWeight": 0,
        "targetWeight": 0.5,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xBED45d30B6A20d77621965E42C855E1060b4A7AF",
        "name": "Not found",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": null,
        "maxWeight": 0,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xDCbf5A96452638488edbDa18449b6245B065Ebea",
        "name": "Beethovenx Sonne",
        "minWeight": 0,
        "targetWeight": 10.4,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0xcAAf507138cA294473018cD0182A3a534284AaA3",
        "name": "ETS ALPHA+",
        "minWeight": 0,
        "targetWeight": 0.61,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": false
    }]




    await execTimelock(async (timelock)=>{
        let pm = await getContract('PortfolioManager');

        await showM2M();

        weights = await convertWeights(weights);

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

