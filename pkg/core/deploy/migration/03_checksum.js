const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH, getERC20ByAddress
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset, toE6, toAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {BigNumber} = require("ethers");

module.exports = async ({deployments}) => {

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');

    let startBlock = 1024597;

    console.log('[checksum]');
    let items = [];

    let ownerLength = await usdPlus.ownerLength();
    items.push(
        {
            name: 'Decimals',
            old: await usdPlus.decimals({blockTag: startBlock}),
            new: await usdPlus.decimals()
        },
        {
            name: 'Symbol',
            old: await usdPlus.symbol({blockTag: startBlock}),
            new: await usdPlus.symbol()
        },
        {
            name: 'Name',
            old: await usdPlus.name({blockTag: startBlock}),
            new: await usdPlus.name()
        },
        {
            name: 'ownerLength',
            old: (await usdPlus.ownerLength({blockTag: 	startBlock})).toString(),
            new: (await usdPlus.ownerLength()).toString()
        },
        {
            name: 'totalSupply',
            old: (await usdPlus.totalSupply({blockTag: 	startBlock})).toString(),
            new: (await usdPlus.totalSupply()).toString()
        },
        {
            name: 'exchange',
            old: (await usdPlus.exchange({blockTag: 	startBlock})).toString(),
            new: (await usdPlus.exchange()).toString()
        },
        {
            name: 'user_first',
            old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(0, {blockTag: 	startBlock}))),
            new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(0)))
        },
        {
            name: 'user_middle',
            old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(Math.ceil(ownerLength / 2),  {blockTag: 	startBlock}))),
            new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(Math.ceil(ownerLength / 2))))
        },
        {
            name: 'user_last',
            old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength - 1, {blockTag: 	startBlock}))),
            new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength - 1)))
        }
    )

    console.table(items);

};


module.exports.tags = ['CheckSum'];
