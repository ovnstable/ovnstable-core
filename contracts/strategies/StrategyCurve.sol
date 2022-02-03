// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "hardhat/console.sol";
import "../interfaces/IPriceGetter.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";


contract StrategyCurve is IStrategy, AccessControlUpgradeable, UUPSUpgradeable{

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    iCurvePool public curve;
    ILendingPoolAddressesProvider public aave;
    IRewardOnlyGauge public rewardGauge;

    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public a3CrvToken;
    IERC20 public a3CrvGaugeToken;


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

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // --- Setters

    function setParams(address _aave,
                       address _curve,
                       address _rewardGauge,
                       address _usdc,
                       address _aUsdc,
                       address _a3CrvToken,
                       address _a3CrvGaugeToken) external onlyAdmin {

        require(_aave != address(0), "Zero address not allowed");
        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_curve != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        curve = iCurvePool(_curve);
        aave = ILendingPoolAddressesProvider(_aave);

        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);
    }



    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external {
        require(_asset == address(usdc) , "Some token not compatible" );

        address current = address(this);
        console.log("Balance usdc %s", IERC20(_asset).balanceOf(current));

        _stakeAave(address(usdc), _amount, current);
        _stakeCurve(address(aUsdc), _amount, current);

        uint256 a3CrvBalance = a3CrvToken.balanceOf(current);
        a3CrvToken.approve(address(rewardGauge), a3CrvBalance);
        rewardGauge.deposit(a3CrvBalance, current, false);

        console.log("Balance a3CrvGauge %s", a3CrvGaugeToken.balanceOf(current));

        a3CrvGaugeToken.transfer(_beneficiary, a3CrvGaugeToken.balanceOf(current));

        console.log("Balance a3CrvGauge %s", a3CrvGaugeToken.balanceOf(current));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external returns (uint256) {


    }

    function netAssetValue(address _holder) external view override returns (uint256){

        uint256 balance = a3CrvGaugeToken.balanceOf(_holder); // 18
        uint256 price = curve.get_virtual_price(); // 18

        // 18 + 18 = 36
        uint256 result = (balance  * price);

        // 36 - 18 - 12 = 6
        return  (result / (10 ** 18)) / 10 ** 12;

    }

    function liquidationValue(address _holder) external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(_holder); // 18
        uint256 price = curve.get_virtual_price(); // 18

        // 18 + 18 = 36
        uint256 result = (balance  * price);

        // 36 - 18 - 12 = 6
        return  (result / (10 ** 18)) / 10 ** 12;
    }


    function _stakeAave(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) internal {
        ILendingPool pool = ILendingPool(aave.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);
        pool.deposit(_asset, _amount, _beneficiar, 0);
    }

    function _stakeCurve(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) internal  {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = curve.coins(i);
            if (coin == _asset) {
                IERC20(_asset).approve(address(curve), _amount);
                // номер позиции в массиве (amounts) определяет какой актив (_asset) и в каком количестве (_amount)
                // на стороне керва будет застейкано
                amounts[uint256(i)] = _amount;
                uint256 lpTokAmount = curve.calc_token_amount(amounts, true);
                //TODO: процентажи кудато вынести, slippage
                uint256 retAmount = curve.add_liquidity(amounts, (lpTokAmount * 99) / 100, false);
                IERC20(curve.lp_token()).transfer(_beneficiar, retAmount);

                return;
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for staking in curve");
    }


    function _unstakeCurve(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) internal returns (uint256) {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = curve.coins(i);

            if (coin == _asset) {
                amounts[i] = _amount;

                IERC20 lpToken = IERC20(curve.lp_token());
                uint256 onConnectorLpTokenAmount = lpToken.balanceOf(address(this));

                uint256 lpTokAmount = curve.calc_token_amount(amounts, false);
                // _one_coin для возврата конкретной монеты (_assest)
                uint256 withdrawAmount = curve.calc_withdraw_one_coin(lpTokAmount, int128(uint128(i)));
                if (withdrawAmount > onConnectorLpTokenAmount) {
                    revert(string(
                        abi.encodePacked(
                            "Not enough lpToken own ",
                            " _amount: ",
                            Strings.toString(_amount),
                            " lpTok: ",
                            Strings.toString(lpTokAmount),
                            " onConnectorLpTokenAmount: ",
                            Strings.toString(onConnectorLpTokenAmount),
                            " withdrawAmount: ",
                            Strings.toString(withdrawAmount)
                        )
                    ));
                }

                lpToken.approve(address(curve), lpTokAmount);

                //TODO: use withdrawAmount?
                uint256 retAmount = curve.remove_liquidity_one_coin(lpTokAmount, int128(uint128(i)), 0);

                IERC20(_asset).transfer(_beneficiar, retAmount);
                lpToken.transfer(
                    _beneficiar,
                    lpToken.balanceOf(address(this))
                );
                return retAmount;
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for withdraw from curve");
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        return 0;
    }

}
