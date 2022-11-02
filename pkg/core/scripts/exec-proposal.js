const hre = require("hardhat");
const fs = require("fs");

const {showM2M, getContract, getPrice, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {execProposal} = require("@overnight-contracts/common/utils/governance");
const {toAsset} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    await execProposal('8183587490322514041677079120766614478739037332802062240372913363775024669755');


    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    await (await exchange.pause()).wait();
    await (await exchange.unpause()).wait();

    await (await asset.approve(exchange.address, toAsset(1))).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, toAsset(1))).wait();
    console.log('Exchange.buy done');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

