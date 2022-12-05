// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./interfaces/IHedgeExchanger.sol";
import "@overnight-contracts/connectors/contracts/stuff/Synapse.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


contract StrategyEtsEpsilon is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public dai;
    IERC20 public rebaseToken;
    IHedgeExchanger public hedgeExchanger;
    ISwap public synapseSwap;
    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;
    uint256 public allowedSlippageBp;

    uint256 daiDm;
    uint256 usdcDm;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address rebaseToken;
        address hedgeExchanger;
        address synapseSwap;
        address oracleDai;
        address oracleUsdc;
        uint256 allowedSlippageBp;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        dai = IERC20(params.dai);
        rebaseToken = IERC20(params.rebaseToken);
        hedgeExchanger = IHedgeExchanger(params.hedgeExchanger);
        synapseSwap = ISwap(params.synapseSwap);
        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        allowedSlippageBp = params.allowedSlippageBp;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        // swap usdc to dai
        SynapseLibrary.swap(
            synapseSwap,
            address(usdc),
            address(dai),
            _amount
        );

        // buy
        uint256 daiBalance = dai.balanceOf(address(this));
        dai.approve(address(hedgeExchanger), daiBalance);
        hedgeExchanger.buy(daiBalance, "");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // calculate swap _amount usdc to dai
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 daiForUsdcAmount = ChainlinkLibrary.convertTokenToToken(_amount, usdcDm, daiDm, priceUsdc, priceDai);
        // add 10 bp and 10 for unstake more than requested
        uint256 daiAmount = OvnMath.addBasisPoints(daiForUsdcAmount + 10, 10);
        // sub allowedSlippageBp + 1 bp for unstakeFull
        uint256 rebaseTokenBalance = OvnMath.subBasisPoints(rebaseToken.balanceOf(address(this)), allowedSlippageBp + 1);
        if (daiAmount > rebaseTokenBalance) {
            daiAmount = rebaseTokenBalance;
        }

        // redeem
        rebaseToken.approve(address(hedgeExchanger), daiAmount);
        hedgeExchanger.redeem(daiAmount);

        // swap dai to usdc
        SynapseLibrary.swap(
            synapseSwap,
            address(dai),
            address(usdc),
            dai.balanceOf(address(this))
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // sub allowedSlippageBp + 1 bp for unstakeFull
        uint256 rebaseTokenBalance = OvnMath.subBasisPoints(rebaseToken.balanceOf(address(this)), allowedSlippageBp + 1);

        // redeem
        rebaseToken.approve(address(hedgeExchanger), rebaseTokenBalance);
        hedgeExchanger.redeem(rebaseTokenBalance);

        // swap dai to usdc
        SynapseLibrary.swap(
            synapseSwap,
            address(dai),
            address(usdc),
            dai.balanceOf(address(this))
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this)) + rebaseToken.balanceOf(address(this));

        if (daiBalance > 0) {
            if (nav) {
                uint256 priceDai = uint256(oracleDai.latestAnswer());
                uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
                usdcBalance += ChainlinkLibrary.convertTokenToToken(daiBalance, daiDm, usdcDm, priceDai, priceUsdc);
            } else {
                usdcBalance += SynapseLibrary.calculateSwap(
                    synapseSwap,
                    address(dai),
                    address(usdc),
                    daiBalance
                );
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
