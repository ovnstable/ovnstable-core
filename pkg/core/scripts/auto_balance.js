const {getContract, getERC20 } = require("@overnight-contracts/common/utils/script-utils");
const { ethers } = require("hardhat");

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    let pm = await getContract('PortfolioManager', 'base_dai');
    let cdai = "0xb864BA2aab1f53BC3af7AE49a318202dD3fd54C2";
    let dai = await getERC20('dai');
    let onek = ethers.BigNumber.from("170000000000000000000");

    let kek = [
        {
          strategy: '0xb91107e0B01b0Cd2167abf3a0C1ed14E9C58cCa1',
          minWeight: 0,
          targetWeight: 99100,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: true,
          enabledReward: false
        },
        {
          strategy: '0x3E018a972ed429B01d11BdA4d19E6902680104c8',
          minWeight: 0,
          targetWeight: 900,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: false,
          enabledReward: false
        },
        {
          strategy: '0x3Dd7947eff438cF2870C3cb9345b675e5E924051',
          minWeight: 0,
          targetWeight: 0,
          maxWeight: 100000,
          riskFactor: 0,
          enabled: false,
          enabledReward: false
        }
    ];

    while (true) {
        let balance = await dai.balanceOf(cdai);
        console.log("balance", balance.toString());
        if (balance.gte(onek)) {
            while(true) {
                kek[1].enabled = true;
                kek[0].targetWeight += 20;
                kek[1].targetWeight -= 20;
                await (await pm.setStrategyWeights(kek)).wait();
                await (await pm.balance()).wait();

                let balance = await dai.balanceOf(cdai);
                console.log("balance2", balance.toString());
                if (balance.gte(onek)) {
                    let a = 0;
                } else {
                    break;
                }
            }
        }
        await delay(60000);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

