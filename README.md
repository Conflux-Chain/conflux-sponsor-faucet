# conflux-sponsor-faucet

A faucet for sponsoring contracts running on Conflux Chain. Before your apply, make sure you understand how the [internal contracts](https://github.com/Conflux-Chain/conflux-rust/tree/master/internal_contract) works.

## Conflux SponsorFaucet SDK
The **SponsorFaucet** returns a **rawTx** with suggested gas and input data. 

1. Constructor for faucet
   ```js
   /**
    * @param url The conflux provider url 
    * @param address The faucet contract address
    */
   constructor(url, address)
   ```

2. apply gas sponsorship 

   ```js
   /**
    * @param dapp The address of dapp 
    */
   async applyForGas(dapp) -> rawTx
   ```

3. apply collateral sponsorship

   ```js
   /**
    * @param dapp The address of dapp 
    */
   async applyForCollateral(dapp) -> rawTx
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