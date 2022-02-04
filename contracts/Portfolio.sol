// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Portfolio is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    mapping(address => uint256) public strategyWeightPositions;
    StrategyWeight[] public strategyWeights;

    event UpdatedAssetWeight(
        uint256 index,
        address asset,
        uint256 minWeight,
        uint256 targetWeight,
        uint256 maxWeight
    );
    event UpdatedAssetInfo(uint256 index, address asset, address priceGetter);

    event UpdatedStrategyWeight(
        uint256 index,
        address strategy,
        uint256 minWeight,
        uint256 targetWeight,
        uint256 maxWeight
    );

    struct StrategyWeight {
        address strategy;
        uint256 minWeight;
        uint256 targetWeight;
        uint256 maxWeight;
    }


    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}



    function setStrategyWeights(StrategyWeight[] calldata _strategyWeights) external onlyAdmin {
        uint256 totalTarget = 0;
        for (uint8 i = 0; i < _strategyWeights.length; i++) {
            StrategyWeight memory strategyWeight = _strategyWeights[i];
            require(strategyWeight.strategy != address(0), "weight without strategy");
            require(
                strategyWeight.minWeight <= strategyWeight.targetWeight,
                "minWeight shouldn't higher than targetWeight"
            );
            require(
                strategyWeight.targetWeight <= strategyWeight.maxWeight,
                "targetWeight shouldn't higher than maxWeight"
            );
            totalTarget += strategyWeight.targetWeight;
        }
        require(totalTarget == TOTAL_WEIGHT, "Total target should equal to TOTAL_WEIGHT");

        for (uint8 i = 0; i < _strategyWeights.length; i++) {
            _addStrategyWeightAt(_strategyWeights[i], i);
            strategyWeightPositions[strategyWeights[i].strategy] = i;
        }

        // truncate if need
        if (strategyWeights.length > _strategyWeights.length) {
            uint256 removeCount = strategyWeights.length - _strategyWeights.length;
            for (uint8 i = 0; i < removeCount; i++) {
                strategyWeights.pop();
            }
        }
    }

    function _addStrategyWeightAt(StrategyWeight memory strategyWeight, uint256 index) internal {
        uint256 currentLength = strategyWeights.length;
        // expand if need
        if (currentLength == 0 || currentLength - 1 < index) {
            uint256 additionalCount = index - currentLength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                strategyWeights.push();
            }
        }
        strategyWeights[index] = strategyWeight;
        emit UpdatedStrategyWeight(
            index,
            strategyWeight.strategy,
            strategyWeight.minWeight,
            strategyWeight.targetWeight,
            strategyWeight.maxWeight
        );
    }


    function getStrategyWeight(address strategy) external view returns (StrategyWeight memory) {
        return strategyWeights[strategyWeightPositions[strategy]];
    }

    function getAllStrategyWeights() external view returns (StrategyWeight[] memory) {
        return strategyWeights;
    }

}
