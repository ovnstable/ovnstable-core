const { toE18, fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { ethers } = require('hardhat');
const { initWallet } = require("@overnight-contracts/common/utils/script-utils");

const OVN_ABI = (require("./interfaces/ovn.json"));

const DEV_ADDRESSES_LOCKUP = {
    '0x58dE7fCdd5d7a20C63fCcB973010b95bF94fA333': toE18(1940), 
    '0x3cb5731FF374c8972cE85d925f9be62c21853b5b': toE18(12500), 
    '0x0a0831abF5CBD7fEBe7C874AD96E987eed865004': toE18(3119), 
    '0x3A96A7196222b29463E99Cbfba672141a2bB62fd': toE18(1000), 
    '0xD2e2e443c100Eac4b625B411010C34EAd0515735': toE18(350), 
    '0x52eF8022CB0C6be1F8733B33965560002AeC855c': toE18(250), 
    '0x1519814CD74F2Ea6C5580137cCabc70Ea4493426': toE18(200), 
    '0xff7104aE44f01C1be87fb9Eac09772715c66D9E1': toE18(100), 
    '0x019D17272687904F855D235dbBA7fD9268088Ea5': toE18(100), 
    '0xE4e83F7083d3F9260285691AAA47E8c57078e311': toE18(218891),
    '0xcFB4d82207cB944FAD439feb544eB18ABdef41E3': toE18(750),
    '0xF586C5047967DA9f62A8A308119F0811d4b356Be': toE18(1000),
}

const OVERNIGHT_ADDRESSES_LOCKUP = {
    '0x182fF2C75e0163CEF0b893D24716B4CD9111E926': toE18(306000), 
    '0x90D3BF3681E18654D7F4ee046EDb24CD474E0734': toE18(180000),
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

