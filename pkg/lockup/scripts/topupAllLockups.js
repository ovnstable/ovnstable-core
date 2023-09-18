const { toE18, fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { ethers } = require('hardhat');
const { initWallet } = require("@overnight-contracts/common/utils/script-utils");

const OVN_ABI = (require("./interfaces/ovn.json"));

const DEV_ADDRESSES_LOCKUP = {
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100), 
    '': toE18(100)
}

async function main() {

    let addresses = DEV_ADDRESSES_LOCKUP;
    
    let wallet = await initWallet();
    const token = new ethers.Contract(OVN_ABI.address, OVN_ABI.abi, wallet);
    console.log("Owner OVN amount:", fromE18((await token.balanceOf(wallet.address)).toString()));

    for (const [lockupAddress, amount] of Object.entries(addresses)) {
        try {
            const tx = await token.transfer(lockupAddress, amount);
            await tx.wait();
            console.log(fromE18((await token.balanceOf(lockupAddress)).toString()), 'OVN were sent to', lockupAddress);
        } catch (error) {
            console.error(`Error sending tokens to contract at address ${lockupAddress}: ${error.message}`);
        }
    }

    console.log("Owner OVN amount:", fromE18((await token.balanceOf(wallet.address)).toString()));

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

