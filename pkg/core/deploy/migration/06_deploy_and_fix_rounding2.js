const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {
    getContract,
    execTimelock,
    initWallet, getWalletAddress, transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();
    console.log("wallet addr", wallet.address);

    let params = {args: ["USD+", "USD+", 6]};

    let usdPlus = (await ethers.getContract('UsdPlusToken')).connect(wallet);
    let userAddress = await new ethers.Wallet("a37ea11312df3f092e2bddff022a22002c8f0d2f7c45ba3122fcec151fee6dac", ethers.provider);
    let userAddress2 = await new ethers.Wallet("0dffa9d44e4269e7da3fb9dfeae8167102bfce1885ef06a017005d7e64d692a4", ethers.provider);
    await transferETH(1, userAddress.address);
    await transferETH(1, userAddress2.address);

    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd")
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
        await usdPlus.connect(timelock).setExchanger("0x66b439c0a695cc3ed3d9f50aa4e6d2d917659ffd");
    })

    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus2 = (await ethers.getContract('UsdPlusToken')).connect(wallet);
    let usdPlus2ua = (await ethers.getContract('UsdPlusToken')).connect(userAddress);
    let usdPlus2ua2 = (await ethers.getContract('UsdPlusToken')).connect(userAddress2);
    let roleManager = await ethers.getContract('RoleManager');
    // await (await usdPlus2.fix()).wait();

    let balance = await usdPlus.balanceOf(userAddress.address);
    console.log("user balance before", balance.toString());

    await (await usdPlus.mint(userAddress.address, "216569546")).wait()

    balance = await usdPlus.balanceOf(userAddress.address);
    console.log("user balance after", balance.toString());

    await (await usdPlus2ua.approve(userAddress2.address, "115792089237316195423570985008687907853269984665640564039457584007913129639935")).wait();

    let allowance = await usdPlus.allowance(userAddress.address, userAddress2.address);
    console.log("user allowance before", allowance.toString());

    await (await usdPlus2ua2.transferFrom(userAddress.address, userAddress2.address, balance)).wait()

    allowance = await usdPlus.allowance(userAddress.address, userAddress2.address);
    console.log("user allowance after", allowance.toString());
    balance = await usdPlus.balanceOf(userAddress.address);
    console.log("user balance after after", balance.toString());

    // await (await usdPlus.burn(userAddress, "100000001")).wait()

    // balance = await usdPlus.balanceOf(userAddress);
    // console.log("user balance after after", balance.toString());

};

module.exports.tags = ['RoundingBug2'];