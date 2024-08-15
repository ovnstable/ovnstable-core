const { getContract, execTimelock, initWallet, getERC20ByAddress, transferETH, transferAsset } = require("@overnight-contracts/common/utils/script-utils");
const { ethers } = require("hardhat");

async function main() {
    let strategy = await getContract("StrategySiloUsdc", "localhost");

    const claimContractAddress = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae";
    const claimContractABI = [
        {
            inputs: [
                { internalType: "address[]", name: "users", type: "address[]" },
                { internalType: "address[]", name: "tokens", type: "address[]" },
                { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
                { internalType: "bytes32[][]", name: "proofs", type: "bytes32[][]" },
            ],
            name: "claim",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        {
            inputs: [
                { internalType: "address", name: "", type: "address" },
                { internalType: "address", name: "", type: "address" },
            ],
            name: "operators",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                { internalType: "address", name: "", type: "address" },
                { internalType: "address", name: "", type: "address" },
            ],
            name: "claimed",
            outputs: [
                { internalType: "uint208", name: "amount", type: "uint208" },
                { internalType: "uint48", name: "timestamp", type: "uint48" },
                { internalType: "bytes32", name: "merkleRoot", type: "bytes32" },
            ],
            stateMutability: "view",
            type: "function",
        },
        {
            inputs: [
                {
                    internalType: "address",
                    name: "tokenAddress",
                    type: "address",
                },
                {
                    internalType: "address",
                    name: "to",
                    type: "address",
                },
                {
                    internalType: "uint256",
                    name: "amount",
                    type: "uint256",
                },
            ],
            name: "withdrawERC20",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
        },
        { inputs: [], name: "getMerkleRoot", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
    ];
    const claimContract = new ethers.Contract(claimContractAddress, claimContractABI, ethers.provider);

    const users = [strategy.address];
    const tokens = ["0x912CE59144191C1204E64559FE8253a0e49E6548"];
    const amounts = ["6271554457749982659348"];
    const proofs = [
        [
            "0xd2d8a8c79bb3b957188aa3f9232575a6b25249f60c6eb89166c70c150915e7f5",
            "0xe015ca1099c260f8ba58407b0c829e64aa880cefd7f8111e080d67054ffebd42",
            "0xd0e6aae7cbf311ab1d84d4cfa9638edf94e61cd704ae2a8851e4fea1d6d55f6d",
            "0x74bc7de0e471e79c161384a00ad5d62285b9ad2f7f37c9d9f2f890c393ff03d1",
            "0x94f928d577840614566355a5280852a3d712b431dcadbba560e0509e92bfdc98",
            "0xdb6884391c06c34d5a2f6f4a5192522e02fab3edaa04ce187728e3fd7ffdd1ee",
            "0x387b51d25655c09a3c4ada5e99aaba5597b4b0a978a4cbba529bf4787b3b568b",
            "0x7f45d29c6861a7a0b67d416ac7b628d6d30f14e03431a0ae6f194481b3e09483",
            "0x2dd37f6b9cd14a30dfa81395321d2313b79b6fb5c84770a57648bf481940140f",
            "0xbb45230b7ed5dc2a7ae9ab830428e901cd4c6419eb7cd75f702a6c57ca1c534f",
            "0x15c0cce06362888894bc9472c0033a04c2ccd18fa80965aac23457cd54206626",
            "0xb06a4ac86a26f3694dec899bb6703bd2bb3acfe532ec1590b5402ac373e8c72d",
            "0xd360b027313651e75a79441208c3ba8cae391f8ffac40c9d8ff87bb1e4828fd4",
            "0xe7da34a7f641ea7798a5ecc3bc2e0cf50369bc36e77af5cefde26a932e51f334",
            "0xc568461d7f0fb32e73748c43d60620e22930d4c842f3ab5453f72b455fd99ebf",
            "0x4c844da6386e5097fc1a8f74dac53790fa645a67a8af377cd6e6cc6f40cb3efd",
        ],
    ];

    const wallet = await initWallet();

    const arbAddress = "0x912CE59144191C1204E64559FE8253a0e49E6548";

    // await transferETH(10, '0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9');

    await execTimelock(async timelock => {
        // (await strategy.connect(timelock).whitelistAngleOperator(wallet.address)).wait();
        // console.log('claimContract.operators', await claimContract.operators(strategy.address, wallet.address));

        // (await claimContract.connect(wallet).claim(users, tokens, amounts, proofs)).wait();

        const arbContract = await getERC20ByAddress(arbAddress);
        // const arbToClaim = await arbContract.balanceOf(strategy.address);
        // console.log(arbToClaim);
        // console.log('stratgyBalance', await arbContract.balanceOf(strategy.address));
        // console.log('rewardBalance', await arbContract.balanceOf(wallet.address));

        await transferAsset(arbAddress, strategy.address, 100000);
        console.log("stratgyBalance", (await arbContract.balanceOf(strategy.address)).toString());
        console.log("rewardBalance", (await arbContract.balanceOf(wallet.address)).toString());

        (await strategy.connect(timelock).withdrawArbRewards(wallet.address, 100000)).wait();
        console.log("stratgyBalance", (await arbContract.balanceOf(strategy.address)).toString());
        console.log("rewardBalance", (await arbContract.balanceOf(wallet.address)).toString());
        // Wait for the transaction to be mined
        // console.log('Transaction mined successfully');
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("Error in script execution:", error);
        process.exit(1);
    });
