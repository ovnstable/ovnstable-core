// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


import "./interfaces/IStrategy.sol";

import "hardhat/console.sol";

contract AnalyticsPlatform is Initializable, AccessControlUpgradeable, UUPSUpgradeable {


    address [] public strategies;
    IERC20 public usdc;

    // --- events

    event ClaimRewardsError(address strategy, string msg);
    event HealthFactorBalanceError(address strategy, string msg);
    event Claim();

    // ---  modifiers

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
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    function setUsdc(address _usdc) external onlyAdmin {
        usdc = IERC20(_usdc);
    }

    function addStrategy(address _strategy, uint256 _amount) external onlyAdmin {

        for (uint8 i; i < strategies.length; i++) {
            if(strategies[i] == _strategy){
                revert('strategy already exists');
            }
        }

        strategies.push(_strategy);

        usdc.transfer(_strategy, _amount);
        IStrategy(_strategy).stake(address(usdc), _amount);
    }

    function removeStrategy(address _strategy) external onlyAdmin {

        uint256 index;
        for (uint8 i; i < strategies.length; i++) {
            if(strategies[i] == _strategy){
                index = i;
            }
        }

        require(strategies.length > index, "Out of bounds");
        for (uint256 i = index; i < strategies.length - 1; i++) {
            strategies[i] = strategies[i+1];
        }
        strategies.pop();

        IStrategy(_strategy).claimRewards(address(this));
        IStrategy(_strategy).unstake(address(usdc), 0, address(this), true);
    }

    function claimRewardsAndBalance() external onlyAdmin {
        emit Claim();

        for (uint8 i; i < strategies.length; i++) {
            IStrategy strategy = IStrategy(strategies[i]);

            try strategy.claimRewards(address(this)) returns (uint256 amount){

            }catch Error(string memory reason){
                emit ClaimRewardsError(strategies[i], reason);
            }catch(bytes memory){
                emit ClaimRewardsError(strategies[i], 'revert()');
            }

            try strategy.healthFactorBalance(){

            }catch Error(string memory reason){
                emit HealthFactorBalanceError(strategies[i], reason);
            }catch(bytes memory){
                emit ClaimRewardsError(strategies[i], 'revert()');
            }

        }

    }

    function takeBank(address _to) external onlyAdmin{
        usdc.transfer(_to, usdc.balanceOf(address(this)));
    }

    function getStrategies() public view returns(address[] memory){
        return strategies;
    }
}
