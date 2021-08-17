const OvernightToken = artifacts.require("OvernightToken");
const USDCtest = artifacts.require("USDCtest");
const aUSDCtest = artifacts.require("aUSDCtest");
const Exchange = artifacts.require("Exchange");

const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

const ActivesList = artifacts.require("./registres/ActivesList.sol");

const Mark2Market = artifacts.require("./Mark2Market.sol")
var aaveLendingPoolAddressesProvider;

module.exports = async function(deployer) {
  await deployer.deploy(OvernightToken);
  const ovnt = await OvernightToken.deployed();
  
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

  
   const chainID = await web3.eth.net.getId();
  var usdctaddr
   if (chainID == '80001') {
     // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
      aaveLendingPoolAddressesProvider = "0x178113104fEcbcD7fF8669a0150721e231F0FD4B"
      usdctaddr = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
   } else {
    await deployer.deploy(USDCtest);
    await deployer.deploy(aUSDCtest);
    const usdct = await USDCtest.deployed();
    const ausdc = await USDCtest.deployed(); 
    usdctaddr = usdct.address
   }

  await exchange.setTokens(ovnt.address,usdctaddr);
  await exchange.setactList(actList.address);
  await m2m.setActList(actList.address);


  await connAAVE.setAAVE (aaveLendingPoolAddressesProvider);

  await connCurve.setUSDC (usdctaddr);


};
