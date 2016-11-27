var _ = require('underscore')
var async = require('async')
var extname = require('path').extname
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var request = require('request')

var localDirectory = '.metalsmith-github-meta'
mkdirp(localDirectory, (err, made) => {
  if (err) {
    throw err
  }
})

/**
 * Expose `plugin`.
 */
module.exports = plugin

function plugin (opts) {
  opts = opts || {}

  setCacheData({})

  return function (files, metalsmith, done) {
    var queue = []
    var remainingCalls = 60

    var mdFiles = _.pick(files, function(file, filename) {
      return (path.extname(filename) === '.md')
    })

    async.forEachOfLimit(mdFiles, 8, (file, filename, finished) => {

      // TODO:
      // Request author organisation data and cache in .github-meta
      // Add array of org names to github.author

      var stats = file.stats
      var dateModified = new Date(stats.mtime)

      var data = getLastRunData(filename)
      var lastRunDate = new Date(data.lastRun)

      if (dateModified > lastRunDate && remainingCalls > 0) {
        console.log('Retrieving github-meta from GitHub for ' + filename)

        var options = {
          url: `https://api.github.com/repos/${opts.repo}/commits?path=${opts.source}/${filename}`,
          headers: {
            'User-Agent': 'DADI Docs BuildAgent'
          }
        }

        request(options, (error, response, body) => {
          if (error) {
            console.log(error)
          }

          if (!error && response.statusCode === 200) {
            // check headers for remaining calls
            remainingCalls = parseInt(response.headers['x-ratelimit-remaining'])

            console.log('GitHub API calls remaining: ' + remainingCalls)

            var commits = JSON.parse(body)
            var lastCommit = commits[0]

            files[filename].githubMeta = lastCommit

            setLastRunData(filename, lastCommit)//.then(() => {
            finished()
          } else {
            remainingCalls = 0
            finished()
          }
        })
      } else {
        // already been run and cached
        console.log('Retrieving github-meta from cache for ' + filename)
        files[filename].githubMeta = data.githubMeta
        finished()
      }
    }, function () {
      done()
      return
    })
  }
}

function getCacheData() {
  var filename = path.join(localDirectory, 'data.json')
  var content = {}

  try {
    content = fs.readFileSync(filename).toString()

    if (content !== '') {
      content = JSON.parse(content)
    } else {

    }
  } catch (e) {

  } finally {
    return content
  }
}

function setCacheData(data) {
  var filename = path.join(localDirectory, 'data.json')

  try {
    var stats = fs.statSync(filename)

    if (!_.isEmpty(data)) {
      fs.writeFileSync(filename, JSON.stringify(data, null, 2))
    }
  } catch (e) {
    fs.writeFileSync(filename, JSON.stringify({}, null, 2))
  } finally {

  }
}

function getLastRunData(path) {
  var data = getCacheData()

  if (!data[path]) {
    return {
      lastRun: new Date(1970, 1, 1)
    }
  }

  return data[path]
}

function setLastRunData(path, metadata) {
  var data = getCacheData()

  data[path] = {
    lastRun: new Date(),
    githubMeta: metadata
  }

  setCacheData(data)
}
