pragma solidity 0.5.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/lifecycle/Pausable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Lib/ReentrancyGuard.sol";
import "./InternalContract.sol";

contract SponsorFaucet is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    struct detail {
        uint256 gas_amount_accumulated; //current accumulated sponsored amout for gas
        uint256 collateral_amount_accumulated; //current total sponsored amount for collateral
    }

    /*** bounds set by foundation ***/
    //total sponsored limit
    uint256 public gas_total_limit;
    uint256 public collateral_total_limit;
    //single sponsor bound
    uint256 public gas_bound;
    uint256 public collateral_bound;
    //upper bound for single tx
    uint256 public upper_bound;

    mapping(address => detail) public dapps;

    event applied(
        address indexed applicant,
        address indexed dapp,
        uint256 amount
    );

    SponsorWhitelistControl internal_sponsor = SponsorWhitelistControl(
        0x0888000000000000000000000000000000000001
    );

    constructor(
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound
    ) public {
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        gas_total_limit = gasTotalLimit;
        collateral_total_limit = collateralTotalLimit;
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
    }

    /*** Dapp dev calls ***/
    function applyGasAndCollateral(address dapp)
        public
        nonReentrant
        whenNotPaused
    {
        if (_isAppliableForGas(dapp)) _applyForGas(dapp);
        if (_isAppliableForCollateral(dapp)) _applyForCollateral(dapp);
    }

    function isAppliable(address dapp) public returns (bool) {
        if (_isAppliableForGas(dapp) || _isAppliableForCollateral(dapp))
            return true;
        _validateApplyForGas(dapp);
        _validateApplyForCollateral(dapp);
    }

    function _isAppliableForGas(address dapp) internal returns (bool) {
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        if (
            current_sponsor == address(this) ||
            current_sponsor ==
            address(0x0000000000000000000000000000000000000000)
        ) {
            return
                address(this).balance >= gas_bound &&
                gas_balance < gas_bound &&
                dapps[dapp].gas_amount_accumulated.add(gas_bound) <=
                gas_total_limit;
        }

        uint256 current_upper_bound = internal_sponsor
            .getSponsoredGasFeeUpperBound(dapp);
        return
            gas_balance < current_upper_bound &&
            address(this).balance >= gas_bound &&
            gas_balance < gas_bound &&
            dapps[dapp].gas_amount_accumulated.add(gas_bound) <=
            gas_total_limit;
    }

    function _validateApplyForGas(address dapp) internal {
        address current_sponsor = internal_sponsor.getSponsorForGas(dapp);
        uint256 gas_balance = internal_sponsor.getSponsoredBalanceForGas(dapp);
        if (
            current_sponsor != address(this) &&
            current_sponsor !=
            address(0x0000000000000000000000000000000000000000)
        ) {
            require(
                gas_balance <
                    internal_sponsor.getSponsoredGasFeeUpperBound(dapp),
                "can not replace 3rd party sponsor"
            );
        }
        require(address(this).balance >= gas_bound, "faucet out of money");
        require(gas_balance < gas_bound, "sponsored fund unused");
        require(
            dapps[dapp].gas_amount_accumulated.add(gas_bound) <=
                gas_total_limit,
            "over gas total limit"
        );
    }

    function _isAppliableForCollateral(address dapp) internal returns (bool) {
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        if (
            address(this).balance >= collateral_bound &&
            collateral_balance < collateral_bound &&
            dapps[dapp].collateral_amount_accumulated.add(collateral_bound) <=
            collateral_total_limit
        ) {
            return true;
        }
    }

    function _validateApplyForCollateral(address dapp) internal {
        require(
            address(this).balance >= collateral_bound,
            "faucet out of money"
        );
        uint256 collateral_balance = internal_sponsor
            .getSponsoredBalanceForCollateral(dapp);
        require(collateral_balance < collateral_bound, "sponsored fund unused");
        require(
            dapps[dapp].collateral_amount_accumulated.add(collateral_bound) <
                collateral_total_limit,
            "over collateral total limit"
        );
    }

    function _applyForGas(address dapp) internal {
        internal_sponsor.setSponsorForGas.value(gas_bound)(dapp, upper_bound);
        dapps[dapp].gas_amount_accumulated = dapps[dapp]
            .gas_amount_accumulated
            .add(gas_bound);
        emit applied(msg.sender, dapp, gas_bound);
    }

    function _applyForCollateral(address dapp) internal {
        internal_sponsor.setSponsorForCollateral.value(collateral_bound)(dapp);
        dapps[dapp].collateral_amount_accumulated = dapps[dapp]
            .collateral_amount_accumulated
            .add(collateral_bound);
        emit applied(msg.sender, dapp, collateral_bound);
    }

    //accept sponsor's cfx
    function() external payable {}

    //withdraw to specific address by amount
    function withdraw(address payable sponsor, uint256 amount)
        public
        onlyOwner
        nonReentrant
        whenPaused
    {
        require(address(this).balance >= amount, "amount too high");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    //set bounds for sponsorship
    function setBounds(
        uint256 gasTotalLimit,
        uint256 collateralTotalLimit,
        uint256 gasBound,
        uint256 collateralBound,
        uint256 upperBound
    ) public onlyOwner {
        //rule by internal contract
        require(upperBound.mul(1000) <= gasBound, "upperBound too high");
        gas_total_limit = gasTotalLimit;
        collateral_total_limit = collateralTotalLimit;
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
    }
}
