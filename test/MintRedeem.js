const USDC = artifacts.require("USDCtest")
const OVN = artifacts.require("OvernightToken")
const Exchange = artifacts.require("Exchange")
const PortfolioManager = artifacts.require("PortfolioManager")

module.exports = async function (callback) {

    const accounts = await new web3.eth.getAccounts()
    let account = accounts[0];

    let usdc = await USDC.at('0x2791bca1f2de4661ed88a30c99a7a9449aa84174')

    let exchange = await Exchange.deployed()
    let ovn = await OVN.deployed()
    let pm = await PortfolioManager.deployed()

    let allowanceBefore = await usdc.allowance(
        account,
        exchange.address
    )

    console.log( "Amount of USDC is allowed to transfer on our behalf Before: " + allowanceBefore.toString() )

    // In order to allow the Smart Contract to transfer to USDC (ERC-20) on the accounts[0] behalf,
    // we must explicitly allow it.
    // We allow farmToken to transfer x amount of USDC on our behalf
    await usdc.approve(exchange.address, 10)

    // Validate that the farmToken can now move x amount of USDC on our behalf
    let allowanceAfter = await usdc.allowance(account, exchange.address)

    console.log( "Amount of USDC Exchange is allowed to transfer on our behalf After: " + allowanceAfter.toString() )


    // Verify accounts[0] and farmToken balance of USDC before and after the transfer

    let balanceUSDCBeforeAccounts0 = await usdc.balanceOf(accounts[0])
    let balanceUSDCBeforeFarmToken = await usdc.balanceOf(pm.address)
    let balanceUSDCBeforeExchange = await usdc.balanceOf(exchange.address)
    let balanceOvnAccount = await ovn.balanceOf(accounts[0])

    console.log("*** USDC ***")

    console.log("Balance USDC Before accounts[0] " + web3.utils.fromWei(balanceUSDCBeforeAccounts0.toString()))
    console.log("Balance USDC Before PM          " + web3.utils.fromWei(balanceUSDCBeforeFarmToken.toString()))
    console.log("Balance USDC Before Exchange    " + web3.utils.fromWei(balanceUSDCBeforeExchange.toString()))
    console.log("Balance OVN  Before accounts[0] " + web3.utils.fromWei(balanceOvnAccount.toString()))


    console.log("Call Buy Function")

    await exchange.buy(10)

    console.log("*** USDC ***")

    let balanceUSDCAccount = await usdc.balanceOf(accounts[0])
    let balanceUSDCExchange = await usdc.balanceOf(pm.address)
    balanceUSDCBeforeExchange = await usdc.balanceOf(exchange.address)
    balanceOvnAccount = await ovn.balanceOf(accounts[0])

    console.log("Balance USDC After accounts[0] " + web3.utils.fromWei(balanceUSDCAccount.toString()))
    console.log("Balance USDC After PM          " + web3.utils.fromWei(balanceUSDCExchange.toString()))
    console.log("Balance USDC After Exchange    " + web3.utils.fromWei(balanceUSDCBeforeExchange.toString()))
    console.log("Balance OVN  After accounts[0] " + web3.utils.fromWei(balanceOvnAccount.toString()))


    allowanceBefore= await usdc.allowance(
        exchange.address,
        account,
    )

    console.log( "Amount of USDC is allowed to transfer on our behalf Before: " + allowanceBefore.toString() )

    await usdc.approve(account, 10)

    allowanceAfter = await usdc.allowance(exchange.address, account)

    console.log( "Amount of USDC Exchange is allowed to transfer on our behalf After: " + allowanceAfter.toString() )

    console.log("Call Redeem Function")
    await exchange.redeem(10)

    console.log("*** USDC ***")

    let balanceUSDCAfterRedeemAccounts0 = await usdc.balanceOf(accounts[0])
    let balanceUSDCAfterReedemFarmToken = await usdc.balanceOf(pm.address)
    balanceOvnAccount = await ovn.balanceOf(accounts[0])

    console.log("Balance USDC After accounts[0] " + web3.utils.fromWei(balanceUSDCAfterRedeemAccounts0.toString()))
    console.log("Balance USDC After PM          " + web3.utils.fromWei(balanceUSDCAfterReedemFarmToken.toString()))
    console.log("Balance OVN  After accounts[0] " + web3.utils.fromWei(balanceOvnAccount.toString()))

    callback()

}


