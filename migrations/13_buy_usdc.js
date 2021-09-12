const router = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol");
let USDC
let test = false;
module.exports = async function (deployer) {
    const chainID = await web3.eth.net.getId();

    if (chainID == 137 && test) {
        USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"

        await deployer.deploy(BuyonSwap);
        const bos = await BuyonSwap.deployed();
        await bos.buy(USDC, router, {value: "1000000000000000000000000"})
    }


}
