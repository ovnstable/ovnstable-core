const Exchange = artifacts.require("Exchange");

module.exports = async function (callback) {

    let exchange = await Exchange.deployed();
    console.log(await exchange.reward());

}
