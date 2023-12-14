const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {
    getContract,
    execTimelock,
    initWallet, getWalletAddress,
} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();
    console.log("wallet addr", wallet.address);

    let params = {args: ["USD+", "USD+", 6]};

    let usdPlus = (await ethers.getContract('UsdPlusToken')).connect(wallet);
    let userAddress = "0xff871820adf1a0EEDAc0b3691D7f9bBE5Cf8e96c";

    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd")
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
        await usdPlus.connect(timelock).setExchanger("0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd");
    })

    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus2 = (await ethers.getContract('UsdPlusToken')).connect(wallet);
    let roleManager = await ethers.getContract('RoleManager');
    // await (await usdPlus2.fix(roleManager.address)).wait();

    let balance = await usdPlus.balanceOf(userAddress);
    console.log("user balance before", balance.toString());

    await (await usdPlus.mint(userAddress, "100000001")).wait()

    balance = await usdPlus.balanceOf(userAddress);
    console.log("user balance after", balance.toString());


    await (await usdPlus.burn(userAddress, "100000001")).wait()

    balance = await usdPlus.balanceOf(userAddress);
    console.log("user balance after after", balance.toString());

};

module.exports.tags = ['RoundingBug'];