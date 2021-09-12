const OVN = artifacts.require("OvernightToken")
const Exchange = artifacts.require("Exchange")

module.exports = async function (callback) {

    let ovn = await OVN.deployed();

    await ovn.mint("0x9E6fc421D23015DE2CD90bc4403555e1C9529F96", 2000000);

    let value = await ovn.balanceOf('0x9E6fc421D23015DE2CD90bc4403555e1C9529F96');
    console.log('Balance : ' +  value)


}
