const {ethers} = require("hardhat");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createSkim, createBribe, createCustom, createBribeWithFee} = require("@overnight-contracts/common/utils/payoutListener");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const BigNumber = require('bignumber.js');
const {COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async () => {

    const pl = await getContract("OptimismPayoutListener", 'optimism');

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

    let items = [];

    items.push(...velodrome());

    await (await pl.addItems(items)).wait();

    console.log('Optimism skim setting done');

    function velodrome() {

        let dex = 'Velodrome';

        let items = [];
        items.push(createSkim('0x4bAc09070C9D83B2953a4CE9262165576Ac01318', usdPlus.address, 'USDC/USD+', dex));
        return items;
    }
 
};

module.exports.tags = ['SettingOptimismSkim'];

