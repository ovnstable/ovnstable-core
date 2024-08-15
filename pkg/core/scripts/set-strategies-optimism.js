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

    let weights = [
        {
            "strategy": "0x1a8bf92aBe1De4bDbf5fB8AF223ec5feDcefFB76",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 3.53,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x09aeE63ea7b3C81cCe0E3b047acb2878e1135EE5",
            "name": "BetaOp",
            "minWeight": 0,
            "targetWeight": 36.98,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": false
        },
        {
            "strategy": "0x0f6C2C868b94Ca6f00F77674009b34E0C9e67dB8",
            "name": "GammaOp",
            "minWeight": 0,
            "targetWeight": 37.11,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0x420B3Da53Ff4C66d818aF07Fac867CD5b0d2cF33",
            "name": "DeltaOp",
            "minWeight": 0,
            "targetWeight": 2.1,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": false
        },
        {
            "strategy": "0xc86C13b7ec3a812f30214C759646CCeE5E368955",
            "name": "Pika v4",
            "minWeight": 0,
            "targetWeight": 19.28,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": false,
            "enabledReward": true
        },
        {
            "strategy": "0x18dF2Ead431595dA94D75b0d1D444E771De6c90A",
            "name": "KyberSwap USDC/USDT",
            "minWeight": 0,
            "targetWeight": 0,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x6779a74c1E6009549837D6DD4B4EDFFa1CbEF70c",
            "name": "KyberSwap USDC/DAI",
            "minWeight": 0,
            "targetWeight": 1,
            "riskFactor": null,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        }
    ]


    await execTimelock(async (timelock) => {

        await showM2M();

        let pm = await getContract('PortfolioManager');
        await pm.connect(timelock).grantRole(await pm.PORTFOLIO_AGENT_ROLE(), timelock.address);
        console.log("grantRole PORTFOLIO_AGENT_ROLE done");

        let StrategyKyberSwapUsdcDai = await getContract('StrategyKyberSwapUsdcDai', 'localhost');
        await StrategyKyberSwapUsdcDai.connect(timelock).updatePoolId(42);
        console.log("StrategyKyberSwapUsdcDai updatePoolId done");

        await StrategyKyberSwapUsdcDai.connect(timelock).setSlippages(100, 20, 4);
        console.log("StrategyKyberSwapUsdcDai setSlippages done");

        let StrategyKyberSwapUsdcUsdt = await getContract('StrategyKyberSwapUsdcUsdt', 'localhost');
        await StrategyKyberSwapUsdcUsdt.connect(timelock).updatePoolId(43);
        console.log("StrategyKyberSwapUsdcUsdt updatePoolId done");

        await StrategyKyberSwapUsdcUsdt.connect(timelock).setSlippages(100, 20, 4);
        console.log("StrategyKyberSwapUsdcUsdt setSlippages done");

        await pm.connect(timelock).removeStrategy('0x9520aEF41161f09Dce78a8e79482b654d4FFe641');
        await pm.connect(timelock).removeStrategy('0x39A6CA4bbe0906E7ad4eBFC2D264A57420D54312');
        await pm.connect(timelock).removeStrategy('0x4395ab761ebaA01ec22940F32568845C2a8bAf3e');
        await pm.connect(timelock).removeStrategy('0xcf8EC04D6b69Cee2eA39695E475bd73253395938');
        await pm.connect(timelock).removeStrategy('0x3bD1792BC3F8a6727285Fe12DB510e4cbDEeA7E6');
        await pm.connect(timelock).removeStrategy('0xaB386160E7047d048a83aF419b7E0c2431d7F5fe');
        await pm.connect(timelock).removeStrategy('0xfe1dDD9b89E5Ec5Edf14cE2bba861774Cf70C53E');
        await pm.connect(timelock).removeStrategy('0x99A8cCf9F1dd4920A34cfb6E6AD33d10d3d7483b');
        await pm.connect(timelock).removeStrategy('0xad0456098e5F5f3AC758331e13eA661ceA7FD02F');
        await pm.connect(timelock).removeStrategy('0x50048C396E821E5F881c6D0e0b616945826124Bc');
        await pm.connect(timelock).removeStrategy('0x2955Ba0Fa44202090d840D36b2CaE53036d018Ec');

        weights = await convertWeights(weights);
        await pm.connect(timelock).setStrategyWeights(weights);
        console.log("setStrategyWeights done");

        await showM2M();

        await pm.connect(timelock).balance();
        console.log("balance done");

        await showM2M();

    })
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

