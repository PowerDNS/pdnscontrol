//// Views

App.ModalView = Em.View.extend({
  tagName: 'div',
  classNames: ['fixedWidth1000', 'reveal-modal'],
  layoutName: 'views/modal',

  success: 'OK',
  title: null,
  closeCallback: null,
  openCallback: null,
  successCallback: null,

  _internalOpenCallback: function() {
    if (this.openCallback)
      return this.openCallback();
  },

  _internalCloseCallback: function() {
    this.remove();
    if (this.closeCallback)
      return this.closeCallback();
  },

  didInsertElement: function() {
    var that = this;
    this.$().reveal({
      open: function() { that._internalOpenCallback() },
      close: function() { that._internalCloseCallback() }
    });
  },

  close: function() {
    this.$().trigger('reveal:close');
  },

  click: function(e) {
    var target = $(e.target);
    if (target.hasClass('success')) {
      if (this.successCallback && this.successCallback()) {
        this.close();
      }
    } else if (target.hasClass('cancel')) {
      this.close();
    }
  },

  spin: function() {
    this.$('.spinner').html('').spin('small');
  },

  stopSpin: function() {
    this.$('.spinner').html('');
  }

});


// App.TabsView and App.TabView provide support for foundation tabs.
App.TabsView = Em.View.extend({
  tagName: 'dl',
  classNames: 'tabs',
});
App.TabView = Em.View.extend({
  tagName: 'dd',
  route: null,

  init: function() {
    var that = this;
    this.get('container').lookup('controller:application').
      addObserver('currentPath', function() {
        that.currentPathChanged();
      });
    this._super();
  },

  didInsertElement: function() {
    // Initial update of classes.
    this.currentPathChanged();
  },

  currentPathChanged: function(x) {
    var container = this.
      get('container');
    if (container === undefined) {
      return;
    }
    var currentPath = container.
      lookup('controller:application').
      get('currentPath');

    // Unfortunately classNameBindings don't work here, not really sure
    // why. What usually happens is that the <a> tag gets the class bound
    // on changes, instead of the <dd>.
    if (currentPath == this.get('route')) {
      this.$().addClass('active');
    } else {
      this.$().removeClass('active');
    }
  },

});
