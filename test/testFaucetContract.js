const {Conflux} = require('js-conflux-sdk');
const config = require('./config.js').config;
const {gasTotalLimit, collateralTotalLimit, gasBound, storageBound, value, upperBound} = config.info;
const fs = require('fs');
const program = require('commander');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const w3 = new Web3();
const cfx = new Conflux({url: config.cfx_testnet});
const internalContract = require('../build/contracts/SponsorWhitelistControl.json');
const testFaucet = require('../build/contracts/testFaucet.json');
const dappN = require('../build/contracts/dappN.json');
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
const internal_contractAddr = '0x0888000000000000000000000000000000000001';
  
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

//let owner = cfx.Account(config.cfx_owner);
//let new_owner = cfx.Account(config.cfx_user);
let new_owner = cfx.Account(config.cfx_zero);
let zero = cfx.Account(config.cfx_testUser);
let oneCFX = cfx.Account(config.cfx_user); 
let testUser = cfx.Account(config.test_wcfx);
let wcfx = cfx.Account(config.wcfx);

async function deployTestDappN() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    
    let dapp = cfx.Contract({
        abi: dappN.abi,
        bytecode: dappN.bytecode,
    })
    
    let tx_hash = await dapp
        .constructor()
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp deploy failed!');
    let dapp_addr = receipt.contractCreated;
    console.log('test dapp contract address: ', dapp_addr);
    nonce++;
    
    dapp = cfx.Contract({
        abi: dappN.abi,
        address: dapp_addr,
    })

    console.log('dapp add user');
    tx_hash = await dapp.add('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            gasPrice: 1,
            nonce: nonce,
        });
    console.log('tx_hash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp add user failed!');
    nonce++;
}

/*
deploy faucet ->
deploy dapp ->
send cfx to faucet ->
check if appliable ->
apply dapp to faucet ->
zero balance user call dapp set function -> check if set success
faucet out of money ->
set new bounds -> apply dapp2 to check new bounds
3rd part sponsor engage 
    -> gas, collateral
    -> check isAppliable
faucet continue to be sponsor
check params of 
pause/unpause->
withdraw
*/

async function deploy() {
    let receipt;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));

    //deploy faucet 
    console.log('deploy faucet');
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        bytecode: config.faucet_contract.bytecode,
    });


    let tx_hash = await faucet
        .constructor(
            gasTotalLimit,
            collateralTotalLimit,
            gasBound,
            storageBound,
            upperBound,
        )
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
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
    
    //deploy dapp
    console.log('deploy dapp'); 
    let dapp = cfx.Contract({
        abi: config.dapp_contract.abi,
        bytecode: config.dapp_contract.bytecode,
    })

    tx_hash = await dapp
        .constructor('0x0000000000000000000000000000000000000000')
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
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
        from: new_owner,
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

    /*
    let estimateData = await dapp.set(faucet_addr, 42).estimateGasAndCollateral();
    let gas = new BigNumber(estimateData.gasUsed)
        .multipliedBy(1.3)
        .integerValue()
        .toString();
    console.log('estimated dapp set upper_bound: ', gas);
    */
    
    //Dapp Dev apply to get 
    console.log('check if appliable');
    let isAppliable = await cfx.call({
        to: faucet_addr,
        data: faucet.isAppliable(dapp_addr).data,
    });
    console.log('isApplialbe cfx_call return: ', isAppliable);

    //let isAppliable = await faucet.isAppliable(dapp_addr).call();    
    console.log('call faucet contract to check appliable');
    tx_hash = await faucet.isAppliable(dapp_addr)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('check failed!');
    //console.log('receiptDetail: ' + receipt);
    nonce++;
    
    console.log('apply dapp to faucet');
    tx_hash = await faucet.applyGasAndCollateral(dapp_addr)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('apply failed!');
    nonce++;
    
    /*
    //dapp add user
    console.log('dapp add user');
    tx_hash = await dapp.add(testUser)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('dapp add user failed!');
    nonce++;
    */
    
    //dapp set
    let userNonce = Number(await cfx.getNextNonce(zero.address));
    console.log('zero nonce: ', userNonce);
    console.log('dapp set');
    try {
        tx_hash = await dapp.set(faucet_addr, 42)
            .sendTransaction({
                from: zero,
                nonce: userNonce,
            });
        console.log('dapp set hash: ', tx_hash);
        receipt = await waitForReceipt(tx_hash);
        if(receipt.outcomeStatus !== 0) throw new Error('dapp set failed!');
    } catch(e) {
        console.error(e);
    }
    //dapp get
    let record = Number(await dapp.record(faucet_addr).call());
    console.log('dapp record: ', record);

    //check sponsored balance
    let internalSponsor = cfx.Contract({
        abi: internalContract.abi,
        address: internal_contractAddr,
    });
    let current_sponsoredGasBalance = Number(await internalSponsor.getSponsoredBalanceForGas(dapp_addr).call());
    console.log('current_sponsoredGasBalance: ', current_sponsoredGasBalance);
}

async function pause(address) {
    let receipt;
    let tx_hash;
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });
    let isPaused = await faucet.paused().call();
    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    console.log('faucet is paused: ', isPaused);
    console.log('pauce faucet');
    tx_hash = await faucet.pause()
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: price,
        });
    console.log('pause txHash: ', tx_hash)
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('pause failed!');
    nonce++;
}

async function withdraw(address) {
    let receipt;
    let tx_hash;
    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    let balance = Number(await cfx.getBalance(address));
    console.log('faucet current balance: ', balance);
    
    let faucet = cfx.Contract({
        abi: config.faucet_contract.abi,
        address: address,
    });

    let contractOwner = await faucet.owner().call();
    console.log('contract owner is: ', contractOwner);
    
    let val = w3.utils.toHex(new BigNumber(balance));
    tx_hash = await faucet.withdraw(new_owner, val)
        .sendTransaction({
            from: new_owner,
            gas: 1000000,
            nonce: nonce,
            gasPrice: 1,
        });
    receipt = await waitForReceipt(tx_hash);
    console.log(receipt);
    if(receipt.outcomeStatus !== 0) throw new Error('withdraw failed!');
}

async function testCol() {
    let internalSponsor = cfx.Contract({
        abi: internalContract.abi,
        address: internal_contractAddr,
    });
    
    let testContract = cfx.Contract({
        abi: config.test_contract.abi,
        bytecode: config.test_contract.bytecode,
    });

    let nonce = Number(await cfx.getNextNonce(new_owner.address));
    let tx_hash = await testContract.constructor()
        .sendTransaction({
            from: new_owner,
            nonce: nonce,
        })
    let receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('testContract deploy failed!');
    let testContract_addr = receipt.contractCreated;
    console.log('testContract address: ', testContract_addr);
    testContract = cfx.Contract({
        abi: config.test_contract.abi,
        address: testContract_addr,
    });
    nonce++;

    let isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('before add privilege isAllWhitelisted value is: ', isAllWhitelisted);

    console.log('add privilege');
    tx_hash = await internalSponsor.addPrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: new_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: 1,
        });
    console.log('add privilege txhash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add privilege failed!');
    nonce++;
    console.log('privilege added');

    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
    
    tx_hash =  await internalSponsor.removePrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: new_owner,
            //gas: 1000000,
            nonce: nonce,
            //gasPrice: 1,
        });
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('rm privilege failed!');
    nonce++;
    console.log('privilege removed');

    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
    
    let userNonce = Number(await cfx.getNextNonce(wcfx.address));
    console.log('add privilege by non-admin');
    tx_hash = await internalSponsor.addPrivilegeByAdmin(testContract_addr, ['0x0000000000000000000000000000000000000000'])
        .sendTransaction({
            from: wcfx,
            //gas: 1000000,
            nonce: userNonce,
            //gasPrice: 1,
        });
    console.log('add privilege txhash: ', tx_hash);
    receipt = await waitForReceipt(tx_hash);
    if(receipt.outcomeStatus !== 0) throw new Error('add privilege failed!');
    console.log('privilege added by non-admin');
    
    isAllWhitelisted = await internalSponsor.isAllWhitelisted(testContract_addr).call();
    console.log('isAllWhitelisted value is: ', isAllWhitelisted);
}

async function testDapp(address) {
    let nonce = Number(await cfx.getNextNonce(wcfx.address));
    let balance = Number(await cfx.getBalance(wcfx.address));
    console.log('balance before call dapp:', balance/1e18);
    let tx_hash;
    let p = [];
    //for(let i = 0; i < 1; i++) {
        try {    
            tx_hash = await cfx.sendTransaction({
                from: wcfx,
                to: address,
                nonce: nonce,
                gas: 2e6,
                gasPrice: 1e9,
            });
            //p.push(waitForReceipt(tx_hash));
            nonce++;
            console.log('nonce: ', nonce);
            console.log('txhash: ', tx_hash);
            let receipt = await waitForReceipt(tx_hash);
            if(receipt.outcomeStatus !== 0) throw new Error('test dapp failed');
        } catch (e) {
            console.error(e);
        }
    //}
    let new_balance = Number(await cfx.getBalance(wcfx.address));
    console.log('charged cfx:', Number(balance/1e18 - new_balance/1e18));
    //await Promise.all(p);
}

program
  .option('-d, --deploy', 'deploy faucet contract')
  .option('-p, --faucet [type]', 'pause faucet')
  .option('-w, --address [type]', 'withdraw from faucet')
  .option('-t, --test', 'test whitelist')
  .option('-c, --dapp [type]', 'cost gas fee')
  .option('-n, --dappN', 'test dapp add')
  .parse(process.argv);

    
if(program.dappN) {
    deployTestDappN();
}

if(program.test) {
    //deployTest();
    testCol();
}

if(program.dapp) {
    testDapp(program.dapp);
}

if(program.deploy) {
    deploy();
}
if(program.faucet) {
    pause(program.faucet);
}
if(program.address) {
    console.log(program.address);
    withdraw(program.address);
}