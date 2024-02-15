const {
    getContract,
    execTimelock,
    initWallet, getWalletAddress,
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {expect} = require("chai");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");

module.exports = async () => {

    let isLocalTest = hre.network.name === 'localhost';

    let usdPlus = await getContract('UsdPlusToken');
    let exchange = await getContract('Exchange');
    let wrapped = await getContract('WrappedUsdPlusToken');

    let usdPlusMigrationAddress = '0x388eF6587473FCEe972ba5aca5abC8A79137e6Cf';
    let usdPlusPureAddress = '0xb55838c7Ce38bbF899cb9BCcC0C1B706e18e0294';
    let wrappedPureAddress = '0x46B0Bc31238195fBdc7258f91fE848FFFDe5d123';
    let exchangeAddress = '0xff750f3870D6D98082FC60Fb5273Aee1477dFA39';
    // let ins = '0x21dC33cDc6E68484aAd323DAD1B65BA88e2dee1f';
    let startBlock = await ethers.provider.getBlockNumber();

    let roleManagerAddress = (await getContract('RoleManager')).address;
    let payoutManagerAddress = (await getContract('OptimismPayoutManager')).address;
    let decimals = await usdPlus.decimals();

    if (isLocalTest) {

        await execTimelock(async (timelock) => {
            console.log("timelock", timelock.address);
            let roleManager = await getContract('RoleManager');
            await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
            await usdPlus.connect(timelock).grantRole(Roles.UPGRADER_ROLE, timelock.address);
            await wrapped.connect(timelock).grantRole(Roles.UPGRADER_ROLE, timelock.address);
            await exchange.connect(timelock).pause();
        })

        // For redeploy migration contract

        // let factory = await ethers.getContractFactory('UsdPlusTokenMigration');
        //
        // let impl = await sampleModule.deployProxyImpl(hre, factory, {
        //     kind: 'uups',
        //     unsafeSkipStorageCheck: true,
        //     unsafeAllowRenames: true
        // }, usdPlus.address);
        //
        // usdPlusMigrationAddress = impl.impl;
    }

    let factory = await ethers.getContractFactory('UsdPlusTokenMigration');
    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address, await initWallet());

    let exchangePaused = await exchange.paused();

    console.log('Pause status');

    console.log(`Exchange.paused: ${exchangePaused}`);

    if (!exchangePaused) {
        throw new Error('Exchange or Wrapped not pause!');
    }


    console.log('====[Exchange Upgrade]====');

    console.log('1. upgradeTo');
    console.log(`Exchange implementation address: ${await getImplementationAddress(ethers.provider, exchange.address)}`);
    await execTimelock(async (timelock) => {
        await exchange.connect(timelock).upgradeTo(exchangeAddress);
    })
    console.log(`Exchange implementation address: ${await getImplementationAddress(ethers.provider, exchange.address)}`);

    console.log('2. Set PayoutManager');
    await execTimelock(async (timelock) => {
        await exchange.connect(timelock).setPayoutManager(payoutManagerAddress);
    })
    console.log(`exchange.payoutListener: ${await exchange.payoutManager()}`);
    console.log(`exchange.usdPlus:        ${await exchange.usdPlus()}`);
    console.log(`exchange.pause:          ${await exchange.paused()}`);

    console.log('====[Exchange Upgrade done]====\n\n\n');


    console.log('====[UsdPlus Migration]====');

    console.log('1. upgradeTo(migration)');
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).upgradeTo(usdPlusMigrationAddress);
    })
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    console.log('2. MigrationInit');
    await (await usdPlus.migrationInit(exchange.address, decimals, payoutManagerAddress)).wait();
    console.log(`usdPlus.decimals:       ${await usdPlus.decimals()}`);
    console.log(`usdPlus.payoutManager:  ${await usdPlus.payoutManager()}`);

    console.log('====[UsdPlus Migration done]====\n\n\n');


    console.log('====[UsdPlus Pure]====');

    console.log('1. upgradeTo(pure)');
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).upgradeTo(usdPlusPureAddress);
    })
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    usdPlus = await getContract('UsdPlusToken');
    console.log('2. SetRoleManager');
    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).setRoleManager(roleManagerAddress);
    })
    console.log(`usdPlus.roleManager:    ${await usdPlus.roleManager()}`);

    console.log('3. SetPause')
    await (await usdPlus.pause()).wait();


    console.log('====[UsdPlus Pure done]====\n\n\n');

    console.log('====[Wrapped Pure]====');
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, wrapped.address)}`);
    await execTimelock(async (timelock) => {
        await wrapped.connect(timelock).upgradeTo(wrappedPureAddress);
    })
    console.log(`usdPlus implementation address: ${await getImplementationAddress(ethers.provider, wrapped.address)}`);

    expect(roleManagerAddress).to.equal(await usdPlus.roleManager());
    expect(roleManagerAddress).to.equal(await exchange.roleManager());
    expect(payoutManagerAddress).to.equal(await usdPlus.payoutManager());
    expect(payoutManagerAddress).to.equal(await exchange.payoutManager());
    expect(decimals).to.equal(await usdPlus.decimals());
    expect(usdPlusPureAddress).to.equal(await getImplementationAddress(ethers.provider, usdPlus.address));
    expect(exchangeAddress).to.equal(await getImplementationAddress(ethers.provider, exchange.address));
    expect(wrappedPureAddress).to.equal(await getImplementationAddress(ethers.provider, wrapped.address));

    await checksum(usdPlus, exchange, wrapped, startBlock);
};


async function checksum(usdPlus, exchange, wrapped, startBlock) {

    console.log('[checksum]');
    let items = [];

    let ownerLength = await usdPlus.ownerLength();

    let walletAddress = await getWalletAddress();

    let indexFirstUser = await usdPlus.ownerAt(0);
    let indexMiddleUser = await usdPlus.ownerAt(Math.ceil(ownerLength / 2));
    let indexLastUser = await usdPlus.ownerAt(ownerLength - 1);


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
            old: (await usdPlus.ownerLength({blockTag: startBlock})).toString(),
            new: (await usdPlus.ownerLength()).toString()
        },
        {
            name: 'totalSupply',
            old: (await usdPlus.totalSupply({blockTag: startBlock})).toString(),
            new: (await usdPlus.totalSupply()).toString()
        },
        {
            name: 'totalSupplyOwners',
            old: '-',
            new: 'many'//(await usdPlus.totalSupplyOwners()).toString()
        },
        {
            name: 'exchange',
            old: (await usdPlus.exchange({blockTag: startBlock})).toString(),
            new: (await usdPlus.exchange()).toString()
        },
        {
            name: 'wrapped.getRate',
            old: (await wrapped.rate({blockTag: 	startBlock})).toString(),
            new: (await wrapped.rate()).toString()
        },
        {
            name: 'wrapped.totalSupply',
            old: (await wrapped.totalSupply({blockTag: startBlock})).toString(),
            new: (await wrapped.totalSupply()).toString()
        },
        {
            name: 'usdPlus_user_first',
            old: fromUsdPlus(await usdPlus.balanceOf(indexFirstUser, {blockTag: startBlock})),
            new: fromUsdPlus(await usdPlus.balanceOf(indexFirstUser))
        },
        {
            name: 'usdPlus_user_middle',
            old: fromUsdPlus(await usdPlus.balanceOf(indexMiddleUser, {blockTag: startBlock})),
            new: fromUsdPlus(await usdPlus.balanceOf(indexMiddleUser))
        },
        {
            name: 'usdPlus_user_last',
            old: fromUsdPlus(await usdPlus.balanceOf(indexLastUser, {blockTag: startBlock})),
            new: fromUsdPlus(await usdPlus.balanceOf(indexLastUser))
        },
        {
            name: 'usdPlus_user_dev',
            old: fromUsdPlus(await usdPlus.balanceOf(walletAddress, {blockTag: startBlock})),
            new: fromUsdPlus(await usdPlus.balanceOf(walletAddress))
        },
        {
            name: 'wrapped_user_dev',
            old: fromUsdPlus(await wrapped.balanceOf(walletAddress, {blockTag: startBlock})),
            new: fromUsdPlus(await wrapped.balanceOf(walletAddress))
        }
    )

    console.table(items);
}


module.exports.tags = ['RunMigration'];
