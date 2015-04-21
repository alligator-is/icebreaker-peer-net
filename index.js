var net = require('net')
var fs = require('fs')
var _ = require('icebreaker')

if (!_.peer) require('icebreaker-peer')

function isString(obj){
  return typeof obj === 'string'
}

function isSame(err,code){
  return err.code === code
}

function isPath(p) {
  return isString(p) && isNaN(p)
}

function  connection(original) {
  if (original.setKeepAlive) original.setKeepAlive(true)
  if (original.setNoDelay) original.setNoDelay(true)

  var connection = _.pair(original)
  if (original.remoteAddress) connection.address = original.remoteAddress
  if (original.remotePort) connection.port = original.remotePort
  this.connection(connection)
}

if (!_.peers) _.mixin({
  peers: {}
})

_.mixin({
  net: _.peer({
    name: 'net',
    auto: true,
    start: function () {
      var server = this.server = net.createServer(connection.bind(this))
      var self = this
      this.server.on('error', function (err) {
        if (isPath(self.port) && isSame(err,'EADDRINUSE')) {
          var socket = net.Socket()

          socket.on('error', function (err) {
            if (isSame(err,'ECONNREFUSED')) {
              fs.unlink(self.port, function (err) {
                if (err)
                  _(
                    'cannot remove unix socket ' + self.port,
                    _.log(process.exit.bind(null, 1), 'emerg')
                  )
                listen()
              })
            }
          })

          socket.connect(self.port, function () {
            _(
              'peer ' + self.name + ' port ' + self.port +
              ' is already in use by another process.',
              _.log(process.exit.bind(null, 1), 'emerg')
            )
          })

          return
        }

        _(
        ['cannot start peer' + self.name + ' on port ' + self.port, err],
          _.log(process.exit.bind(null, 1), 'emerg')
        )
      })

      var listen = function (onListening) {
        self.server.listen(
          self.port, isPath(self.port) ? null :
          self.address, onListening
        )
      }

      listen(function () {
        if (isPath(self.port)) fs.chmod(self.port, 0777)
        self.emit('started')
      })
    },

    connect: function (params) {
      var self = this

      if (!params.address) params.address = self.address

      var c = net.createConnection(isPath(params.port) ?
        params.port : {
          port: params.port,
          host: params.address
        }
      )

      connection.call(self, c)
    },

    stop: function stop() {
      var self = this

      try {
        self.server.close(function close() {
          if (Object.keys(self.connections).length > 0) {
            process.nextTick(function () {
              close.call(self)
            })
            return
          }
          else self.emit('stopped')
        })
      }
      catch (e) {
        _([e], _.log(function () {
          self.emit('stopped')
        }), 'error')
      }
    }
  })
  },
  _.peers)
