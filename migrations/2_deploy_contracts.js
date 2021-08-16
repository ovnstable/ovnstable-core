const OvernightToken = artifacts.require("OvernightToken");
const USDCtest = artifacts.require("USDCtest");
const Exchange = artifacts.require("Exchange");

const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

const ActivesList = artifacts.require("./registres/ActivesList.sol");

const Mark2Market = artifacts.require("./Mark2Market.sol")

module.exports = async function(deployer) {
  await deployer.deploy(OvernightToken);
  const ovnt = await OvernightToken.deployed();
  await deployer.deploy(USDCtest);
  const usdct = await USDCtest.deployed();
  await deployer.deploy(Exchange);
  const exchange = await Exchange.deployed();

  await deployer.deploy(ConnectorAAVE);
  const connAAVE = await ConnectorAAVE.deployed();

  await deployer.deploy(ConnectorCurve);
  const connCurve = await ConnectorCurve.deployed();

  await deployer.deploy(ActivesList);
  const actList = await ActivesList.deployed();

  await deployer.deploy(Mark2Market);
  const m2m = await Mark2Market.deployed();
  
  // setOraclePrice AAAVE

  await exchange.setTokens(ovnt.address,usdct.address);
  await exchange.setactList(actList.address);
};
