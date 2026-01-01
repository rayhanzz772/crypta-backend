module.exports = function injectModels(models) {
  return function (req, res, next) {
    req.models = models
    next()
  }
}
