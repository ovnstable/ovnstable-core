const { ethers } = require("hardhat");
const { getContract, getPrice, transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const { PayoutListenerOperations, createSkim, createSkimTo, createSkimToWithFee, createBribe, createBribeWithFee, createSync, createCustomBribe, createCustom } = require("@overnight-contracts/common/utils/payoutListener");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { COMMON } = require("@overnight-contracts/common/utils/assets");

async function main() {
    const payoutManager = await getContract("BasePayoutManager", 'base');
    const usdPlus = await getContract('UsdPlusToken', 'base');
    const cashStrategy = await getContract('StrategySwapToOvn', 'base_ovn');
        //{ address : "0x86f79d8cE9a5089f196A1e81ced37e22D4721313" };

    const processItem = function(item) {
        let res = {};
        for (const key in item) {
            if (isNaN(Number(key))) {
                res[key] = item[key];
            }
        }
        return res;
    };
    let items = (await payoutManager.getItems()).map(processItem);

    console.log(`${items.length} items loaded`);

    const updatedItems = [];
    for (var i = 0;i < items.length;i++) {
        const item = items[i];
        if (item.token.toLowerCase() !== usdPlus.address.toLowerCase() || item.operation !== PayoutListenerOperations.SKIM) {
            continue;
        }

        if (item.feePercent === 20) {
            if (item.feeReceiver.toLowerCase() !== COMMON.rewardWallet.toLowerCase()) {
                throw "feeReceiver of 20% skim should be reward wallet";
            }
            item.feeReceiver = cashStrategy.address;
        } else if (item.feePercent === 0) {
            item.feePercent = 20;
            item.feeReceiver = cashStrategy.address;
            item.to = COMMON.rewardWallet;
        } else {
            throw "not possible";
        }
        updatedItems.push(item);
    }
     
    console.log(`${updatedItems.length} updated, ${items.length - updatedItems.length} skipped`);

    // LOCAL TESTING BEGINS
    // const devJun5 = "0x086dFe298907DFf27BD593BD85208D57e0155c94";
    // hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    // // }
    // await hre.network.provider.request({
    //     method: "hardhat_impersonateAccount",
    //     params: [devJun5],
    // });
    // await transferETH(2, devJun5);
    // const account = await hre.ethers.getSigner(devJun5);

    // const pm = payoutManager.connect(account);

    // for (var i = 0;i < updatedItems.length;i++) {
    //     console.log("updating item", i, "...")
    //     await (await pm.addItem(updatedItems[i])).wait();  
    // }
    // //await (await pm.addItems(updatedItems)).wait();
    // await hre.network.provider.request({
    //     method: "hardhat_stopImpersonatingAccount",
    //     params: [devJun5],
    // });
    // LOCAL TESTING ENDS

    await (await payoutManager.addItems(updatedItems)).wait();

    // if it is not working in one tx, you can do one-by-one.
    // for (var i = 0;i < updatedItems.length;i++) {
    //     console.log("updating item", i, "...")
    //     await (await pm.addItem(updatedItems[i])).wait();  
    // }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

