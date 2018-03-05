var isArray = require('util').isArray
var Promise = require('bluebird')
var minimatch = require('minimatch')
var streamToArray = require('stream-to-array')
var streamToArrayAsync = Promise.promisify(streamToArray)
var getNewPath = require('./new_path')
var sharp = require('sharp')

function generateResponsiveImages() {
  var hexo = this
  var config = hexo.config
  var rules = config.responsive_images || []
  if (!isArray(rules)) {
    rules = [rules]
  }

  var route = hexo.route
  var routes = route.list()

  return Promise.mapSeries(routes, function (filePath) {
    var sizes = getSizesFor(filePath, rules)

    if (sizes.length == 0) {
      return
    }

    var stream = route.get(filePath)
    return streamToArrayAsync(stream).then(function (arr) {
      if(typeof arr[0] === 'string'){
        return arr[0];
      } else{
        return Buffer.concat(arr);
      }
    }).then(function (buffer) {
      return Promise.all(sizes.map(function (sizeSets) {
        return Promise.all(Object.keys(sizeSets).map(function (name) {
          var newPath = getNewPath(filePath, {prefix: name})
          return route.set(newPath, resizeImageFn(buffer, sizeSets[name]))
        }))
      }))
    })
  })
}

function getSizesFor(filePath, rules) {
  return rules.reduce(function (sizes, rule) {
    var pattern = rule.pattern || ''

    if (minimatch(filePath, pattern)) {
      return sizes.concat(rule.sizes || [])
    }
    return sizes
  }, [])
}

function resizeImageFn(buffer, size) {
  return function () {
    return sharp(buffer).resize(size.width, size.height, size.options).toBuffer()
  }
}

module.exports = generateResponsiveImages