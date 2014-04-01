'use strict';

describe('my app', function() {
  browser.get('');

  it('should automatically redirect to /view1 when location hash/fragment is empty', function() {
    expect(browser.getLocationAbsUrl()).toMatch("/");
  });


  describe('view1', function() {

    beforeEach(function() {
      browser.get('/servers/new');
    });


    it('should render add server when user navigates to /servers/new', function() {
      var header = element(by.css('[ng-view] h1:not(.ng-hide)'));
      expect(header.getText()).toMatch(/Add Server/);
    });

  });
});
