const { assert } = require("chai");
const { default: Web3 } = require("web3");

require('chai').use(require('chai-as-promised')).should()

const Marketplace = artifacts.require('./Marketplace.sol')

contract('Marketplace', ([deployer, seller, buyer]) => {
    let marketplace

    beforeEach(async ()=>{
        marketplace = await Marketplace.deployed();
    })

    describe('deployment', async ()=>{
         it('deploys succesfully', async () => {
             const address = await marketplace.address
             assert.notEqual(address, 0x0)
             assert.notEqual(address, '')
             assert.notEqual(address, null)
             assert.notEqual(address, undefined)
         })

         it('has a name', async ()=>{
             const name = await marketplace.name()
             assert.equal(name, 'Dapp University Marketplace')
         })
    })

    describe('products', async ()=>{ 
        let result, productCount;
        
        beforeEach(async ()=>{
            result = await marketplace.createProduct('iPhone X', web3.utils.toWei('1', 'Ether'), { from: seller })
            productCount = await marketplace.productCount()
        })

         it('creates products', async ()=>{
             assert.equal(productCount, 1)
             const event = result.logs[0].args
             assert.equal(event.id.toNumber(), productCount.toNumber(), 'Id is correct');
             assert.equal(event.name, 'iPhone X', 'Name is correct')
             assert.equal(event.price, web3.utils.toWei('1', 'Ether'), 'Price is correct')
             assert.equal(event.owner, seller, 'owner is correct')
             assert.equal(event.purchased, false, 'Purcahed is correct')

             //Failure: Product must have a name
             await marketplace.createProduct('', web3.utils.toWei('1', 'Ether'), { from: seller }).should.be.rejected
             //Failure: Product must have a name
             await marketplace.createProduct('iPhone X', 0, { from: seller }).should.be.rejected
         })

         it('lists products', async ()=>{
             const product = await marketplace.products(productCount)
             assert.equal(product.id.toNumber(), productCount.toNumber(), 'Id is correct');
             assert.equal(product.name, 'iPhone X', 'Name is correct')
             assert.equal(product.price, web3.utils.toWei('1', 'Ether'), 'Price is correct')
             assert.equal(product.owner, seller, 'owner is correct')
             assert.equal(product.purchased, false, 'Purcahed is correct')
         })

         it('sells products', async ()=>{
            //Track the seller balance before purchase
            let oldSellerBalance;
            oldSellerBalance = await web3.eth.getBalance(seller)
            oldSellerBalance = new web3.utils.BN(oldSellerBalance)
            //Success: Buyer makes purchase
            result = await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') })

            // Check logs
            const event = result.logs[0].args
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'Id is correct');
            assert.equal(event.name, 'iPhone X', 'Name is correct')
            assert.equal(event.price, web3.utils.toWei('1', 'Ether'), 'Price is correct')
            assert.equal(event.owner, buyer, 'owner is correct')
            assert.equal(event.purchased, true, 'Purcahed is correct')

            //Seller received funds
            let newSellerBalance;
            newSellerBalance = await web3.eth.getBalance(seller)
            newSellerBalance = new web3.utils.BN(newSellerBalance)

            let price
            price = web3.utils.toWei('1', 'Ether')
            price = new web3.utils.BN(price)

            const expectedBalance = oldSellerBalance.add(price)

            assert.equal(newSellerBalance.toString(), expectedBalance.toString())

            //Failure: Tries to buy a product that does not exists, i.e., product must have valid id
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected
            //Failure: Tries to buy a without enough Ether
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('0.5', 'Ether') }).should.be.rejected
            //Failure: Deployer tries to buy the product, Product can't be purchased twice
            await marketplace.purchaseProduct(productCount, { from: deployer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected
            //Failure: Tries to buy the product again, buuyer cant be the seller
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected
         })
    })
})