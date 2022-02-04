const { expect } = require('chai');

function greatLess(balance, value) {
  expect(balance).to.greaterThanOrEqual(value-1);
  expect(balance).to.lessThanOrEqual(value+1);
}



module.exports = {
  greatLess: greatLess,
}
