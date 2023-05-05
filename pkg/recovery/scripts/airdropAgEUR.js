const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getERC20ByAddress, impersonateAccount, getERC20, transferUSDPlus, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require("fs");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let wallet = await initWallet();
    console.log('Wallet: ' + wallet.address);
    await transferETH(0.02, wallet.address);

    const airdrop = await getContract('Airdrop');
    const airdropToken = await getContract('UsdPlusToken', 'optimism');

    const amount = await airdropToken.balanceOf(wallet.address);
    await (await airdropToken.approve(airdrop.address, amount)).wait();

    console.log('airdropToken.balance: ' + fromE6(amount));
    console.log('airdropToken.approve: ' + fromE6(amount));

    const mapper = [];
    const csvFile = fs.readFileSync('OVNUSDPAirdrop.csv', 'utf-8');
    const lines = csvFile.split('\n');
    const airdropInfo = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const [address, amount] = line.split(',');
            airdropInfo.push({ address, amount: parseInt(amount) });
        }
    }
    const addressesPerTxn = 100;
    let totalTransactions = Math.ceil(airdropInfo.length / addressesPerTxn);
    console.log('Count transactions: ' + totalTransactions);
    console.log('Airdrop only first 600 users');

    totalTransactions = 6;
    for (let i = 0; i < totalTransactions; i++) {

        const currentInfos = airdropInfo.slice(i * addressesPerTxn, (i * addressesPerTxn) + addressesPerTxn);
        const addressesList = currentInfos.map(info => ethers.utils.getAddress(info.address));
        const amountsList = currentInfos.map(info => info.amount);

        // const premapping = [];
        // for (let i = 0; i < addressesList.length; i++) {
        //     premapping.push({
        //         "address": addressesList[i],
        //         "balanceBefore": fromE6(await airdropToken.balanceOf(addressesList[i])),
        //         "amount": fromE6(amountsList[i])
        //     })
        // }

        const tx = await airdrop.airdrop(
            airdropToken.address,
            addressesList,
            amountsList
        );


        await new Promise((f) => setTimeout(f, 2000));
        const receipt = await tx.wait();

        console.log(`Airdrop transaction ${i} successful with hash: ${receipt.transactionHash}`);

        // for (let i = 0; i < premapping.length; i++) {
        //     mapper.push({
        //         "address": premapping[i].address,
        //         "balanceBefore": premapping[i].balanceBefore,
        //         "amount": premapping[i].amount,
        //         "balanceAfter": fromE6(await airdropToken.balanceOf(premapping[i].address)),
        //         "txHash": receipt.transactionHash,
        //         "blockNumber": receipt.blockNumber,
        //     })
        // }

    }
    // fs.writeFileSync("OVNAirdropResult.json", JSON.stringify(mapper, null, 2))

    console.log('Airdrop success!');

    console.log('airdropToken.balance: ' + fromE6(await airdropToken.balanceOf(wallet.address)));

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

