const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress, sleep} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");


async function main() {

    let ovn = await ethers.getContractAt('SalesToken', '0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396');
    let overflowICO= await getContract('OverflowICO');

    await (await ovn.approve(overflowICO.address, toE18(25_000))).wait();
    await sleep(5000);

    console.log(`Start: ${await overflowICO.started()}`);
    await (await overflowICO.start()).wait();
    console.log(`Start: ${await overflowICO.started()}`);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

