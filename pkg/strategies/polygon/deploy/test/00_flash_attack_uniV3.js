const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const { ethers } = require("hardhat");


module.exports = async ({deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('FlashAttackUniV3', {
        from: deployer,
        args: [POLYGON.aaveProvider],
        log: true,
    });

    const attackContract = await ethers.getContract("FlashAttackUniV3");

    await (await attackContract.setParams(
        {
            usdc: POLYGON.usdc,
            usdt: POLYGON.usdt,
            dai: POLYGON.dai,
            fee: 100,
            uniswapV3Router: POLYGON.uniswapV3Router
        }
    )).wait();

    console.log("FlashAttackBalanceUsdc deployed");
};

module.exports.tags = ['FlashAttackUniV3'];
