const OvernightToken = artifacts.require("OvernightToken");
const USDCtest = artifacts.require("USDCtest");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {
  await deployer.deploy(OvernightToken);
  const ovnt = await OvernightToken.deployed();
  await deployer.deploy(USDCtest);
  const usdct = await USDCtest.deployed();
  await deployer.deploy(Exchange);
  const exchange = await Exchange.deployed();
  
  await exchange.setTokens(ovnt.address,usdct.address);
};
