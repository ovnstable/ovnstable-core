const {
    getContract,
    changeWeightsAndBalance,
    execTimelock,
    convertWeights,
    showM2M
} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");

async function main() {

    let weights = [{
        "strategy": "0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76",
        "name": "Aave",
        "minWeight": 0,
        "targetWeight": 3.2,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": true
    }, {
        "strategy": "0x9520aEF41161f09Dce78a8e79482b654d4FFe641",
        "name": "Pika USDC",
        "minWeight": 0,
        "targetWeight": 30.9,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": true
    }, {
        "strategy": "0x39A6CA4bbe0906E7ad4eBFC2D264A57420D54312",
        "name": "ETS Epsilon",
        "minWeight": 0,
        "targetWeight": 11,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x4395ab761ebaA01ec22940F32568845C2a8bAf3e",
        "name": "ETS Zeta",
        "minWeight": 0,
        "targetWeight": 15,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xcf8EC04D6b69Cee2eA39695E475bd73253395938",
        "name": "ETS IOTA",
        "minWeight": 0,
        "targetWeight": 12.39,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": true,
        "enabledReward": false
    }, {
        "strategy": "0x3bD1792BC3F8a6727285Fe12DB510e4cbDEeA7E6",
        "name": "ETS LAMBDA",
        "minWeight": 0,
        "targetWeight": 14.15,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x9fD56B853C73888B0B3d1B41e6695C4eeE12a344",
        "name": "ETS THETA",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xf967addBB57143d92Dc08D72660Bf00DFBc70Eae",
        "name": "Velodrome USDC/DAI",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xf71121B4d0692A1F9d90eb1Bc44B4AE917D4f2F1",
        "name": "ETS MU",
        "minWeight": 0,
        "targetWeight": 0.8,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0x0B287606f1867Be9D0435089CB08FAa16109d31D",
        "name": "Sushiswap USDC/USDT",
        "minWeight": 0,
        "targetWeight": 0,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xB090aFe2AAC35778706Bf447A52aD5C69604180F",
        "name": "ETS Nu",
        "minWeight": 0,
        "targetWeight": 5,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xaB386160E7047d048a83aF419b7E0c2431d7F5fe",
        "name": "ETS XI",
        "minWeight": 0,
        "targetWeight": 6.2,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }, {
        "strategy": "0xfe1dDD9b89E5Ec5Edf14cE2bba861774Cf70C53E",
        "name": "ETS OMICRON",
        "minWeight": 0,
        "targetWeight": 1.36,
        "riskFactor": null,
        "maxWeight": 100,
        "enabled": false,
        "enabledReward": false
    }]


    await execTimelock(async (timelock) => {
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

