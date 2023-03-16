const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {COMMON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('ArbitrumDaiPayoutListener', deployments, save);

    const pl = await ethers.getContract("ArbitrumDaiPayoutListener");
    const exchange = await ethers.getContract("Exchange");
    const usdPlus = await ethers.getContract("UsdPlusToken");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setUsdPlus(usdPlus.address)).wait();
    await (await pl.setRewardWallet(COMMON.rewardWallet)).wait();

    let solidLizardPools = [
        '0x2423d642C53939a463F84e14C6a9fFC6fd8f4334', // sAMM-USD+/DAI+
    ];

    await (await pl.setSolidLizardPools(solidLizardPools)).wait();

    let sterlingPools = [
        '0x58C1b1d1DD5e27E929ab159f485E9625ca24969C', // sAMM-DAI/DAI+
        '0xB6490141901FE1a16af2ADA782BA897999683757', // sAMM-USD+/DAI+
    ];

    await (await pl.setSterlingPools(sterlingPools)).wait();

    let ramsesPools = [
        '0xeb9153afBAa3A6cFbd4fcE39988Cea786d3F62bb', // sAMM-USD+/DAI+
    ];

    await (await pl.setRamsesPools(ramsesPools)).wait();

    console.log('ArbitrumDaiPayoutListener setting done');
};

module.exports.tags = ['ArbitrumDaiPayoutListener'];
