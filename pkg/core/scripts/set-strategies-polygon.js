const {getContract, changeWeightsAndBalance} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let weights = [
        {
            "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
            "name": "Aave",
            "minWeight": 0,
            "targetWeight": 2.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
            "name": "Tetu USDC",
            "minWeight": 0,
            "targetWeight": 0.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
            "name": "Synapse USDC",
            "minWeight": 0,
            "targetWeight": 57.5,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x8ED7b474cFE7Ef362c32ffa2FB55aF7dC87D6048",
            "name": "Penrose USDC/TUSD",
            "minWeight": 0,
            "targetWeight": 1,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0xa7625F964C93f8A62DBed06BaFFDAF8C20025d77",
            "name": "Clear Pool USDC",
            "minWeight": 0,
            "targetWeight": 15.3,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
        {
            "strategy": "0x956E1DA95b339Eda148AC22158a252bf6C0a4f59",
            "name": "QuickSwapV3 USDC/USDT",
            "minWeight": 0,
            "targetWeight": 23.2,
            "maxWeight": 100,
            "enabled": true,
            "enabledReward": true
        },
    ]

    await changeWeightsAndBalance(weights);
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

