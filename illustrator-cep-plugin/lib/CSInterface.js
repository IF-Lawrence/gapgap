(function () {
  function CSInterface() {}

  CSInterface.prototype.evalScript = function (script, callback) {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.evalScript === "function") {
      window.__adobe_cep__.evalScript(script, callback || function () {});
      return;
    }

    if (typeof callback === "function") {
      callback("__gapgap_error__ CEP runtime is not available.");
    }
  };

  CSInterface.prototype.closeExtension = function () {
    if (window.__adobe_cep__ && typeof window.__adobe_cep__.closeExtension === "function") {
      window.__adobe_cep__.closeExtension();
    }
  };

  window.CSInterface = CSInterface;
})();
