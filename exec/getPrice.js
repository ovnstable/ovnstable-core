
module.exports = async function (callback) {


    let exchange = await Exchange.deployed();

    const contract = new web3.eth.Contract(exchange.abi, exchange.address)
    let usdc = await USDC.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');

    await usdc.approve(Exchange.address, 30);

    let newVar = await contract.methods.buy(usdc.address, 30);

    console.log('EVENTS')
    console.log(newVar)

}
