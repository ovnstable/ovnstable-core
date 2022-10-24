const {ethers} = require("hardhat");

let {BSC, COMMON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pl = await ethers.getContract("BscPayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await pl.setExchanger(exchange.address)).wait();

    let pools = [
        // Cone
        "0xec30da6361905b8f3e4a93513d937db992301276",  // WBNB/USD+
        "0x30f96ad4856d7e699963b589591f03710976a6e8",  // MDB+/USD+
        "0x0f8c95890b7bdecfae7990bf32f22120111e0b44",  // TETU/USD+
        "0x0fe6cf7a2687c5bddf302c5ccea901ba0bf71816",  // USD+/BUSD
        "0xdee33737634bb7612c15b10488819e88fd62f0f9",  // TIGAR/USD+
    ]

    await (await pl.setQsSyncPools(pools)).wait();

    let pancakeSkimPools = [
        "0x2BD37f67EF2894024D3ee52b20A6cB87d71B2933",  // USD+/BUSD
    ]

    await (await pl.setPancakeSkimPools(pancakeSkimPools)).wait();

    await (await pl.setPancakeDepositWallet(COMMON.rewardWallet)).wait();

    await (await pl.setUsdPlus(BSC.usdPlus)).wait();

    console.log('BscPayoutListener done');

};

module.exports.tags = [ 'SettingBscPayoutListener'];

