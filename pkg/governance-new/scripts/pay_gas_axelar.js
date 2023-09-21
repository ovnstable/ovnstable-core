const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");


async function main() {

    let governor= await getContract('OvnGovernor');
    let timelock = await getContract('OvnTimelock');

    let wallet = await initWallet();

    let gateway = await getContract('AxelarGateway');
    let gasService = await getContract('AxelarGasService');


    const destinationChain = "42161";
    const destinationAddress = "0xdE0ECfA3AA9bA8F7F1b2A833F811f07D5DC88c8c";

    const payload =  ethers.utils.defaultAbiCoder.encode(['uint256', 'address'], [0, "0x5cBb2167677c2259F421457542f6E5A805B1FF2F"]);

    console.log('payload:' + payload);

    const gasFee = '50000000';

    await (await gasService.payNativeGasForContractCall(timelock.address, destinationChain, destinationAddress, payload, wallet.address, {
        value: gasFee
    })).wait();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

