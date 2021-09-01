const OvernightToken = artifacts.require("OvernightToken");
const USDCtest = artifacts.require("tests/USDCtest");
const aUSDCtest = artifacts.require("tests/aUSDCtest");
const Exchange = artifacts.require("Exchange");

const ConnectorAAVE = artifacts.require("./connectors/ConnectorAAVE.sol");
const ConnectorCurve = artifacts.require("./connectors/ConnectorCurve.sol");

const ActivesList = artifacts.require("./registres/ActivesList.sol");

const Mark2Market = artifacts.require("./Mark2Market.sol");
const PortfolioManager = artifacts.require("./PortfolioManager.sol")

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

  await deployer.deploy(PortfolioManager);
  const pm = await PortfolioManager.deployed();

  // setOraclePrice AAAVE


   const chainID = await web3.eth.net.getId();
  var usdctaddr
   if (chainID == '80001') {
     // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
      aaveLendingPoolAddressesProvider = "0x178113104fEcbcD7fF8669a0150721e231F0FD4B"
      usdctaddr = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";

   }
  else if (chainID == '137') {
    aaveLendingPoolAddressesProvider = "0xd05e3E715d945B59290df0ae8eF85c1BdB684744"
    usdctaddr = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    daiaddr = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
    weth = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
  }
   else {
    await deployer.deploy(USDCtest);
    await deployer.deploy(aUSDCtest);
    const usdct = await USDCtest.deployed();
    const ausdc = await USDCtest.deployed();
    usdctaddr = usdct.address
   }

  await exchange.setTokens(ovnt.address,usdctaddr);
  await exchange.setAddr(actList.address, pm.address, m2m.address);
  await m2m.setAddr(actList.address, pm.address);
  await pm.setAddr(actList.address)

  await connAAVE.setAAVE (aaveLendingPoolAddressesProvider, usdctaddr );

  await connCurve.setUSDC (usdctaddr);


};
