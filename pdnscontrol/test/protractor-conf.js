exports.config = {
  allScriptsTimeout: 11000,

  specs: [
    'e2e/*.js'
  ],

  capabilities: {
    'browserName': 'chrome'
  },

  chromeOnly: true,

  baseUrl: 'http://localhost:5000/',

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 30000
  },

  onPrepare: function() {
    // login before doing anything else
    browser.driver.get(browser.baseUrl + 'tpl/me/detail.html');
    browser.driver.findElement(by.id('email')).sendKeys('admin@example.org');
    browser.driver.findElement(by.id('password')).sendKeys('changeme');
    browser.driver.findElement(by.css('button[type=submit]')).click();
    browser.driver.wait(function() {
      return browser.driver.getCurrentUrl().then(function(url) {
        return !(/auth/.test(url));
      });
    });
  }
};
