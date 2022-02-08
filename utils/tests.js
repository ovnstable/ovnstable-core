const { expect } = require('chai');

function greatLess(balance, value, delta, msg) {
  expect(balance).to.greaterThanOrEqual(value - delta, msg);
  expect(balance).to.lessThanOrEqual(value + delta, msg);
}

module.exports = {
  greatLess: greatLess,
}
