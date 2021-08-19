 
const router="0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
 
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol");

var USDC 
module.exports = async function(deployer) {
    const chainID = await web3.eth.net.getId();
    if (chainID == '80001') {
        // https://docs.aave.com/developers/deployed-contracts/matic-polygon-market
        USDC = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
        aUSDC = "0x2271e3Fef9e15046d09E1d78a8FF038c691E9Cf9";
      
      } else if (chainID == 137) {
        USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
        DAI = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
        CurvepoolPrice = "0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36"
        CurvepoolStake = "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE"
      }
      else {
        USDC = USDCtest.networks[chainID]['address'];
        aUSDC = aUSDCtest.networks[chainID]['address'];
      
      }
   await deployer.deploy(BuyonSwap);

   const bos =  await BuyonSwap.deployed();
   await bos.buy(USDC, router, {value: "1000000000000000000"})

}