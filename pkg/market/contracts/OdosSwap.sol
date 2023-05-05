//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IOdosRouter.sol";

import "hardhat/console.sol";

contract OdosSwap is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");

    struct SwapData {
        address router;
        IOdosRouter.inputToken[] inputs;
        IOdosRouter.outputToken[] outputs;
        uint256 valueOutQuote;
        uint256 valueOutMin;
        address executor;
        bytes data;
    }

    // Контракт успешной транзакции создает события:
    // - Сколько подали токенов на вход
    // - Сколько получили в результате обмена
    // - Сколько положили в пул
    // - Сколько вернули пользователю

    event InputTokens(uint256[] amountsIn, address[] tokensIn);

    event OutputTokens(uint256[] amountsOut, address[] tokensOut);

    event PutIntoPool(address pool, uint256[] amountsPut, address[] tokensPut);

    event ReturnedToUser(uint256[] amountsReturned, address[] tokensReturned);

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNIT_ROLE, msg.sender);
    }

    modifier onlyUnit() {
        require(hasRole(UNIT_ROLE, msg.sender), "!Unit");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!Admin");
        _;
    }

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

            // IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            // bool success = asset.approve(swapData.router, MAX_UINT_VALUE); //MAX_UINT_VALUE
            // require(success, "no success");
        }

        IOdosRouter odosRouter = IOdosRouter(swapData.router);
        // when pools added, update outputs to specific proportions, mb recreate from scratch
        console.log(
            "%s",
            IERC20(swapData.inputs[0].tokenAddress).allowance(msg.sender, swapData.router)
        );
        // console.log("%s %s", swapData.valueOutQuote, swapData.valueOutMin);
        // console.log("%s %s", swapData.inputs, swapData.outputs);
        (uint256[] memory tokensAmountsOut, uint256 gasLeft) = odosRouter.swap(
            swapData.inputs,
            swapData.outputs,
            swapData.valueOutQuote,
            swapData.valueOutMin,
            swapData.executor,
            swapData.data
        );

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
            amountsOut[i] = amountsOut[i];
        }
        emit OutputTokens(amountsOut, tokensOut);

        // amountsOut to put where?
        address[] memory tokensPut = new address[](0);
        uint256[] memory amountsPut = new uint256[](0);
        emit PutIntoPool(swapData.router, amountsPut, tokensPut);

        address[] memory tokensReturned = new address[](swapData.inputs.length);
        uint256[] memory amountsReturned = new uint256[](swapData.inputs.length);
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            tokensReturned[i] = swapData.inputs[i].tokenAddress;
            amountsReturned[i] = amountsOut[i];
        }
        emit ReturnedToUser(amountsReturned, tokensReturned);
    }
}
