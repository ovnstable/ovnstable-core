const { expect } = require('chai');

async function expectException (promise, expectedError) {
  try {
    await promise;
  } catch (error) {
    if (error.message.indexOf(expectedError) === -1) {
      const actualError = error.message.replace(/VM Exception while processing transaction: reverted with reason string?/, '').replace(/'/g,'').trim();
      expect(actualError.trim()).to.equal(expectedError.trim(), 'Wrong kind of exception received');
    }
    return;
  }

  expect.fail('Expected an exception but none was received');
}



module.exports = expectException;
