const {
    getContract,
    execTimelock,
    initWallet,
    getWalletAddress,
    getPrice,
    transferETH,
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { expect } = require("chai");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {
    fromAsset,
    fromUsdPlus,
} = require("@overnight-contracts/common/utils/decimals");

const time = "0xD09ea5E276a84Fa73AE14Ae794524558d43F7fdC";

module.exports = async () => {
    let isLocalTest = hre.network.name === "localhost";

    if (isLocalTest) await transferETH(10, await getWalletAddress());

    let usdPlus = await getContract("UsdPlusToken", "zksync");
    let exchange = await getContract("Exchange", "zksync");

    let usdPlusMigrationAddress = "0x7F7D9c7861761b9F056b163034125060839F6B7b";
    let usdPlusPureAddress = "0x01617c1FB5B5Dae0CDF315c46c9D9edFac8475fF";
    let exchangeAddress = "0x326A9D77a0e03678C0d8a6DeB6D5109246F25009";
    let startBlock = await ethers.provider.getBlockNumber();

    console.log("Start from block", startBlock);
    let roleManagerAddress = (await getContract("RoleManager")).address;
    let payoutManagerAddress = (await getContract("ZkSyncPayoutManager"))
        .address;
    let decimals = await usdPlus.decimals();
    const deployer = await getWalletAddress();
    /*     console.log('Validate usdPlus roles')
    const oldDev = '0x5CB01385d3097b6a189d1ac8BA3364D900666445'
    const veryOldDev = '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD'
    const dev = '0x05129e3ce8c566de564203b0fd85111bbd84c424'
    const time = '0xD09ea5E276a84Fa73AE14Ae794524558d43F7fdC'
    console.log('Admin Dev 1', await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, veryOldDev))
    console.log('Admin Dev 2', await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, oldDev))
    console.log('Admin Dev 3', await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, dev))
    console.log('Admin Timelock', await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, time))
    console.log('Upgrader Dev 1', await usdPlus.hasRole(Roles.UPGRADER_ROLE, veryOldDev))
    console.log('Upgrader Dev 2', await usdPlus.hasRole(Roles.UPGRADER_ROLE, oldDev))
    console.log('Upgrader Dev 3', await usdPlus.hasRole(Roles.UPGRADER_ROLE, dev))
    console.log('Upgrader Timelock', await usdPlus.hasRole(Roles.UPGRADER_ROLE, time)) */
    console.log("====[Grant role to the timelock]====");
    if (await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, deployer))
        if (!(await usdPlus.hasRole(Roles.DEFAULT_ADMIN_ROLE, time))) {
            await (await usdPlus.grantRole(Roles.UPGRADER_ROLE, time)).wait();
            await (
                await usdPlus.grantRole(Roles.DEFAULT_ADMIN_ROLE, time)
            ).wait();
        }

    let factory = await ethers.getContractFactory("UsdPlusTokenMigration");
    usdPlus = await ethers.getContractAt(
        factory.interface,
        usdPlus.address,
        await initWallet(),
    );

    console.log("====[Exchange Upgrade]====");
    console.log("1. upgradeTo");
    console.log(
        `Exchange implementation address was: ${await getImplementationAddress(ethers.provider, exchange.address)}`,
    );
    await execTimelock(async (timelock) => {
        await (
            await exchange
                .connect(timelock)
                .upgradeTo(exchangeAddress, await getPrice())
        ).wait();
    });
    console.log(
        `Exchange implementation address now: ${await getImplementationAddress(ethers.provider, exchange.address)}`,
    );
    console.log("2. Set PayoutManager");
    let exMethodsAbi = [
        {
            type: "function",
            stateMutability: "nonpayable",
            name: "setPayoutManager",
            inputs: [{ type: "address" }],
        },
        {
            inputs: [],
            name: "payoutManager",
            outputs: [
                {
                    internalType: "contract IPayoutManager",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [],
            name: "roleManager",
            outputs: [
                {
                    internalType: "contract IRoleManager",
                    name: "",
                    type: "address",
                },
            ],
            stateMutability: "view",
            type: "function",
        },
    ];
    let exContract = new ethers.Contract(
        exchange.address,
        exMethodsAbi,
        ethers.provider.getSigner(time),
    );

    console.log(
        `exchange.payoutListener was: ${await exContract.payoutManager()}`,
    );
    await execTimelock(async (timelock) => {
        await (
            await exContract
                .connect(timelock)
                .setPayoutManager(payoutManagerAddress, await getPrice())
        ).wait();
    });
    console.log(
        `exchange.payoutListener now: ${await exContract.payoutManager()}`,
    );
    console.log(`exchange.usdPlus:        ${await exchange.usdPlus()}`);
    console.log("====[Exchange Upgrade done]====\n\n\n");

    console.log("====[UsdPlus Migration]====");
    console.log("1. upgradeTo(migration)");
    console.log(
        `usdPlus implementation address was: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`,
    );
    await execTimelock(async (timelock) => {
        await (
            await usdPlus
                .connect(timelock)
                .upgradeTo(usdPlusMigrationAddress, await getPrice())
        ).wait();
    });
    console.log(
        `usdPlus implementation address now: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`,
    );
    console.log("2. MigrationInit");
    console.log(`usdPlus.decimals was:       ${await usdPlus.decimals()}`);
    console.log(`usdPlus.payoutManager was:  ${await usdPlus.payoutManager()}`);
    await execTimelock(async (timelock) => {
        await (
            await usdPlus.migrationInit(
                exchange.address,
                decimals,
                payoutManagerAddress,
            )
        ).wait();
    });
    console.log(`usdPlus.decimals now:       ${await usdPlus.decimals()}`);
    console.log(`usdPlus.payoutManager now:  ${await usdPlus.payoutManager()}`);
    console.log("====[UsdPlus Migration done]====\n\n\n");

    console.log("====[UsdPlus Pure]====");
    console.log("1. upgradeTo(pure)");
    console.log(
        `usdPlus implementation address was: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`,
    );
    await execTimelock(async (timelock) => {
        await (
            await usdPlus.connect(timelock).upgradeTo(usdPlusPureAddress, {
                gasPrice: "1000000000000000000",
            })
        ).wait();
    });
    console.log(
        `usdPlus implementation address now: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`,
    );
    console.log("2. SetRoleManager");
    await execTimelock(async (timelock) => {
        await (
            await usdPlus
                .connect(timelock)
                .setRoleManager(roleManagerAddress, await getPrice())
        ).wait();
        await (
            await usdPlus
                .connect(timelock)
                .setPayoutManager(payoutManagerAddress, await getPrice())
        ).wait();
    });
    console.log(`usdPlus.roleManager:    ${await usdPlus.roleManager()}`);
    console.log("====[UsdPlus Pure done]====\n\n\n");
    console.log("Validate RoleManager address in UsdPlusToken");
    expect(roleManagerAddress).to.equal(await usdPlus.roleManager());
    console.log("Validate RoleManager address in Exchange");
    expect(roleManagerAddress).to.equal(await exContract.roleManager());
    console.log("Validate PayoutManager address in UsdPlusToken");
    expect(payoutManagerAddress).to.equal(await usdPlus.payoutManager());
    console.log("Validate PayoutManager address in Exchange");
    expect(payoutManagerAddress).to.equal(await exContract.payoutManager());
    console.log("Validate decimals");
    expect(decimals).to.equal(await usdPlus.decimals());
    console.log("Validate pure token implementation address");
    expect(usdPlusPureAddress).to.equal(
        await getImplementationAddress(ethers.provider, usdPlus.address),
    );
    console.log("Validate exchange address");
    expect(exchangeAddress).to.equal(
        await getImplementationAddress(ethers.provider, exchange.address),
    );
    console.log("Current block is:", await ethers.provider.getBlockNumber());
    await checksum(usdPlus, exchange, startBlock);
};

async function checksum(usdPlus, exchange, startBlock) {
    console.log("[checksum]");
    let items = [];

    let ownerLength = await usdPlus.ownerLength();

    let walletAddress = await getWalletAddress();

    let indexFirstUser = await usdPlus.ownerAt(0);
    let indexMiddleUser = await usdPlus.ownerAt(Math.ceil(ownerLength / 2));
    let indexLastUser = await usdPlus.ownerAt(ownerLength - 1);

    items.push(
        {
            name: "Decimals",
            old: await usdPlus.decimals({ blockTag: startBlock }),
            new: await usdPlus.decimals(),
        },
        {
            name: "Symbol",
            old: await usdPlus.symbol({ blockTag: startBlock }),
            new: await usdPlus.symbol(),
        },
        {
            name: "Name",
            old: await usdPlus.name({ blockTag: startBlock }),
            new: await usdPlus.name(),
        },
        {
            name: "ownerLength",
            old: (
                await usdPlus.ownerLength({ blockTag: startBlock })
            ).toString(),
            new: (await usdPlus.ownerLength()).toString(),
        },
        {
            name: "totalSupply",
            old: (
                await usdPlus.totalSupply({ blockTag: startBlock })
            ).toString(),
            new: (await usdPlus.totalSupply()).toString(),
        },
        {
            name: "totalSupplyOwners",
            old: "-",
            new: "many", //(await usdPlus.totalSupplyOwners()).toString()
        },
        {
            name: "exchange",
            old: (await usdPlus.exchange({ blockTag: startBlock })).toString(),
            new: (await usdPlus.exchange()).toString(),
        },

        {
            name: "usdPlus_user_first",
            old: fromUsdPlus(
                await usdPlus.balanceOf(indexFirstUser, {
                    blockTag: startBlock,
                }),
            ),
            new: fromUsdPlus(await usdPlus.balanceOf(indexFirstUser)),
        },
        {
            name: "usdPlus_user_middle",
            old: fromUsdPlus(
                await usdPlus.balanceOf(indexMiddleUser, {
                    blockTag: startBlock,
                }),
            ),
            new: fromUsdPlus(await usdPlus.balanceOf(indexMiddleUser)),
        },
        {
            name: "usdPlus_user_last",
            old: fromUsdPlus(
                await usdPlus.balanceOf(indexLastUser, {
                    blockTag: startBlock,
                }),
            ),
            new: fromUsdPlus(await usdPlus.balanceOf(indexLastUser)),
        },
        {
            name: "usdPlus_user_dev",
            old: fromUsdPlus(
                await usdPlus.balanceOf(walletAddress, {
                    blockTag: startBlock,
                }),
            ),
            new: fromUsdPlus(await usdPlus.balanceOf(walletAddress)),
        },
    );

    console.table(items);
}

module.exports.tags = ["RunMigrationZkSync"];
