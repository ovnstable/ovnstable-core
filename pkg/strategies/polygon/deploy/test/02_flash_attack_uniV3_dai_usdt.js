const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const { ethers } = require("hardhat");


module.exports = async ({deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('FlashAttackUniV3DaiUsdt', {
        from: deployer,
        args: [POLYGON.aaveProvider],
        log: true,
    });

    const attackContract = await ethers.getContract("FlashAttackUniV3DaiUsdt");

    await (await attackContract.setParams(
        {
            usdc: POLYGON.usdc,
            usdt: POLYGON.usdt,
            dai: POLYGON.dai,
            fee: 100,
            uniswapV3Router: POLYGON.uniswapV3Router
        }
    )).wait();

    console.log("FlashAttackUniV3DaiUsdt deployed");
};

module.exports.tags = ['FlashAttackUniV3DaiUsdt'];
