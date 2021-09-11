const Exchange = artifacts.require("Exchange");
const ActivesList = artifacts.require("./registres/ActivesList.sol");
const Mark2Market = artifacts.require("./Mark2Market.sol");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")
const OvernightToken = artifacts.require("OvernightToken");

module.exports = async function (deployer) {

    const actList = await ActivesList.deployed();
    const ovn = await OvernightToken.deployed();
    const exchange = await Exchange.deployed();
    const m2m = await Mark2Market.deployed();
    const pm = await PortfolioManager.deployed();

    await m2m.setAddr(actList.address, pm.address);
    await pm.setAddr(actList.address)
    await exchange.setAddr(actList.address, pm.address, m2m.address);

    // Set role EX
    await ovn.setExchanger(exchange.address);
};
