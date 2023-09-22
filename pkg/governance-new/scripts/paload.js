const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");


async function main() {

    const payload =  ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [0, "0x5cBb2167677c2259F421457542f6E5A805B1FF2F"]);
    console.log(payload);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

