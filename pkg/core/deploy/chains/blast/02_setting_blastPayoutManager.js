const { ethers } = require("hardhat");
const {
    getContract,
    getPrice,
} = require("@overnight-contracts/common/utils/script-utils");
const {
    createSkim,
    createSkimTo,
    createSkimToWithFee,
    createBribe,
    createBribeWithFee,
    createSync,
    createCustomBribe,
    createCustom,
} = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");

module.exports = async () => {
    const payoutManager = await getContract("BlastPayoutManager", "blast");
    const usdPlus = await getContract("UsdPlusToken", "blast");
    const treasury = "0xe497285e466227f4e8648209e34b465daa1f90a0";

    let items = [];
console.log('start to deploy skims')
    // items.push(...test());
    items.push(...swapBlast());
    await (await payoutManager.addItems(items)).wait();

    console.log("BlastPayoutManager setting done");

    function swapBlast() {
        let dex = "SwapBlast";
        let fee = 20;
        return [
            createCustom(
                "0x49B6992DbACf7CAa9cbf4Dbc37234a0167b8edCD",
                usdPlus.address,
                "USD+-USDB",
                dex,
                "0xd090575313764dE730761733BeD23C1440e7B48C",
                fee,
                treasury,
            ),
            createCustom(
                "0xB70Ab4C4BE5872fDD22f43C5907428198CDCB2d5",
                usdPlus.address,
                "USD+-USDB",
                dex,
                "0xC64A7142263a0157493FB65F5C6d6D62688717AA",
                fee,
                treasury,
            ),
        ];
    }
};

module.exports.tags = ["SettingBlastPayoutManager"];
