const OVN = artifacts.require("OvernightToken")
const Exchange = artifacts.require("Exchange")

module.exports = async function (callback) {


    let ovn = await OVN.deployed();
    let exchange = await Exchange.deployed();

    // await ovn.transferOwnership(exchange.address)
    // await exchange.transferOwnership("0x9E6fc421D23015DE2CD90bc4403555e1C9529F96")

    // await ovn.mint("0x9E6fc421D23015DE2CD90bc4403555e1C9529F96", 2000000);

    let newVar = await ovn.balanceOf('0x9E6fc421D23015DE2CD90bc4403555e1C9529F96');
    console.log('Balance : ' +  newVar)



}
