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
