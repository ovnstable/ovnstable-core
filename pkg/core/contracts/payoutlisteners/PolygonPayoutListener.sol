// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../PayoutListener.sol";

contract PolygonPayoutListener is PayoutListener {

    address[] public qsSyncPools;
    address[] public qsSkimPools;
    address[] public qsBribes;
    IERC20 public usdPlus;
    mapping(address => uint256) public skimPoolBalances; // pool address -> USD+ balance

    // ---  events

    event SkimReward(address pool, uint256 amount);

    // --- setters

    function setTokens(address _usdPlus) external onlyAdmin {
        usdPlus = IERC20(_usdPlus);
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

    function _skim() internal {

        for (uint256 i = 0; i < qsSkimPools.length; i++) {
            address pool = qsSkimPools[i];

            uint256 balanceBefore = usdPlus.balanceOf(address(this));
            Pool(pool).skim(address(this));

            // calculate how to much has increase USD+ after call SKIM
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - balanceBefore;

            // Add previous balance USD+
            amountUsdPlus += skimPoolBalances[pool];

            if(amountUsdPlus > 0) {
                Bribe bribe = Bribe(qsBribes[i]);

                // Amount USD+ on Bribe contract
                uint256 bribeAmount = bribe.left(address(usdPlus));

                // if we do not have enough amount USD+, then we do not charge bribes and save this USD+ to next payout
                if(amountUsdPlus > bribeAmount){

                    usdPlus.approve(address(bribe), amountUsdPlus);
                    bribe.notifyRewardAmount(address(usdPlus), amountUsdPlus);

                    // reset balance for pool
                    skimPoolBalances[pool] = 0;
                    emit SkimReward(pool, amountUsdPlus);
                }else {
                    // save balance for the next payout
                    skimPoolBalances[pool] = amountUsdPlus;
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
