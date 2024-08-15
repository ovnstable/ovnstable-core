const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress, findEvent} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");


async function main() {

    let timelock = await getContract('AgentTimelock')
    const payload = timelock.interface.encodeFunctionData('updateDelay', [10]);
    console.log(payload);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

