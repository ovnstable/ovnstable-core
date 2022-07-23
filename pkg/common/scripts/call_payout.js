const hre = require("hardhat");
const fs = require("fs");
const {fromE18} = require("../utils/decimals");
const ethers = hre.ethers;


let ERC20 = JSON.parse(fs.readFileSync('./deployments/old_polygon/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./deployments/old_polygon/IERC20Metadata.json'));

let secrets = JSON.parse(fs.readFileSync('./secrets.json'));


async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    const [owner] = await ethers.getSigners();

    let provider = ethers.provider;
    console.log('Provider: ' + provider.connection.url);
    let wallet = await new ethers.Wallet(secrets.polygon.pk_test, provider);
    console.log('Wallet: ' + wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance wallet: ' + fromE18(balance.toString()))

    let ovn = await ethers.getContract("OvernightToken");
    console.log("ovn: " + ovn.address);

    let vault = await ethers.getContract("Vault");
    let exchange = await ethers.getContract("Exchange");

    let idleUSDC = await ethers.getContractAt(ERC20.abi, '0x1ee6470cd75d5686d0b2b90c0305fa46fb0c89a1');
    let USDC = await ethers.getContractAt(ERC20.abi, '0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    let amUSDC = await ethers.getContractAt(ERC20.abi, '0x625E7708f30cA75bfd92586e17077590C60eb4cD');
    let am3CRV = await ethers.getContractAt(ERC20.abi, '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171');
    let am3CRVGauge = await ethers.getContractAt(ERC20.abi, '0x19793b454d3afc7b454f206ffe95ade26ca6912c');
    let CRV = await ethers.getContractAt(ERC20.abi, '0x172370d5Cd63279eFa6d502DAB29171933a610AF');
    let wmatic = await ethers.getContractAt(ERC20.abi, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270');
    let vimUsd = await ethers.getContractAt(ERC20.abi, '0x32aBa856Dc5fFd5A56Bcd182b13380e5C855aa29');
    let mta = await ethers.getContractAt(ERC20.abi, '0xf501dd45a1198c2e1b5aef5314a68b9006d842e0');
    let bpspTUsd = await ethers.getContractAt(ERC20.abi, '0x0d34e5dD4D8f043557145598E4e2dC286B35FD4f');
    let tUsd = await ethers.getContractAt(ERC20.abi, '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756');
    let bal = await ethers.getContractAt(ERC20.abi, '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3');

    let assets = [idleUSDC, USDC, amUSDC, am3CRV, am3CRVGauge, CRV, wmatic, ovn, vimUsd, mta, bpspTUsd, tUsd, bal];

    console.log("---  " + "User " + owner.address + ":");
    await showBalances(assets, owner.address);
    console.log("---------------------");

    console.log("---  " + "Vault " + vault.address + ":");
    await showBalances(assets, vault.address);
    console.log("---------------------");

    // rewards
    console.log("before reward");
    callResult = await exchange.reward();
    console.log("after reward");
    // console.log(JSON.stringify(callResult, null, 2));
    waitResult = await callResult.wait();
    console.log(JSON.stringify(waitResult, null, 2));
    logConsoleLogEvents(waitResult);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// Convert a hex string to a byte array
function hexToBytes(hex) {
    let bytes = []
    for (let c = 0; c < hex.length; c += 2) {
        let str = hex.substr(c, 2);
        if (str === "0x")
            continue;
        bytes.push(parseInt(str, 16));
    }
    return bytes;
}


function bin2String(array) {
    let result = "";
    for (let i = 0; i < array.length; i++) {
        result += String.fromCharCode(array[i]);
    }
    return result;
}

function logConsoleLogEvents(waitResult) {
    console.log("---  ConsoleLog events:")
    for (let event of waitResult.events) {
        if (event.event) {
            // for events which recognized by HH
            console.log(event.event + "(" + event.args + ")");
            continue;
        }

        let data = event.data;
        let bytes = hexToBytes(data);
        if (bytes.length < 63) {
            console.log("No ConsoleLog event");
            continue;
        }
        let length = bytes[63];
        if (length === 0) {
            console.log("No ConsoleLog event");
            continue;
        }
        bytes.slice(64, 64 + length);
        console.log(bin2String(bytes.slice(64, 64 + length)));
    }
    console.log("---  ConsoleLog events end")
}


async function showBalances(assets, ownerAddress) {
    for (let i = 0; i < assets.length; i++) {
        let asset = assets[i];
        let meta = await ethers.getContractAt(ERC20Metadata.abi, asset.address);
        let symbol = await meta.symbol();
        console.log(`Balance: ${symbol}: ` + (await asset.balanceOf(ownerAddress) / 10 ** await meta.decimals()));
    }
}
