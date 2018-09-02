/* ===== SHA256 with Crypto-js ===============================
|  Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

// Add data to levelDB with key/value pair
function addLevelDBData(key,value) {
  db.put(key, value, function(err) {
    if (err) return console.log('Block ' + key + ' submission failed', err);
  });
}

// Get data from levelDB with key
function getLevelDBData(key) {
    return new Promise((resolve, reject) => {
    let block;
    db.get(key, function(err, value) {
      if (err) { reject('error ', err); }
      block = JSON.parse(value);
      resolve(block);
    });
  }).catch(error => { console.log(error); });
}

// Add data to levelDB with value
function addDataToLevelDB(value) {
  let i = 0;
  db.createReadStream().on('data', function(data) {
        i++;
      }).on('error', function(err) {
          return console.log('Unable to read data stream!', err);
      }).on('close', function() {
        console.log('Block #' + i);
        addLevelDBData(i, value);
      });
}

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = "";
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor(){
    this.chain = [];
    this.addBlock(new Block('Genesis Block'));
    this.height = 0;
  }

  // Add new block
  addBlock(newBlock){
    newBlock.height = this.chain.length; // Block height
    newBlock.time = new Date().getTime().toString().slice(0,-3); // UTC timestamp
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString(); // Block hash with SHA256 using newBlock and converting to a string

    // previous block hash
    if(this.chain.length > 0) {
      newBlock.previousBlockHash = this.chain[this.chain.length-1].hash;
    }

    // Adding block object to chain
  	this.chain.push(newBlock);

    // Store in LevelDB
    addLevelDBData(newBlock.height, JSON.stringify(newBlock));
    addLevelDBData('height', newBlock.height);
  }

  //Get current block height from LevelDB
  getBlockHeight() {
    return new Promise((resolve, reject) => {
      getLevelDBData('height')
      .then(result => {
        resolve(result);
      });
    }).catch(error => console.log('Get block height error: ', error));
  }

  //Get block by height from LevelDB
  getBlock(blockHeight) {
    return new Promise((resolve, reject) => {
      getLevelDBData(blockHeight) //Return object as a single string
      .then(result => {
        resolve(result);
      });
    }).catch(error => console.log('Get Block error :', error));
  }

  //Validate Block
  validateBlock(blockHeight) {
    return new Promise((resolve, reject) => {
      this.getBlock(blockHeight)
      .then(block => { //get block object
        let blockHash = block.hash;  //get block hash
        block.hash = '';  //remove block hash to test block integrity
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        if (blockHash === validBlockHash) { //generate block hash
          console.log('Block validated');
          resolve(true);
        } else {
          console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
          reject(error);
        }
      });
    }).catch(error => console.log('Validate Block error: ', error));
  }

  async validateChain() {
    let errorLog =[];
    let height = await this.getBlockHeight();

    for (let i = 0; i < height; i++) {
      let currentBlock = await this.getBlock(i);

      if (!(await this.validateBlock(i))) errorLog.push(i);

      let blockHash = currentBlock.hash;
      let previousHash = (await this.getBlock(i+1)).previousBlockHash;

      if (blockHash !== previousHash) {
        errorLog.push(i);
      }
    }
    if (errorLog.length > 0) {
      console.log('Errors at blocks: '+ errorLog);
    } else {
      console.log('No errors detected');
    }
  }

}

let b = new Blockchain();
b.addBlock(new Block('second block'));
b.validateChain();

