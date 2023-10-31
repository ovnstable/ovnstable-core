// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/DForce.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

contract StrategyDForceUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdt;
        address iUsdt;
        address dForceRewardDistributor;
        address dodoApprove;
        address dodoProxy;
        address dfToken;
        address usxToken;
        address usdcToken;
        address dfUsxAdapter;
        address usxUsdcAdapter;
        address usdcUsdtAdapter;
        address dfUsxPair;
        address usxUsdcPair;
        address usdcUsdtPair;
        address feeProxy;
        address broker;
        uint256 usxBrokerFee;
    }

    // --- params

    IERC20 public usdt;
    IToken public iUsdt;
    IRewardDistributor public dForceRewardDistributor;
    address public dodoApprove;
    address public dodoProxy;
    address public dfToken;
    address public usxToken;
    address public usdcToken;
    address public dfUsxAdapter;
    address public usxUsdcAdapter;
    address public usdcUsdtAdapter;
    address public dfUsxPair;
    address public usxUsdcPair;
    address public usdcUsdtPair;
    address public feeProxy;
    address public broker;
    uint256 public usxBrokerFee;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.usdt != address(0), 'usdt is empty');
        require(params.iUsdt != address(0), 'iUsdt is empty');
        require(params.dForceRewardDistributor != address(0), 'dForceRewardDistributor is empty');
        require(params.dodoApprove != address(0), 'dodoApprove is empty');
        require(params.dodoProxy != address(0), 'dodoProxy is empty');
        require(params.dfToken != address(0), 'dfToken is empty');
        require(params.usxToken != address(0), 'usxToken is empty');
        require(params.usdcToken != address(0), 'usdcToken is empty');
        require(params.dfUsxAdapter != address(0), 'dfUsxAdapter is empty');
        require(params.usxUsdcAdapter != address(0), 'usxUsdcAdapter is empty');
        require(params.usdcUsdtAdapter != address(0), 'usdcUsdtAdapter is empty');
        require(params.dfUsxPair != address(0), 'dfUsxPair is empty');
        require(params.usxUsdcPair != address(0), 'usxUsdcPair is empty');
        require(params.usdcUsdtPair != address(0), 'usdcUsdtPair is empty');
        require(params.feeProxy != address(0), 'feeProxy is empty');
        require(params.broker != address(0), 'broker is empty');

        usdt = IERC20(params.usdt);
        iUsdt = IToken(params.iUsdt);
        dForceRewardDistributor = IRewardDistributor(params.dForceRewardDistributor);
        dodoApprove = params.dodoApprove;
        dodoProxy = params.dodoProxy;
        dfToken = params.dfToken;
        usxToken = params.usxToken;
        usdcToken = params.usdcToken;
        dfUsxAdapter = params.dfUsxAdapter;
        usxUsdcAdapter = params.usxUsdcAdapter;
        usdcUsdtAdapter = params.usdcUsdtAdapter;
        dfUsxPair = params.dfUsxPair;
        usxUsdcPair = params.usxUsdcPair;
        usdcUsdtPair = params.usdcUsdtPair;
        feeProxy = params.feeProxy;
        broker = params.broker;
        usxBrokerFee = params.usxBrokerFee;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        uint256 usdtBalance = usdt.balanceOf(address(this));
        usdt.approve(address(iUsdt), usdtBalance);
        iUsdt.mint(address(this), usdtBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        iUsdt.redeemUnderlying(address(this), _amount);
        return usdt.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        iUsdt.redeem(address(this), iUsdt.balanceOf(address(this)));
        return usdt.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdt.balanceOf(address(this)) + iUsdt.balanceOf(address(this)) * iUsdt.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (iUsdt.balanceOf(address(this)) > 0) {
            address[] memory holders = new address[](1);
            holders[0] = address(this);

            address[] memory suppliedITokens = new address[](1);
            suppliedITokens[0] = address(iUsdt);

            address[] memory borrowedITokens;

            dForceRewardDistributor.claimRewards(holders, suppliedITokens, borrowedITokens);
        }

        // sell rewards
        uint256 totalUsdt;

        uint256 dfBalance = IERC20(dfToken).balanceOf(address(this));
        if (dfBalance > 0) {
            bytes[] memory sequence = new bytes[](1);
            sequence[0] = "0x00";

            DodoLibrary.SingleSwapStruct memory dfUsxSwapParams = DodoLibrary.SingleSwapStruct(
                dodoApprove,
                dodoProxy,
                dfToken,
                usxToken,
                dfBalance,
                dfUsxAdapter,
                dfUsxPair,
                feeProxy,
                0,
                sequence,
                abi.encode(broker, usxBrokerFee)
            );

            uint256 usxAmount = DodoLibrary.singleSwap(dfUsxSwapParams);
            if (usxAmount > 0) {
                DodoLibrary.SingleSwapStruct memory usxUsdcSwapParams = DodoLibrary.SingleSwapStruct(
                    dodoApprove,
                    dodoProxy,
                    usxToken,
                    usdcToken,
                    usxAmount,
                    usxUsdcAdapter,
                    usxUsdcPair,
                    feeProxy,
                    0,
                    sequence,
                    abi.encode(broker, 0)
                );

                uint256 usdcAmount = DodoLibrary.singleSwap(usxUsdcSwapParams);
                if (usdcAmount > 0) {
                    DodoLibrary.SingleSwapStruct memory usdcUsdtSwapParams = DodoLibrary.SingleSwapStruct(
                        dodoApprove,
                        dodoProxy,
                        usdcToken,
                        address(usdt),
                        usdcAmount,
                        usdcUsdtAdapter,
                        usdcUsdtPair,
                        feeProxy,
                        1,
                        sequence,
                        abi.encode(broker, 0)
                    );

                    totalUsdt += DodoLibrary.singleSwap(usdcUsdtSwapParams);
                }
            }
        }

        // send rewards
        if (totalUsdt > 0) {
            usdt.transfer(_to, totalUsdt);
        }

        return totalUsdt;
    }

}
