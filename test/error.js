var test = require('tape')
var _ = require('icebreaker')
require('../index.js')

test('_.peers.net should emit an error',function(t){
  _.peers.net({port:'./test2.socket'})
  .on('connection',function(connection){
    var self = this
    console.log('connection ',connection.address,':',connection.port)
    _(['test1','test1','test1','test1'],connection,_.onEnd(function(err){
      t.equal(err.code,'ECONNREFUSED')
      self.stop()
    }))
  })
  .on('started',function(){
    this.connect({address:'localhost',port:'9384'})
  })
  .on('stopped',function(){
    t.equal(this.port,'./test2.socket')
    t.equal(this.name,'net')
    t.equal(Object.keys(this.connections).length,0)
    t.end()
  })
  .start()
})
