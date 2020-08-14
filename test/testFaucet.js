const {Conflux} = require('js-conflux-sdk');
const config = require('./config.js').config;
const {gasBound, storageBound, value, upperBound} = config.info;
const fs = require('fs');
const program = require('commander');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const w3 = new Web3();
const cfx = new Conflux({url: config.cfx_oceanus});
const {Faucet} = require('../src/faucet.js');
//const faucet = new Faucet('http://18.182.200.167:12537', '0x8a13c413c861048d9471412c8046f66d3401c7b0');

//console.log(faucet);
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  
async function waitForReceipt(hash) {
  for (;;) {
      let res = await cfx.getTransactionReceipt(hash);
      if (res != null) {
        if (
          res.stateRoot !==
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        ) {
          return res;
        }
      }
      await sleep(30000);
    }
}

const price = 1;

/*
deploy Faucet
->sponsor send cfx
->dapp apply
*/
let owner = cfx.Account(config.cfx_owner);
let user = cfx.Account(config.cfx_user);
let zero = cfx.Account(config.cfx_zero);

async function deploy() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(owner.address));

    console.log('deploy faucet');
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        bytecode: config.faucet_contract.bytecode,
    });

    let tx_hash = await faucet
        .constructor(
            gasBound,
            storageBound,
        )
        .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
            storageLimit: 10000000,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('faucet deploy failed!');
    let faucet_addr = receipt.contractCreated;
    console.log('faucet contract address: ', faucet_addr);
    faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: faucet_addr,
    })
    nonce++;
    
    let dapp = cfx.Contract({
        abi: config.dapp_contract.abi,
        bytecode: config.dapp_contract.bytecode,
    })

    tx_hash = await dapp
        .constructor()
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
            storageLimit: 10000000,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr = receipt.contractCreated;
    console.log('test dapp contract address: ', dapp_addr);
    dapp = cfx.Contract({
        abi: config.dapp_contract.abi,
        address: dapp_addr,
    });
    nonce++;

    let res = {}
    res.faucet_address = faucet_addr;
    res.dapp_address = dapp_addr;
    fs.writeFileSync(
        __dirname + '/address.json',
        JSON.stringify(res),
    );
    
    //sponsor first send cfx
    console.log('send cfx to faucet');
    tx_hash = await cfx.sendTransaction({
        from: owner,
        to: faucet_addr,
        gas: 21040,
        nonce: nonce,
        gasPrice: 1,
        value: value,
    });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('init sponsor failed!');
    nonce++;

    let faucet_balance = Number(await cfx.getBalance(faucet_addr));
    console.log('faucet current balance: ', faucet_balance);

    let estimateData = await dapp.set(faucet_addr, 1).estimateGasAndCollateral();
    let gas = new BigNumber(estimateData.gasUsed)
        .multipliedBy(1.3)
        .integerValue()
        .toString();
    console.log('estimated dapp set upper_bound: ', gas);
    
    //Dapp Dev apply to get 
    console.log('apply to faucet');
    gas = w3.utils.toHex(new BigNumber(0.0001).multipliedBy(1e18));
    tx_hash = await faucet.applyFor(dapp_addr, gas)
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('apply failed!');
    nonce++;

    //dapp add user
    console.log('dapp add user');
    tx_hash = await dapp.add(zero.address)
        .sendTransaction({
            from: owner,
            gas: 10000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp add user failed!');
    nonce++;
    
    //dapp set
    let userNonce = Number(await cfx.getNextNonce(zero.address));
    console.log('zero nonce: ', userNonce);
    console.log('dapp set');
    tx_hash = await dapp.set(faucet_addr, 1)
        .sendTransaction({
            from: zero,
            gas: 10000000,
            nonce: 0,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp set failed!');
    
    //withdraw from faucet
    console.log('pauce faucet');
    tx_hash = await faucet.pause()
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('pause failed!');
    nonce++;

    console.log('withdraw all');
    let balance = await cfx.getBalance(faucet_addr);
    console.log('faucet current balance', balance);
    tx_hash = await faucet.withdraw(owner, balance)
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw all failed!');
    nonce++;
    balance = await cfx.getBalance(faucet_addr);
    console.log('balance after withdraw: ' + balance);
}

async function withdraw(address) {
    let receipt;
    let tx_hash;
    let nonce = Number(await cfx.getNextNonce(owner.address));
    let balance = Number(await cfx.getBalance(address));
    console.log('faucet current balance: ', balance);
    
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    
    console.log('pauce faucet');
    tx_hash = await faucet.pause()
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('pause failed!');
    nonce++;
    
    let val = w3.utils.toHex(new BigNumber(balance));
    let estimateData = await faucet.withdraw(owner, balance).estimateGasAndCollateral();
    let gas = new BigNumber(estimateData.gasUsed)
        .multipliedBy(1.5)
        .integerValue()
        .toString();
    console.log('send tx, gas: ', gas);
    tx_hash = await faucet.withdraw(owner, val)
        .sendTransaction({
            from: owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: 1,
        });
    receipt = await waitForReceipt(tx_hash);
    console.log(receipt);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw failed!');
}

program
  .option('-d, --deploy', 'deploy faucet contract')
  .option('-w, --address [type]', 'withdraw from faucet')
  .option('-t, --test', 'unit test')
  .parse(process.argv);

if(program.deploy) {
    deploy();
}
if(program.address) {
    console.log(program.address);
    withdraw(program.address);
}