const hre = require('hardhat');
const { BigNumber } = require('ethers');
const { getContract, initWallet, impersonateAccount, transferAsset, getERC20ByAddress, transferETH, getPrice, transferUSDPlus } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal } = require('@overnight-contracts/common/utils/governance');
const { BASE } = require('@overnight-contracts/common/utils/assets');

const path = require('path');
const assert = require('assert');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'base');
    const [holder] = await hre.ethers.getSigners();
    const router = await hre.ethers.getContractAt(ROUTER_CONFIG.abi, ROUTER_CONFIG.address);
    const ONE = BigNumber.from(10).pow(6);

    await transferETH(100, holder.address)

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
    const maverickPools = ['0x3F92D44E03F42fDC4230A5E35437D16D1eA58477', '0x7BC54990b4bD2EbB516729477E1D59D2A8f2CA86'];

    addProposalItem(usdPlus, 'upgradeTo', ['0xe1201f02C02e468c7fF6F61AFff505A859673cfD']);
    addProposalItem(usdPlus, 'setTransferLockBatch', [maverickPools, lockOptions]);

    // test pools transers locked
    await transferUSDPlus(ONE, holder.address)
    await transferAsset(BASE.usdc, holder.address, ONE);
    await transferAsset(BASE.usdbc, holder.address, ONE);

    const usdc = await getERC20ByAddress(BASE.usdc);
    const usdbc = await getERC20ByAddress(BASE.usdbc);

    console.log('GOT ALL TOKENS');

    await usdc.connect(holder).approve(router.address, ONE.mul(100));
    console.log('APPROVE USDC');
    await usdbc.connect(holder).approve(router.address, ONE.mul(100));
    console.log('APPROVE USDBC');
    await usdPlus.connect(holder).approve(router.address, ONE.mul(100));
    console.log('APPROVE USD+');

    // add liquidity to maverick
    const res0 = await addLiquidity(holder, router, maverickPools[0], ONE, ONE);
    const res1 = await addLiquidity(holder, router, maverickPools[1], ONE, ONE);

    // try to remove liquidity (should work)
    await removeLiquidity(holder, router, maverickPools[0], res0.tokenId, res0.binId, res0.lpDelta);
    await removeLiquidity(holder, router, maverickPools[1], res1.tokenId, res1.binId, res1.lpDelta);

    // change Implementation + setTransferLock
    await testProposal(addresses, values, abis);

    // check holders can remove liquidity
    for (let pool of maverickPools) {
        const opt = await usdPlus.lockOptionsPerAddress(pool);
        assert(opt.lockSend == false);
        assert(opt.lockReceive == true);
    }

    // should fail due to Receive Lock
    await addLiquidity(holder, router, maverickPools[0], ONE, ONE, true);
    await addLiquidity(holder, router, maverickPools[1], ONE, ONE, true);

    // check holders can remove liquidity (should work)
    await removeLiquidity(holder, router, maverickPools[0], res0.tokenId, res0.binId, res0.lpDelta, false);
    await removeLiquidity(holder, router, maverickPools[1], res1.tokenId, res1.binId, res1.lpDelta, false);

    console.log('\nCREATED PROPOSAL DATA')
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

async function addLiquidity(signer, router, pool, amount0, amount1, expectRevert = false) {
    if (!expectRevert) {
        const output = await router.connect(signer).callStatic.addLiquidityToPool(
            pool,
            0,
            [
                {
                    kind: 0,
                    pos: 0,
                    isDelta: false,
                    deltaA: amount0,
                    deltaB: amount1,
                },
            ],
            0,
            0,
            BigNumber.from(10).pow(10),
        );

        const tx = await router.connect(signer).addLiquidityToPool(
            pool,
            0,
            [
                {
                    kind: 0,
                    pos: 0,
                    isDelta: false,
                    deltaA: amount0,
                    deltaB: amount1,
                },
            ],
            0,
            0,
            BigNumber.from(10).pow(10),
        );
        const res = await tx.wait();
        console.log('Transaction AddLiquidity Done', res.transactionHash);

        return {
            tokenId: output.receivingTokenId,
            binId: output.binDeltas[0].binId,
            lpDelta: output.binDeltas[0].deltaLpBalance,
        };
    } else {
        try {
            await router.connect(signer).callStatic.addLiquidityToPool(
                pool,
                0,
                [
                    {
                        kind: 0,
                        pos: 0,
                        isDelta: false,
                        deltaA: amount0,
                        deltaB: amount1,
                    },
                ],
                0,
                0,
                BigNumber.from(10).pow(10),
            );
        } catch (err) {
            console.log('Add Liquidity Failed With Reason:', err.reason);
        }
    }
}

async function removeLiquidity(signer, router, pool, tokenId, binId, amountLP, callStaticOnly = true) {
    const position = await hre.ethers.getContractAt(POSITION_CONFIG.abi, POSITION_CONFIG.address);
    const approveTx = await position.connect(signer).approve(router.address, tokenId);
    const approveRes = await approveTx.wait();
    console.log('Approved LP NFT', approveRes.transactionHash);

    if (callStaticOnly) {
        await router.connect(signer).callStatic.removeLiquidity(
            pool,
            signer.address,
            tokenId,
            [
                {
                    binId: binId,
                    amount: amountLP,
                },
            ],
            0,
            0,
            BigNumber.from(10).pow(10),
        );
        console.log('Test Remove Liquidity Works');
    } else {
        const tx = await router.connect(signer).removeLiquidity(
            pool,
            signer.address,
            tokenId,
            [
                {
                    binId: binId,
                    amount: amountLP,
                },
            ],
            0,
            0,
            BigNumber.from(10).pow(10),
        );
        const res = await tx.wait();
        console.log('Transaction RemoveLiquidity Done', res.transactionHash);
    }
}

const ROUTER_CONFIG = {
    "address": "0x32AED3Bce901DA12ca8489788F3A99fCe1056e14",
    "abi": [
        {
            "inputs": [
                {
                    "internalType": "contract IPool",
                    "name": "pool",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                },
                {
                    "components": [
                        {
                            "internalType": "uint8",
                            "name": "kind",
                            "type": "uint8"
                        },
                        {
                            "internalType": "int32",
                            "name": "pos",
                            "type": "int32"
                        },
                        {
                            "internalType": "bool",
                            "name": "isDelta",
                            "type": "bool"
                        },
                        {
                            "internalType": "uint128",
                            "name": "deltaA",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint128",
                            "name": "deltaB",
                            "type": "uint128"
                        }
                    ],
                    "internalType": "struct IPool.AddLiquidityParams[]",
                    "name": "params",
                    "type": "tuple[]"
                },
                {
                    "internalType": "uint256",
                    "name": "minTokenAAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "minTokenBAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "deadline",
                    "type": "uint256"
                }
            ],
            "name": "addLiquidityToPool",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "receivingTokenId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenAAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenBAmount",
                    "type": "uint256"
                },
                {
                    "components": [
                        {
                            "internalType": "uint128",
                            "name": "deltaA",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint128",
                            "name": "deltaB",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint256",
                            "name": "deltaLpBalance",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint128",
                            "name": "binId",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint8",
                            "name": "kind",
                            "type": "uint8"
                        },
                        {
                            "internalType": "int32",
                            "name": "lowerTick",
                            "type": "int32"
                        },
                        {
                            "internalType": "bool",
                            "name": "isActive",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct IPool.BinDelta[]",
                    "name": "binDeltas",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "contract IPool",
                    "name": "pool",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "recipient",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                },
                {
                    "components": [
                        {
                            "internalType": "uint128",
                            "name": "binId",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint128",
                            "name": "amount",
                            "type": "uint128"
                        }
                    ],
                    "internalType": "struct IPool.RemoveLiquidityParams[]",
                    "name": "params",
                    "type": "tuple[]"
                },
                {
                    "internalType": "uint256",
                    "name": "minTokenAAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "minTokenBAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "deadline",
                    "type": "uint256"
                }
            ],
            "name": "removeLiquidity",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenAAmount",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenBAmount",
                    "type": "uint256"
                },
                {
                    "components": [
                        {
                            "internalType": "uint128",
                            "name": "deltaA",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint128",
                            "name": "deltaB",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint256",
                            "name": "deltaLpBalance",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint128",
                            "name": "binId",
                            "type": "uint128"
                        },
                        {
                            "internalType": "uint8",
                            "name": "kind",
                            "type": "uint8"
                        },
                        {
                            "internalType": "int32",
                            "name": "lowerTick",
                            "type": "int32"
                        },
                        {
                            "internalType": "bool",
                            "name": "isActive",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct IPool.BinDelta[]",
                    "name": "binDeltas",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
}

const POSITION_CONFIG = {
    "address": "0x0d8127A01bdb311378Ed32F5b81690DD917dBa35",
    "abi": [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
