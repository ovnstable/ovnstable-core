//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chronos.sol";
// import "./interfaces/IMaLPNFT.sol";

import "hardhat/console.sol";

contract OdosWrapper is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");

    uint256 public stakeSlippageBP;

    struct OutputToken {
        address tokenAddress;
        address receiver;
    }

    struct InputToken {
        address tokenAddress;
        uint256 amountIn;
    }

    struct SwapData {
        address router;
        InputToken[] inputs;
        OutputToken[] outputs;
        address executor;
        bytes data;
    }

    struct StakeData {
        address gauge;
        address pair;
        address router;
        address token;
    }

    // Контракт успешной транзакции создает события:
    // - Сколько подали токенов на вход
    // - Сколько получили в результате обмена
    // - Сколько положили в пул
    // - Сколько вернули пользователю

    event InputTokens(uint256[] amountsIn, address[] tokensIn);

    event OutputTokens(uint256[] amountsOut, address[] tokensOut);

    event PutIntoPool(uint256[] amountsPut, address[] tokensPut);

    event ReturnedToUser(uint256[] amountsReturned, address[] tokensReturned);

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNIT_ROLE, msg.sender);

        stakeSlippageBP = 4;
    }

    modifier onlyUnit() {
        require(hasRole(UNIT_ROLE, msg.sender), "!Unit");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!Admin");
        _;
    }

    receive() external payable {}

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function swap(SwapData memory swapData) public {
        // different outputs
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.outputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate output tokens"
                );
            }
        }

        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            // different inputs
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.inputs[j].tokenAddress,
                    "Duplicate input tokens"
                );
            }
            // no identical inputs and outputs
            for (uint256 j = 0; j < swapData.outputs.length; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate input and output"
                );
            }

            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            asset.approve(swapData.router, swapData.inputs[i].amountIn);
        }

        (bool success, ) = swapData.router.call{value: 0}(swapData.data);
        require(success, "router swap invalid");

        // Emit events
        address[] memory tokensIn = new address[](swapData.inputs.length);
        uint256[] memory amountsIn = new uint256[](swapData.inputs.length);
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            tokensIn[i] = swapData.inputs[i].tokenAddress;
            amountsIn[i] = swapData.inputs[i].amountIn;
        }
        emit InputTokens(amountsIn, tokensIn);

        address[] memory tokensOut = new address[](swapData.outputs.length);
        uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            tokensOut[i] = swapData.outputs[i].tokenAddress;
            amountsOut[i] = IERC20(tokensOut[i]).balanceOf(swapData.outputs[i].receiver);
        }
        emit OutputTokens(amountsOut, tokensOut);
    }

    function swapAndStakeIntoChronos(SwapData memory swapData, StakeData memory stakeData) public {
        // different outputs
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.outputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate output tokens"
                );
                require(
                    swapData.outputs[i].receiver == address(this),
                    "Receiver of swap is not this contract"
                );
            }
        }

        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            // different inputs
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.inputs[j].tokenAddress,
                    "Duplicate input tokens"
                );
            }
            // no identical inputs and outputs
            for (uint256 j = 0; j < swapData.outputs.length; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate input and output"
                );
            }

            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            asset.approve(swapData.router, swapData.inputs[i].amountIn);
        }

        (bool success, ) = swapData.router.call{value: 0}(swapData.data);
        require(success, "router swap invalid");

        // Emit events
        {
            address[] memory tokensIn = new address[](swapData.inputs.length);
            uint256[] memory amountsIn = new uint256[](swapData.inputs.length);
            for (uint256 i = 0; i < swapData.inputs.length; i++) {
                tokensIn[i] = swapData.inputs[i].tokenAddress;
                amountsIn[i] = swapData.inputs[i].amountIn;
            }
            emit InputTokens(amountsIn, tokensIn);
        }

        address[] memory tokensOut = new address[](swapData.outputs.length);
        uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            tokensOut[i] = swapData.outputs[i].tokenAddress;
            amountsOut[i] = IERC20(tokensOut[i]).balanceOf(swapData.outputs[i].receiver);
        }
        emit OutputTokens(amountsOut, tokensOut);

        IChronosRouter router = IChronosRouter(stakeData.router);
        IChronosGauge gauge = IChronosGauge(stakeData.gauge);
        IChronosPair pair = IChronosPair(stakeData.pair);
        IChronosNFT token = IChronosNFT(stakeData.token);

        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();

        (uint256 tokensAmount0, uint256 tokensAmount1) = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            IERC20Metadata(tokensOut[0]).decimals(),
            IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        asset0.transferFrom(address(this), address(msg.sender), amountsOut[0] - tokensAmount0);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset1.transferFrom(address(this), address(msg.sender), amountsOut[1] - tokensAmount1);

        asset0.approve(stakeData.router, tokensAmount0);
        asset1.approve(stakeData.router, tokensAmount1);

        router.addLiquidity(
            tokensOut[0],
            tokensOut[1],
            true,
            tokensAmount0,
            tokensAmount1,
            OvnMath.subBasisPoints(tokensAmount0, stakeSlippageBP),
            OvnMath.subBasisPoints(tokensAmount1, stakeSlippageBP),
            address(this),
            block.timestamp
        );
        uint256[] memory amountsPut = new uint256[](2);
        amountsPut[0] = tokensAmount0;
        amountsPut[1] = tokensAmount1;
        
        uint256[] memory amountsReturned = new uint256[](2);
        amountsReturned[0] = amountsOut[0] - tokensAmount0;
        amountsReturned[1] = amountsOut[1] - tokensAmount1;
        emit PutIntoPool(amountsPut, tokensOut);
        emit ReturnedToUser(amountsReturned,tokensOut);

        uint256 pairBalance = pair.balanceOf(address(this));
        _stakeToGauge(pairBalance, pair, gauge, token);
    }

    function getAmountToSwap(
        uint256 amount0,
        uint256 amount1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1
    ) internal pure returns (uint256 newAmount0, uint256 newAmount1) {
        if ((reserve0 * 100) / denominator0 > (reserve1 * 100) / denominator1) {
            newAmount1 = (reserve1 * amount0) / reserve0; // 18 +6 - 6
            newAmount0 = (newAmount1 * reserve0) / reserve1; // 18 + 6 - 18
        } else {
            newAmount0 = (reserve0 * amount1) / reserve1;
            newAmount1 = (newAmount0 * reserve1) / reserve0;
        }
    }

    function _stakeToGauge(uint256 pairBalance, IChronosPair pair, IChronosGauge gauge, IChronosNFT token) internal {
        pair.approve(address(gauge), pairBalance);
        uint256 tokenIdNew = gauge.deposit(pairBalance);
        token.safeTransferFrom(address(this), address(msg.sender), tokenIdNew);
    }
}
