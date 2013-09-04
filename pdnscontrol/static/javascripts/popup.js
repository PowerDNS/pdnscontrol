/*
 * Note: function added by scopeBinder should use 'this' to get the current scope.
 */
function showPopup($scope, $compile, template, scopeBinder) {
  var popupTemplate = document.createElement("ng-include");
  popupTemplate.setAttribute("class", "reveal-modal fixedWidth1000");
  popupTemplate.setAttribute("src", "'" + templateUrl(template) + "'");
  var popupScope = $scope.$new();
  scopeBinder(popupScope);
  var popupLinker = $compile(popupTemplate);
  var popupElement = popupLinker(popupScope);
  popupScope.$on("finished", function() {
    $(popupElement).trigger('reveal:close');
    popupScope.$destroy();
    popupElement.remove();
  });
  popupScope.close = function() {
    popupScope.$emit("finished");
  };
  document.body.appendChild(popupElement[0]);
  $(popupElement).reveal();
}
