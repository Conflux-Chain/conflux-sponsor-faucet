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
        uint256 gas_cnt; //counter for gas application
        uint256 collateral_cnt; //counter for collateral application
        uint256 total_applied; //total applied amount
    }

    //single sponsor bound
    uint256 public gas_bound;
    uint256 public collateral_bound;
    //upper bound for single tx
    uint256 public upper_bound;
    
    mapping(address=>detail) public dapps;
    
    event applied(address indexed applicant, address indexed dapp, uint256 indexed amount);
    
    SponsorWhitelistControl internal_sponsor_faucet = SponsorWhitelistControl(0x0888000000000000000000000000000000000001);
    
    constructor(uint256 gasBound, uint256 collateralBound, uint256 upperBound) public {
        require(upperBound.mul(1000) <= gasBound, 'upperBound too high');
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
    }
     
    /*** Dapp dev calls ***/ 
    function applyForGas(address dapp) public nonReentrant whenNotPaused {
        require(address(this).balance >= gas_bound, "faucet out of money");
        require(internal_sponsor_faucet.getSponsoredBalanceForGas(dapp) < gas_bound, "sponsor value too low");
        internal_sponsor_faucet.setSponsorForGas.value(gas_bound)(dapp, upper_bound);
        dapps[dapp].gas_cnt.add(1);
        dapps[dapp].total_applied.add(gas_bound);
        emit applied(msg.sender, dapp, upper_bound);
    }

    function applyForCollateral(address dapp) public nonReentrant whenNotPaused {
        require(address(this).balance >= collateral_bound, "faucet out of money");
        require(internal_sponsor_faucet.getSponsoredBalanceForGas(dapp) < collateral_bound, "sponsor value too low");
        internal_sponsor_faucet.setSponsorForCollateral.value(collateral_bound)(dapp);
        dapps[dapp].collateral_cnt.add(1);
        dapps[dapp].total_applied.add(collateral_bound);
        emit applied(msg.sender, dapp, collateral_bound);
    }

    //accept sponsor's cfx
    function () external payable {
    }

    //withdraw to specific address by amount
    function withdraw(address payable sponsor, uint256 amount) public onlyOwner nonReentrant whenPaused {
        require(address(this).balance >= amount, "amount too high");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    //set bounds for sponsorship
    function setBounds(uint256 gasBound, uint256 collateralBound, uint256 upperBound) public onlyOwner {
        require(upperBound.mul(1000) <= gasBound, 'upperBound too high');
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;   
    }
}
