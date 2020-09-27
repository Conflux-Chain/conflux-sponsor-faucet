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
        uint256 gas_cnt;
        uint256 collateral_cnt;
        uint256 limit;
    }

    //single sponsor bound
    uint256 public gas_bound;
    uint256 public collateral_bound;
    //upper bound for single tx
    uint256 public upper_bound;
    mapping(address=>detail) public dapps;
    
    event applied(address indexed applicant, address indexed dapp, uint256 indexed upper_bound);
    
    SponsorWhitelistControl cpc = SponsorWhitelistControl(0x0888000000000000000000000000000000000001);
    
    constructor(uint256 gasBound, uint256 collateralBound, uint256 upperBound) public {
        require(upperBound.mul(1000) <= gasBound, 'upperBound too high');
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;
    }
     
    /*** Dapp dev calls ***/ 
    //apply cfx for gas & storage
    function applyFor(address dapp) public nonReentrant whenNotPaused {
        //todo: internal contract require check
        cpc.setSponsorForGas.value(gas_bound)(dapp, upper_bound);
        cpc.setSponsorForCollateral.value(collateral_bound)(dapp);
        dapps[dapp].gas_cnt.add(1);
        dapps[dapp].collateral_cnt.add(1);
        dapps[dapp].limit.add(gas_bound.add(collateral_bound));
        emit applied(msg.sender, dapp, upper_bound);
    }

    function applyForGas(address dapp) public nonReentrant whenNotPaused {
        cpc.setSponsorForGas.value(gas_bound)(dapp, upper_bound);
        dapps[dapp].gas_cnt.add(1);
        dapps[dapp].limit.add(gas_bound);
    }

    function applyForCollateral(address dapp) public nonReentrant whenNotPaused {
        cpc.setSponsorForCollateral.value(collateral_bound)(dapp);
        dapps[dapp].collateral_cnt.add(1);
        dapps[dapp].limit.add(collateral_bound);
    }

    //accept sponsor's cfx
    function () external payable {
    }

    //withdraw to specific address by amount
    function withdraw(address payable sponsor, uint256 amount) public onlyOwner nonReentrant whenPaused {
        require(address(this).balance >= amount, "amount too high");
        //require(sponsor.send(amount), "withdraw failed");
        (bool success, ) = sponsor.call.value(amount)("");
        require(success, "withdraw failed");
    }

    function setBound(uint256 gasBound, uint256 collateralBound, uint256 upperBound) public onlyOwner {
        require(upperBound.mul(1000) <= gasBound, 'upperBound too high');
        gas_bound = gasBound;
        collateral_bound = collateralBound;
        upper_bound = upperBound;   
    }
}
