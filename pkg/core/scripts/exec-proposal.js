const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

let M2M = JSON.parse(fs.readFileSync('./deployments/polygon/Mark2Market.json'));

let OvnGovernor = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnGovernor.json'));
let Exchange = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));

const {showM2M, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {
    // need to run inside IDEA via node script running
    await hre.run("compile");

    let wallet = await initWallet(ethers);

    let m2m = await ethers.getContractAt(M2M.abi, M2M.address, wallet);

    let exchange = await ethers.getContractAt(Exchange.abi, Exchange.address, wallet);
    let governor = await ethers.getContractAt(OvnGovernor.abi, OvnGovernor.address, wallet);

    await showM2M(m2m);
    await governor.executeExec("79319994271470878440252220016492033010405008236051520395480150984553190406088");
    await (await exchange.payout()).wait();
    await showM2M(m2m);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

