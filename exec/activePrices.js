const Exchange = artifacts.require("Mark2Market");

module.exports = async function (callback) {

    let exchange = await Exchange.deployed();
    totalPrices = await exchange.assetPricesForBalance.call();

    console.log(totalPrices)

}
