const hre = require('hardhat');
const { getContract, initWallet, impersonateAccount } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal } = require('@overnight-contracts/common/utils/governance');

const path = require('path');

const { BigNumber } = require('ethers');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    const maverickPools = ['0x3F92D44E03F42fDC4230A5E35437D16D1eA58477', '0x7BC54990b4bD2EbB516729477E1D59D2A8f2CA86'];

    // pools ARE allowed to send USD+
    // pools ARE NOT allowed to receive USD+
    const lockOptions = [
        {
            lockSend: false,
            lockReceive: true,
        },
        {
            lockSend: false,
            lockReceive: true,
        },
    ];

    let usdPlus = await getContract('UsdPlusToken', 'base');

    addProposalItem(usdPlus, 'upgradeTo', ['0x2758fbd9299aC1149Bf1f1b09d8E2A6cDE9c8543']);
    addProposalItem(usdPlus, 'setTransferLockBatch', [maverickPools, lockOptions]);

    // test pools transers locked
    const holderAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    await impersonateAccount(holderAddress)
    const holder = await hre.ethers.getSigner(holderAddress)

    const creditsSlot = 251
    function getSlot(userAddress, mappingSlot) {
        return ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            [userAddress, mappingSlot]
        )
    }

    const storageValue = ethers.utils.hexlify(ethers.utils.zeroPad(10 ** 6, 32))

    await hre.ethers.provider.send(
        "hardhat_setStorageAt",
        [
            contractAddress,
            getSlot(holder.address, creditsSlot),
            storageValue
        ]
    ) 

    await usdPlus.transfer(maverickPools[0], 1)

    // await testProposal(addresses, values, abis);

    // await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
