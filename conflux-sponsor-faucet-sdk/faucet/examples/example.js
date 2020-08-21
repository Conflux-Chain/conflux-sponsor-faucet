const Faucet = require('faucet');
const BigNumber = require('bignumber.js');
const Conflux = require('js-conflux-sdk');

const faucetAddress = '';
const cfxUrl = '';
const privatekey = '';
const dappAddress = '';
const walletAddress = '';

const cfx = new Conflux.Conflux({url: cfxUrl});

const faucet = Faucet.Faucet(cfxUrl, faucetAddress, privatekey);

async function main() {
    //apply
    await faucet.apply(dappAddress);
    
    //withdraw from faucet only for Admin
    let amount = await cfx.getBalance(faucetAddress);
    await faucet.pause();
    await faucet.withdraw(walletAddress, amount);
}

main();