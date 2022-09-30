// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dystopia.sol";

import "../PayoutListener.sol";


contract PolygonPayoutListener is PayoutListener {

    address[] public qsSyncPools;
    address[] public qsSkimPools;
    address[] public qsBribes;
    IERC20 public usdPlus;
    mapping(address => uint256) public skimPoolBalances; // pool address -> USD+ balance
    IERC20 public dyst;
    IERC20 public wmatic;
    IDystopiaRouter public dystRouter;

    // ---  events

    event SkimReward(address pool, uint256 amount);

    // --- setters


    struct Params{
        address usdPlus;
        address dyst;
        address wmatic;
        address dystRouter;
    }

    function setParams(Params calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);
        dyst = IERC20(params.dyst);
        wmatic = IERC20(params.wmatic);
        dystRouter = IDystopiaRouter(params.dystRouter);
    }

    function setSkimPools(address[] calldata _pools, address[] calldata _bribes) external onlyAdmin {
        require(_pools.length == _bribes.length, 'pools.size != bribes.size');
        qsSkimPools = _pools;
        qsBribes = _bribes;
    }

    function setSyncPools(address[] calldata _pools) external onlyAdmin {
        qsSyncPools = _pools;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _sync();
        _skim();
    }


    function _sync() internal {
        for (uint256 i = 0; i < qsSyncPools.length; i++) {
            Pool(qsSyncPools[i]).sync();
        }
    }


    function swapUsdPlusToDyst() external onlyAdmin {

        for (uint256 i = 0; i < qsSkimPools.length; i++) {
            address pool = qsSkimPools[i];

            uint256 usdPlusAmount = skimPoolBalances[pool];
            uint256 dystAmount;
            if (usdPlusAmount != 0) {
                dystAmount = DystopiaLibrary._swapExactTokensForTokens(
                    dystRouter,
                    address(usdPlus),
                    address (wmatic),
                    address(dyst),
                    false,
                    false,
                    usdPlusAmount,
                    address(this)
                );

                skimPoolBalances[pool] = dystAmount;
            }

        }

    }

    function _skim() internal {

        for (uint256 i = 0; i < qsSkimPools.length; i++) {
            address pool = qsSkimPools[i];

            Pool(pool).skim(address(this));


            uint256 dystAmount = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(usdPlus),
                address(wmatic),
                address(dyst),
                false,
                false,
                usdPlus.balanceOf(address(this)),
                address(this)
            );

            // Add previous balance DYST
            dystAmount += skimPoolBalances[pool];

            if(dystAmount > 0) {
                Bribe bribe = Bribe(qsBribes[i]);

                // Amount DYST on Bribe contract
                uint256 bribeAmount = bribe.left(address(dyst));

                // if we do not have enough amount DYST, then we do not charge bribes and save this DYST to next payout
                if(dystAmount > bribeAmount){

                    dyst.approve(address(bribe), dystAmount);
                    bribe.notifyRewardAmount(address(dyst), dystAmount);

                    // reset balance for pool
                    skimPoolBalances[pool] = 0;
                    emit SkimReward(pool, dystAmount);
                }else {
                    // save balance for the next payout
                    skimPoolBalances[pool] = dystAmount;
                }
            }
        }
    }
}


interface Bribe {
    function notifyRewardAmount(address token, uint256 amount) external;
    function left(address token) external view returns (uint);
}

interface Pool {
    function sync() external;
    function skim(address to) external;
}
