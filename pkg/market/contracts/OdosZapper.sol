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

contract OdosZapper is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");

    uint256 public stakeSlippageBP;
    address public odosRouter;

    struct OutputToken {
        address tokenAddress;
        address receiver;
    }

    struct InputToken {
        address tokenAddress;
        uint256 amountIn;
    }

    struct SwapData {
        InputToken[] inputs;
        OutputToken[] outputs;
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
            asset.approve(odosRouter, swapData.inputs[i].amountIn);
        }
        _swap(swapData);
    }

    function _swap(SwapData memory swapData) internal returns (address[] memory, uint256[] memory) {
        (bool success, ) = odosRouter.call{value: 0}(swapData.data);
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
        return (tokensOut, amountsOut);
    }
}
