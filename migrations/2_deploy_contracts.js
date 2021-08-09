const OvernightToken = artifacts.require("OvernightToken");
const USDCtest = artifacts.require("USDCtest");
const DAItest = artifacts.require("DAItest");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {
  await deployer.deploy(OvernightToken);
  const ovnt = await OvernightToken.deployed();
  await deployer.deploy(USDCtest);
  await deployer.deploy(DAItest);
  const usdct = await USDCtest.deployed();
  const daict = await DAItest.deployed();
  await deployer.deploy(Exchange);
  const exchange = await Exchange.deployed();

  await exchange.setTokens(ovnt.address,usdct.address);
  await exchange.setTokens(ovnt.address,daict.address);
};
