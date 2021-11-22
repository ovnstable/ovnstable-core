const Exchange = artifacts.require("./Exchange.sol");
const OvernightToken = artifacts.require("./OvernightToken.sol");
const ERC20 = artifacts.require("./ERC20.sol");

let USDC = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';



contract("Exchange", async accounts => {
    let account = accounts[0];


    it("minting = 100 ovn", async () => {

        const sum = 100 * 10 ** 6;
        const exchange = await Exchange.deployed();
        let usdc = ERC20.at(USDC);

        await usdc.approve(exchange.address, sum)
        await exchange.buy(USDC, sum)

        let balance = OvernightToken.balanceOf(account);
        assert(balance, sum)

    });


    it("redeem = 100 usdc", async () => {

        const exchange = await Exchange.deployed();
        const ovn = await OvernightToken.deployed();
        await exchange.redeem(ovn.address, 100)

        let balance = OvernightToken.balanceOf(account);
        assert(balance, 100)

    })



})
