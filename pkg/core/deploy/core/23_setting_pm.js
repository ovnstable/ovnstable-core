const {ethers} = require("hardhat");

const {initWallet, getContract, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async () => {

    let wallet = await initWallet();

    const pm = await ethers.getContract("PortfolioManager", wallet);
    const exchange = await ethers.getContract("Exchange", wallet);
    const m2m = await ethers.getContract("Mark2Market", wallet);
    const roleManager = await getContract("RoleManager");

    let asset = getCoreAsset();

    await (await pm.setMark2Market(m2m.address)).wait();
    console.log("pm.setMark2Market done");

    await (await pm.setExchanger(exchange.address)).wait();
    console.log("pm.setExchanger done");

    await (await pm.setAsset(asset)).wait();
    console.log("pm.setAsset done");

    await (await exchange.setRoleManager(roleManager.address)).wait();
    console.log("exchange.setRoleManager done");

};

module.exports.tags = ['setting', 'SettingPM'];

