// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IStrategy.sol";

contract PortfolioManager is IPortfolioManager, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    uint256 public constant TOTAL_WEIGHT = 100000; // 100000 ~ 100%

    // ---  fields

    address public exchanger;
    IERC20 usdc;
    mapping(address => uint256) public strategyWeightPositions;
    StrategyWeight[] public strategyWeights;



    // ---  events

    event ExchangerUpdated(address value);
    event UsdcUpdated(address value);
    event Exchanged(uint256 amount, address from, address to);

    event StrategyWeightUpdated(
        uint256 index,
        address strategy,
        uint256 minWeight,
        uint256 targetWeight,
        uint256 maxWeight,
        bool enabled,
        bool enabledReward
    );


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    // ---  constructor

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

    // ---  setters

    function setExchanger(address _exchanger) public onlyAdmin {
        require(_exchanger != address(0), "Zero address not allowed");

        revokeRole(EXCHANGER, exchanger);
        grantRole(EXCHANGER, _exchanger);

        exchanger = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setUsdc(address _usdc) public onlyAdmin {
        require(_usdc != address(0), "Zero address not allowed");

        usdc = IERC20(_usdc);
        emit UsdcUpdated(_usdc);
    }



    // ---  logic

    function deposit(IERC20 _token, uint256 _amount) external override onlyExchanger {
        _balance();
    }


    function withdraw(IERC20 _token, uint256 _amount)
    external
    override
    onlyExchanger
    returns (uint256)
    {
        require(address(_token) == address(usdc), "PM: Only USDC now available to withdraw");

        // balance to needed amount
        _balance(_token, _amount);

        uint256 currentBalance = _token.balanceOf(address(this));

        // `if` is cheaper then `require` when need build complex message
        if (currentBalance < _amount) {
            revert(string(
                abi.encodePacked(
                    "In portfolioManager not enough for transfer _amount: ",
                    Strings.toString(currentBalance),
                    " < ",
                    Strings.toString(_amount)
                )
            ));
        }

        // transfer back tokens
        _token.transfer(exchanger, _amount);

        return _amount;
    }

    function claimAndBalance() external override onlyExchanger {
        _claimRewards();
        _balance();
    }

    function _claimRewards() internal {
        StrategyWeight[] memory strategies = getAllStrategyWeights();

        for (uint8 i; i < strategies.length; i++) {
            StrategyWeight memory item = strategies[i];

            if (item.enabledReward) {
                IStrategy(item.strategy).claimRewards(address(this));
            }
        }
    }

    function _balance() internal {
        // Same to zero withdrawal balance
        _balance(IERC20(address(0)), 0);
    }

    function _balance(IERC20 withdrawToken, uint256 withdrawAmount) internal {

        StrategyWeight[] memory strategies = getAllStrategyWeights();

        // 1. calc total USDC equivalent
        uint256 totalUsdc = usdc.balanceOf(address(this));
        uint256 totalWeight = 0;
        for (uint8 i; i < strategies.length; i++) {
            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            // UnstakeFull from Strategies with targetWeight == 0
            if(strategies[i].targetWeight == 0){
                totalUsdc += IStrategy(strategies[i].strategy).unstake(
                    address(usdc),
                    0,
                    address(this),
                    true
                );
            }else {
                totalUsdc += IStrategy(strategies[i].strategy).netAssetValue();
                totalWeight += strategies[i].targetWeight;
            }

        }

        if (address(withdrawToken) == address(usdc)) {
            require(totalUsdc >= withdrawAmount, "Trying withdraw more than liquidity available");
            // it make to move to PortfolioManager extra USDC to withdraw
            totalUsdc = totalUsdc - withdrawAmount;
        }

        // 3. calc diffs for strategies liquidity
        Order[] memory stakeOrders = new Order[](strategies.length);
        uint8 stakeOrdersCount = 0;
        for (uint8 i; i < strategies.length; i++) {

            if (!strategies[i].enabled) {// Skip if strategy is not enabled
                continue;
            }

            uint256 targetLiquidity;
            if (strategies[i].targetWeight == 0) {
                targetLiquidity = 0;
            } else {
                targetLiquidity = (totalUsdc * strategies[i].targetWeight) / totalWeight;
            }

            uint256 currentLiquidity = IStrategy(strategies[i].strategy).netAssetValue();
            if (targetLiquidity == currentLiquidity) {
                // skip already at target strategies
                continue;
            }

            if (targetLiquidity < currentLiquidity) {
                // unstake now
                IStrategy(strategies[i].strategy).unstake(
                    address(usdc),
                    currentLiquidity - targetLiquidity,
                    address(this),
                    false
                );
            } else {
                // save to stake later
                stakeOrders[stakeOrdersCount] = Order(
                    true,
                    strategies[i].strategy,
                    targetLiquidity - currentLiquidity
                );
                stakeOrdersCount++;
            }
        }

        // 4.  make staking
        for (uint8 i; i < stakeOrdersCount; i++) {

            address strategy = stakeOrders[i].strategy;
            uint256 amount = stakeOrders[i].amount;

            usdc.transfer(strategy, amount);

            IStrategy(strategy).stake(
                address(usdc),
                amount
            );
        }

    }

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
        emit StrategyWeightUpdated(
            index,
            strategyWeight.strategy,
            strategyWeight.minWeight,
            strategyWeight.targetWeight,
            strategyWeight.maxWeight,
            strategyWeight.enabled,
            strategyWeight.enabledReward
        );
    }


    function getStrategyWeight(address strategy) public override view returns (StrategyWeight memory) {
        return strategyWeights[strategyWeightPositions[strategy]];
    }

    function getAllStrategyWeights() public override view returns (StrategyWeight[] memory) {
        return strategyWeights;
    }

}
