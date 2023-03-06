const {ethers} = require("hardhat");

let {BSC, COMMON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pl = await ethers.getContract("BscPayoutListener");
    const exchange = await ethers.getContract("Exchange");

    await (await pl.setExchanger(exchange.address)).wait();
    await (await pl.setPancakeDepositWallet(COMMON.rewardWallet)).wait();
    await (await pl.setUsdPlus(BSC.usdPlus)).wait();

    // Cone
    let qsSyncPools = [
        "0xec30da6361905b8f3e4a93513d937db992301276",  // WBNB/USD+
        "0x30f96ad4856d7e699963b589591f03710976a6e8",  // MDB+/USD+
        "0x0f8c95890b7bdecfae7990bf32f22120111e0b44",  // TETU/USD+
        "0x0fe6cf7a2687c5bddf302c5ccea901ba0bf71816",  // USD+/BUSD
        "0xdee33737634bb7612c15b10488819e88fd62f0f9",  // TIGAR/USD+
    ];
    await (await pl.setQsSyncPools(qsSyncPools)).wait();

    // Pancake
    let pancakeSkimPools = [
        "0x2BD37f67EF2894024D3ee52b20A6cB87d71B2933",  // USD+/BUSD
    ];
    await (await pl.setPancakeSkimPools(pancakeSkimPools)).wait();

    // Thena
    let thenaSkimPools = [
        '0x92573046BD4abA37d875eb45a0A1182ac63d5580', // sAMM-ETS Alpha/USD+
        '0x1F3cA66c98d682fA1BeC31264692daD4f17340BC', // sAMM-HAY/USD+
        '0x150990B9630fFe2322999e86905536E2E7e8d93f', // sAMM-USD+/CUSD
        '0xea9abc7AD420bDA7dD42FEa3C4ACd058902A5845', // sAMM-USDT/USD+
        '0x7F74D8C2A0D0997695eA121A2155e2710a6D62dc', // vAMM-USD+/THE
    ];
    let thenaSkimBribes = [
        '0x90ab86ddd5fdae0207367c2d09e10ef1fb3cb651', // sAMM-ETS Alpha/USD+
        '0x8FbF01a6D3Fef2847f2c35d9a05476eb859D6B2e', // sAMM-HAY/USD+
        '0x8828Bd1b7abc5296D3FcfEb15F58c23088410449', // sAMM-USD+/CUSD
        '0xe52917158c3C8e29Ae3B5458200cbF516E56F660', // sAMM-USDT/USD+
        '0xE4F0E1E2A6ceAeF8b076d6321702EA0e38245813', // vAMM-USD+/THE
    ];
    await (await pl.setThenaSkimPools(thenaSkimPools, thenaSkimBribes)).wait();

    console.log('BscPayoutListener setting done');
};

module.exports.tags = ['SettingBscPayoutListener'];

