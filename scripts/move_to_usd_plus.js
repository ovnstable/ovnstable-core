const hre = require("hardhat");
const fs = require("fs");
const {fromWmatic, toUSDC, fromOvn} = require("../utils/decimals");
const ethers = hre.ethers;

let OVN = JSON.parse(fs.readFileSync('./deployments/polygon/OvernightToken.json'));
let USDPlus = JSON.parse(fs.readFileSync('./deployments/polygon/UsdPlusToken.json'));
// let ERC20 = JSON.parse(fs.readFileSync('./deployments/polygon/ERC20.json'));

async function main() {

    let provider = new ethers.providers.JsonRpcProvider('');
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet("", provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromWmatic(balance))

    let ovn = await ethers.getContractAt(OVN.abi, "0xcE5bcF8816863A207BF1c0723B91aa8D5B9c6614", wallet);
    let usdPlus = await ethers.getContractAt(USDPlus.abi, USDPlus.address, wallet);

    let count = await ovn.ownerLength();

    for (let i = 0; i < count; i++) {

        let client = await ovn.ownerAt(i);
        let balanceFull = await ovn.ownerBalanceAt(i);
        let balance = balanceFull / 10 ** 6;

        if (balance == 0){
            continue;
        }

        let tx = await usdPlus.mint(client, balanceFull)
        await tx.wait();

        console.log('Client: ' + client);
        console.log('Balance ovn: ' + balance);
        console.log('Balance usdPlus: ' + await usdPlus.balanceOf(client)/ 10 ** 6);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




