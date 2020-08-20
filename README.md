# conflux-sponsor-faucet

A faucet for sponsoring contract running on Conflux Chain.

## Conflux SponsorFaucet SDK
### Frontend

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