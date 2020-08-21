# conflux-sponsor-faucet

A faucet for sponsoring contracts running on Conflux Chain. Before your apply, make sure you understand how the [internal contracts](https://github.com/Conflux-Chain/conflux-rust/tree/master/internal_contract) works.

## Conflux SponsorFaucet SDK
### Frontend

The **faucet-frontend** works with conflux portal.

Constructor for faucet

```js
/**
 * @param url The conflux provider url 
 * @param address The faucet contract address
 */
constructor(url, address)
```
apply to be sponsored, returns transaction with payload data 
```js
/**
 * @param dapp The address of dapp 
 * @param address The sender address of apply message
 */
async apply(dapp, address) -> tx
```

### Backend

The **faucet-backend** supports importing privatekey and apply for sponsor. 

Constructor for faucet

```js
/**
 * @param url The conflux provider url
 * @param address The faucet contract address 
 * @param privatekey The privatekey begins with '0x'
 */
constructor(url, address, privatekey)
```
apply to be sponsored

```js
/**
 * @param dapp The address of dapp 
 */
async apply(dapp)
```
withdraw from faucet

```js
/**
 * @param address The sponsor faucet address 
 * @param amount The amout to be withdrawn
 */
async withdraw(address, amount)
```
pause the faucet

```js
async pause()
```