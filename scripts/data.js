const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic, toUSDC, fromOvn} = require("../utils/decimals");
const ethers = hre.ethers;

let OVN = JSON.parse(fs.readFileSync('./deployments/old_polygon/OvernightToken.json'));
let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));
let PM = JSON.parse(fs.readFileSync('./deployments/polygon/PortfolioManager.json'));
let ERC20 = JSON.parse(fs.readFileSync('./deployments/old_polygon/ERC20.json'));

async function main() {


    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet("", provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let portfolioManager = await ethers.getContractAt(PM.abi, "0xEa250cbf97b47522fda27a2875868491509Ca393", wallet);
    let exchange = await ethers.getContractAt(Exchange.abi, "0x2f7ECA37123f70Fd60D9339C622B14Dd0e515b7E", wallet);
    let ovn = await ethers.getContractAt(OVN.abi, "0xcE5bcF8816863A207BF1c0723B91aa8D5B9c6614", wallet);


    console.log('Exchange: ' + await exchange.address)
    console.log('Exchange ovn: ' + await exchange.ovn())

    let USDC = await ethers.getContractAt(ERC20.abi,'0x2791bca1f2de4661ed88a30c99a7a9449aa84174', wallet);

    await exchange.setTokens(ovn.address, USDC.address)

    console.log('Balance ovn: ' + fromOvn(await ovn.balanceOf(wallet.address)))
    console.log('Balance usdc: ' + fromOvn(await USDC.balanceOf(wallet.address)))

    let sum = toUSDC(1);
    await USDC.approve(exchange.address, sum);
    await exchange.buy(USDC.address, sum);

    console.log('Balance ovn: ' + fromOvn(await ovn.balanceOf(wallet.address)))
    console.log('Balance usdc: ' + fromOvn(await USDC.balanceOf(wallet.address)))
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




