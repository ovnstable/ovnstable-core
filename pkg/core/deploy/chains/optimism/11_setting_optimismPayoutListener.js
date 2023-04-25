const {ethers} = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");


module.exports = async () => {

    const pl = await ethers.getContract("OptimismPayoutListener");

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

    let items = [];

    items.push(...velodrome());

    await (await pl.addItems(items)).wait();

//    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'optimism')).address)).wait();
//    await (await pl.grantRole(Roles.EXCHANGER, (await getContract('Exchange', 'optimism_dai')).address)).wait();

    console.log('OptimismPayoutListener setting done');

    function velodrome() {

        let dex = 'Velodrome';

        let items = [];
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', usdPlus.address, 'sAMM-USD+/DAI+', dex));
        items.push(createSkim('0x69C28d5BbE392eF48C0dC347C575023dAf0CD243', daiPlus.address, 'sAMM-USD+/DAI+', dex));

        items.push(createSkim('0x67124355cce2ad7a8ea283e990612ebe12730175', usdPlus.address, 'sAMM-USD+/USDC', dex));
        items.push(createSkim('0xf2438edf9d5db2dbc6866ef01c9eb7ca1ca8ad13', usdPlus.address, 'vAMM-USD+/USDC', dex));
        items.push(createSkim('0xa99817d2d286C894F8f3888096A5616d06F20d46', usdPlus.address, 'vAMM-USD+/DOLA', dex));

        items.push(createBribe('0x8a9Cd3dce710e90177B4332C108E159a15736A0F', usdPlus.address, 'vAMM-USD+/LUSD', dex, '0x41a7540ec8cb3afafe16a834abe0863f22016ec0'));

        items.push(createBribe('0xDf4bB088B1F02881AD4497b6FA7C1E4F81B61C0a', usdPlus.address, ' sAMM-USD+/WETH/USDC', dex, '0x35F4Ea9Fa8a081C8Fad8033cb93877bc621c8Ee0'));

        items.push(createBribe('0x98dc12979a34ee2f7099b1cbd65f9080c5a3284f', usdPlus.address, ' vAMM-wstWETH/USD+', dex, '0xAd6d543C3015fF9833aC057312e4562b791334b2'));

        return items;
    }


};

module.exports.tags = ['SettingOptimismPayoutListener'];

