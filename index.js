

/**
 * Expose `plugin`.
 */
module.exports = plugin

function plugin (opts) {
  opts = opts || {}

  return function (files, metalsmith, done) {
    setImmediate(done)

    Object.keys(files).forEach(function (file) {
      
        files[file].commit = ''
      
    })
  }
}
