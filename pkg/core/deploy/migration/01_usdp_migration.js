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

module.exports = async ({deployments}) => {

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);

    let implAddress;

    console.log(`Deployer: ${wallet.address}`);

    let decimals;
    let symbol;
    let name;
    let ownerLength;
    let totalSupply;
    let exchange;

    await prepareLocalTest();
    await deployImplementation();
    await makeUpgrade();
    await migrationRun();
    await checksum();

    async function prepareLocalTest() {
        console.log('[prepareLocalTest]');
        console.log('Grant ADMIN role to DEV');

        await transferETH(10, wallet.address);

        await execTimelock(async (timelock) => {
            await usdPlus.connect(timelock).grantRole(Roles.UPGRADER_ROLE, wallet.address);
            await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address);
        });

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
        console.log(`NEW implementation: ${implAddress}`);
    }


    async function makeUpgrade() {
        console.log('[makeUpgrade]');

        decimals = await usdPlus.decimals();
        symbol = await usdPlus.symbol();
        name = await usdPlus.name();
        ownerLength = await usdPlus.ownerLength();
        totalSupply = await usdPlus.totalSupply();
        exchange = await usdPlus.exchange();

        console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
        await (await usdPlus.upgradeTo(implAddress)).wait();
        console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    }


    async function migrationRun() {
        console.log('[migrationRun]');

        usdPlus = await ethers.getContractAt('UsdPlusToken', usdPlus.address, wallet);

        await (await usdPlus.migrationInit(exchange, decimals, wallet.address)).wait();
        let size = 500;
        let length = await usdPlus.migrationBatchLength(size);
        console.log("length", length.toString());
        for (let i = 0; i < length; i++) {
            console.log(`iterate: ${i}/${length}`);
            await (await usdPlus.migrationBatch(size, i)).wait();
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
                old: ownerLength.toString(),
                new: (await usdPlus.ownerLength()).toString()
            },
            {
                name: 'totalSupply',
                old: totalSupply.toString(),
                new: (await usdPlus.totalSupply()).toString()
            },
            {
                name: 'exchange',
                old: exchange,
                new: (await usdPlus.exchange()).toString()
            },
        )

        console.table(items);
    }
};


module.exports.tags = ['Migration'];
