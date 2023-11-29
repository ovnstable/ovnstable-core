const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");

module.exports = async ({deployments}) => {

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusTokenOld')).connect(wallet);

    let implAddress;

    console.log(`Deployer: ${wallet.address}`);

    let decimals;
    let symbol;
    let name;
    let ownerLength;
    let totalSupply;
    let exchange;
    let userFirstBalance;
    let userLastBalance;
    let userMiddleBalance;

    if (hre.network.name === 'localhost'){
        await evmCheckpoint('task', hre.network.provider);
    }

    try {
        // await prepareLocalTest();
        // await deployImplementation();
        // await makeUpgrade();
        // await migrationRun();
        await checksum();
    } catch (e) {
        console.log(`Error: ${e}`);
    }

    if (hre.network.name === 'localhost'){
        await evmRestore('task', hre.network.provider);
    }

    async function prepareLocalTest() {

        if (hre.network.name === 'localhost'){
            console.log('[prepareLocalTest]');
            console.log('Grant ADMIN role to DEV');
            await transferETH(10, wallet.address);

            await execTimelock(async (timelock) => {
                await usdPlus.connect(timelock).grantRole(Roles.UPGRADER_ROLE, wallet.address);
                await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address);
            });
        }

    }


    async function deployImplementation() {
        console.log('[deployImplementation]');

        let factory = await ethers.getContractFactory('UsdPlusToken');
        let impl = await sampleModule.deployProxyImpl(hre, factory, {
            kind: 'uups',
            unsafeSkipStorageCheck: true,
            unsafeAllowRenames: true
        }, usdPlus.address);

        implAddress = impl.impl;
        console.log(`NEW implementation:              ${implAddress}`);
    }


    async function makeUpgrade() {
        console.log('[makeUpgrade]');

        decimals = await usdPlus.decimals();
        symbol = await usdPlus.symbol();
        name = await usdPlus.name();
        ownerLength = await usdPlus.ownerLength();
        totalSupply = await usdPlus.totalSupply();
        exchange = await usdPlus.exchange();

        userFirstBalance = fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(0)));
        userLastBalance = fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength - 1)));
        userMiddleBalance = fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength / 2)));

        console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
        await (await usdPlus.upgradeTo(implAddress)).wait();
        console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    }


    async function migrationRun() {
        console.log('[migrationRun]');

        usdPlus = await ethers.getContractAt('UsdPlusToken', usdPlus.address, wallet);

        console.log(`Owners: ${ownerLength}`);

        // await (await usdPlus.migrationInit(exchange, decimals, wallet.address)).wait();
        let size = 500;
        let length = await usdPlus.migrationBatchLength(size);
        console.log("length", length.toString());

        let gasUsed = [];
        for (let i = 1; i < length; i++) {
            console.log(`iterate: ${i}/${length}`);
            let tx = await (await usdPlus.migrationBatch(size, i)).wait();

            gasUsed.push(tx.gasUsed);
        }


    }


    async function checksum(){
        console.log('[checksum]');
        let items = [];
        items.push(
            {
                name: 'Decimals',
                old: decimals,
                new: await usdPlus.decimals()
            },
            {
                name: 'Symbol',
                old: symbol,
                new: await usdPlus.symbol()
            },
            {
                name: 'Name',
                old: name,
                new: await usdPlus.name()
            },
            {
                name: 'ownerLength',
                old: (await usdPlus.ownerLength({blockTag: 	1012017})).toString(),
                new: (await usdPlus.ownerLength()).toString()
            },
            {
                name: 'totalSupply',
                old: (await usdPlus.totalSupply({blockTag: 	1012017})).toString(),
                new: (await usdPlus.totalSupply()).toString()
            },
            {
                name: 'exchange',
                old: (await usdPlus.exchange({blockTag: 	1012017})).toString(),
                new: (await usdPlus.exchange()).toString()
            },
            {
                name: 'user_first',
                old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(0, {blockTag: 	1012017}))),
                new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(0)))
            },
            // {
            //     name: 'user_middle',
            //     old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength / 2,  {blockTag: 	1012023}))),
            //     new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength / 2)))
            // },
            // {
            //     name: 'user_last',
            //     old: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength - 1, {blockTag: 	1012017}))),
            //     new: fromAsset(await usdPlus.balanceOf(await usdPlus.ownerAt(ownerLength - 1)))
            // }
        )

        console.table(items);


        if (hre.network.name === 'localhost'){
            console.log(`TotalSupplyBefore: ${await usdPlus.totalSupply()}`);
            await testUsdPlus('Migration');
            console.log(`TotalSupplyAfter:  ${await usdPlus.totalSupply()}`);
        }

    }
};


module.exports.tags = ['Migration'];
