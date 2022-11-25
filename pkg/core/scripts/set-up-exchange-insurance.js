const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {DEFAULT} = require("@overnight-contracts/common/utils/assets");


async function main() {

    let exchange = await getContract('Exchange', 'localhost');

    let insurance = await getContract('InsuranceExchange', 'polygon_ins');

    let wallet = await initWallet();

    await execTimelock(async (timelock)=>{

        await (await exchange.connect(timelock).setInsurance(insurance.address)).wait();
        console.log('exchange.setInsurance: ' + insurance.address);

        await (await exchange.connect(timelock).setProfitRecipient(DEFAULT.rewardWallet)).wait();
        console.log('exchange.setProfitRecipient: ' + DEFAULT.rewardWallet);

        await (await exchange.connect(timelock).grantRole(await exchange.PORTFOLIO_AGENT_ROLE(), wallet.address));

        await (await exchange.setOracleLoss(100, 100000)).wait(); // 0.1%
        console.log('exchange.setOracleLoss');

        await (await exchange.setCompensateLoss(10, 100000)).wait(); // 0.01%
        console.log('exchange.setCompensateLoss');
    });


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

