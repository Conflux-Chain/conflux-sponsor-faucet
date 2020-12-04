# conflux-sponsor-faucet

A faucet for sponsoring contracts running on Conflux Chain. Before your apply, make sure you understand how the [internal contracts](https://github.com/Conflux-Chain/conflux-rust/tree/master/internal_contract) works.

## Conflux SponsorFaucet SDK
The **SponsorFaucet** returns a **rawTx** with suggested gas and input data. 

1. Constructor for faucet
   ```js
   /**
    * @param url The conflux provider url 
    * @param address The faucet contract address
    * @param lastAddress The last faucet contract address 
    */
   constructor(url, address, lastAddress)
   ```

2. apply gas / collateral sponsorship 

   ```js
   /**
    * @param dapp The address of dapp 
    */
   async apply(dapp) -> rawTx
   ```

3. check if appliable

   ```js
   /**
    * @param dapp The address of dapp 
    */
   async checkAppliable(dapp) -> 
   {	
     	flag: bool,
     	message: string //error message and empty if success 
   }
   ```
4. withdraw from faucet

   ```js
    /**
    * @param address address to accept fund 
    * @param amount amount to withdraw
    */
   async withdraw(address, amount) -> rawTx
   ```
5. set bounds for sponsorship

   ```js
   /**
    * @param gasTotalLimit total sponsored gas limit
    * @param collateralTotalLimit total sponsored collateral limit
    * @param gasBound single sponsor gas bound
    * @param collateralBound single sponsor collateral bound
    * @param upperBound upperBound for single tx gas
    */
   async setBounds(gasTotalLimit, collateralTotalLimit, gasBound, collateralBound, upperBound) -> rawTx
   ```

6. pause/unpause the faucet

   ```js
   async pause() -> rawTx
   async unpause() -> rawTx
   ```

7. get bounds and limits of faucet

   ```js
   /**
    * @param dapp contract address
    */
   async getFaucetParams(dapp) -> 
   {
     	gas_total_limit: JSBI,
     	collateral_total_limit: JSBI,
     	gas_bound: JSBI,
     	collateral_bound: JSBI,
     	upper_bound: JSBI
   }
   ```

8. get accumulated sponsored amouts of a contract/dapp

   ```js
   async getAmountAccumulated(dapp) -> 
   {
    	gas_amount_accumulated: JSBI,
    	collateral_amount_accumulated: JSBI
   }
   ```

### ERROR CODE
#### Address Check
1. ERROR_ADDRESS_IS_NOT_CONTRACT // Application address is not a contract
#### For Gas
1. ERROR_GAS_CANNOT_REPLACE_THIRD_PARTY_SPONSOR // Faucet cannot replace third-party sponsors
2. ERROR_GAS_FAUCET_OUT_OF_MONEY // Faucet insufficient balance
3. ERROR_GAS_SPONSORED_FUND_UNUSED // Sponsored but not used
4. ERROR_GAS_OVER_GAS_TOTAL_LIMIT // Exceeds the total gas sponsorship limit
#### For storage/collateral
1. ERROR_COLLATERAL_CANNOT_REPLACE_OLD_FAUCET // Contract upgraded, please contact the administrator
2. ERROR_COLLATERAL_CANNOT_REPLACE_THIRD_PARTY_SPONSOR // Faucet cannot replace third-party sponsors
3. ERROR_COLLATERAL_FAUCET_OUT_OF_MONEY // Faucet insufficient balance
4. ERROR_COLLATERAL_SPONSORED_FUND_UNUSED // Sponsored but not used
5. ERROR_COLLATERAL_OVER_COLLATERAL_TOTAL_LIMIT // Exceeds the maximum amount of collateral sponsorship
