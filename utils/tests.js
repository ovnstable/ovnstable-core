const { expect } = require('chai');

function greatLess(balance, value, delta) {
  expect(balance).to.greaterThanOrEqual(value - delta);
  expect(balance).to.lessThanOrEqual(value + delta);
}

module.exports = {
  greatLess: greatLess,
}
