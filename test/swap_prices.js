const Exchange = artifacts.require("Exchange");
const USDC = artifacts.require("USDCtest")
const PortfolioManager = artifacts.require("PortfolioManager")
const Vault = artifacts.require("Vault")
const InvestmentPortfolio = artifacts.require("registries/InvestmentPortfolio")
const BuyonSwap = artifacts.require("tests/BuyonSwap.sol")
const OvernightToken = artifacts.require("OvernightToken")
const Mark2Market = artifacts.require("Mark2Market")
const IRewardOnlyGauge = artifacts.require("connectors/curve/interfaces/IRewardOnlyGauge")
const IUniswapV2Router02 = artifacts.require("connectors/swaps/interfaces/IUniswapV2Router02")
const IERC20 = artifacts.require("@openzeppelin/contracts/token/ERC20/IERC20.sol")


function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        code = parseInt(hex.substr(i, 2), 16);
        if (code == 0x20
            || (0x30 <= code && code <= 0x7A)
        )
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

module.exports = async function (callback) {
    try {
        let accounts = await web3.eth.getAccounts()
        let userAccount = accounts[0];

        console.log("userAccount: " + userAccount);
        const m2m = await Mark2Market.deployed();
        const vault = await Vault.deployed();

        let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
        let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
        let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
        let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
        let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
        let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
    
        const swapRouterAddress = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
        const swapRouter = await IUniswapV2Router02.at(swapRouterAddress);


        for (let i = 0; i < 12; i++) {
            // let amount = (10**i) * (10 ** 6);
            let amount = 10 ** i;
            // let amount = 1000 ;
            console.log("amount: " + amount)

            let usdcToken = await IERC20.at(usdc);
            let wMaticToken = await IERC20.at(wMatic);

            // console.log("usdcToken balance before: " + await usdcToken.balanceOf(userAccount))
            // console.log("wMaticToken balance before: " + await wMaticToken.balanceOf(userAccount))
            var BN = web3.utils.BN;

            path = [];
            path[0] = usdc;
            // path[1] = crv;
            path[1] = wMatic;
            res = await swapRouter.getAmountsOut(
                // new BN(amount).mul(new BN(10**12)) ,
                new BN(amount),
                path
            );
            // console.log("getAmountsOut: " + JSON.stringify(res, null, 2))
            console.log("getAmountsOut[0]: " + res[0])
            console.log("getAmountsOut[1]: " + res[1])
            console.log("ratio: " + (res[1]/res[0]))


        }

        // res = await usdcToken.approve(swapRouterAddress, amount);
        // // console.log("approve usdcToken: " + JSON.stringify(res, null, 2))
        // res = await wMaticToken.approve(swapRouterAddress, amount);
        // // console.log("approve wMaticToken: " + JSON.stringify(res, null, 2))

        // path = [];
        // path[0] = usdc;
        // path[1] = wMatic;
        // res = await swapRouter.swapExactTokensForTokens(
        //     amount, //    uint amountIn,
        //     0, //          uint amountOutMin,
        //     path,
        //     userAccount,
        //     99999999999999
        // );
        // // console.log("swapExactTokensForTokens: " + JSON.stringify(res, null, 2))
        // console.log("usdcToken balance: " + await usdcToken.balanceOf(userAccount))
        // console.log("wMaticToken balance: " + await wMaticToken.balanceOf(userAccount))

        // res = await swapRouter.getAmountsOut(
        //     amount,
        //     path
        // );
        // console.log("getAmountsOut: " + JSON.stringify(res, null, 2))
        // console.log("getAmountsOut[0]: " + res[0])
        // console.log("getAmountsOut[1]: " + res[1])

        // 
        // amount = new BN(amount).mul(new BN(10**12));

        // path = [];
        // path[0] = wMatic;
        // path[1] = usdc;
        // res = await swapRouter.getAmountsOut(
        //     amount,
        //     path
        // );
        // console.log("getAmountsOut[0] wMatic : " + res[0])
        // console.log("getAmountsOut[1] usdc   : " + res[1])

    } catch (error) {
        console.log(error);

    }
    callback();
}
