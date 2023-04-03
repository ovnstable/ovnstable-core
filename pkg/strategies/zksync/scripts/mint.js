const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");
const {ZKSYNC} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");


async function main() {


    let strategy = await getContract('StrategyNexon');

    let pm = await getContract('PortfolioManager', 'zksync');


    let weights = [
        {
            "strategy": "0x5e3D0275496665514495659217a124d671098663",
            "name": "Nexon",
            "minWeight": 0,
            "targetWeight": 100,
            "riskFactor": 0,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },

    ]


    weights = await convertWeights(weights);

    // await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, await getWalletAddress())).wait();
    // await (await pm.addStrategy(strategy.address)).wait();
    // await (await pm.setCashStrategy(strategy.address)).wait();
    await (await pm.setStrategyWeights(weights)).wait();


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

