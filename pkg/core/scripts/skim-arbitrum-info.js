const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");
const {fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");

/**
 *  Parse transactions logs and calculating skim amount for every pool
 *  Work only with chain: ARBITRUM
 *  Work only with dex: Solidlizard, Sterling
 *
 *  Put transaction hashes to variable `hashes` and run script.
 */

async function main() {




    let items = {
        '0xd36A246c848714E52eD810c3f9AE60CCabfccD6B': {
            name: "sAMM-USD+/USDC",
            amount: 0
        },
        '0xAc4eeD9Ca04B219935d5C4201167aA9257896443': {
            name: "sAMM-ETS Gamma/USD+",
            amount: 0,
        },
        '0x58C1b1d1DD5e27E929ab159f485E9625ca24969C': {
            name: "sAMM-DAI/DAI+",
            amount: 0,
        },
        '0xB6490141901FE1a16af2ADA782BA897999683757': {
            name: "sAMM-USD+/DAI+",
            amount: 0
        },
        'Solidlizard':{
            name: '-',
            amount: 0
        }

    }


    let arbitrumPayoutListener = await getContract('ArbitrumPayoutListener');

    let hashes = ['0x4f9ccfe458986d158c788a8358e8b6b4e5d37c191207838b7424d4a7841e7b79',
    '0x49f7eedc2b196caf61584cfae4ffbb2b29075293d70319e78d0004d8d2def344',
    '0xae81a3664af42b99ee41c3c28478a7e2b9a6d94f1d38604d35c4e3818fc31d52',
    '0x614eca22f3d4158ff945d5c6f5275170879d810961bab9dd248f47aa6e8021e9',
    '0x8a9972ec7fd7f22aff3934f7b580eece13a125696912e9ca78671b06be4970bb']


    for (const hash of hashes) {
        let tx = await ethers.provider.getTransactionReceipt(hash);

        tx.logs.forEach((value, index) => {
            try {
                let result = arbitrumPayoutListener.interface.parseLog(value);

                if (result.name === 'SterlingSkimReward'){

                    let item = items[result.args[0]];
                    item.amount += Number.parseInt(fromAsset(result.args[2]));

                }else if (result.name === 'RewardWalletSend'){

                    let item = items['Solidlizard'];
                    item.amount += Number.parseInt(fromAsset(result.args[0]));

                }
            } catch (e) {
            }
        });
    }


    console.table(items);

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

