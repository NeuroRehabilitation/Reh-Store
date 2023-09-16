ssh2 = require('ssh2')
ssh2_stream = require('ssh2-streams')
SFTP=ssh2_stream.SFTPStream

Readable = require('stream').Readable
Writable = require('stream').Writable
Transform = require('stream').Transform

{EventEmitter}=require "events"

fs=require 'fs' # TEMPORARY - FIXME - related to private key stuff

constants = require('constants')

class Responder extends EventEmitter
  @Statuses =
    "denied": "PERMISSION_DENIED" 
    "nofile": "NO_SUCH_FILE"
    "end": "EOF"
    "ok": "OK"
    "fail": "FAILURE"
    "bad_message": "BAD_MESSAGE"
    "unsupported": "OP_UNSUPPORTED"
    
  constructor: (@req) ->
    for methodname, symbol of @constructor.Statuses
      do (symbol) =>
        #console.warn "Setting method: #{methodname} to ssh2.SFTP_STATUS_CODE['#{symbol}']"
        @[methodname]= =>
          @done=true
          console.warn "Going to invoke #{symbol} on behalf of req: #{@req}. value: #{ssh2.SFTP_STATUS_CODE[symbol]}"
          @sftpStream.status @req,ssh2.SFTP_STATUS_CODE[symbol]
          
class DirectoryEmitter extends Responder
  constructor: (@sftpStream,@req=null) ->
    @stopped=false
    @done=false
    super(@req)
    
  request_directory: (req)->
    @req=req
    console.warn "Directory entry requested! #{req}"
    if !@done
      @emit "dir"
    else
      @end()
    
  file: (name) ->
    console.warn "Returning a file: #{name} for req: #{@req}"
    @stopped=@sftpStream.name @req, {filename: name.toString(), longname: name.toString(), attrs: {}}
    if !@stopped && !@done
      @emit "dir"    

class ContextWrapper
  constructor: (@ctx,@server) ->
    @method=@ctx.method
    @username=@ctx.username
    @password=@ctx.password
    # probably need others here for, like, private key things and stuff
  
  reject: ->
    @ctx.reject()
  
  accept: (callback = ->) ->
    console.warn "Accepting callback!!!!!"
    @ctx.accept()
    @server._session_start_callback=callback

module.exports=class SFTPServer extends EventEmitter
  constructor: ->
    @server=new ssh2.Server {privateKey: fs.readFileSync('ssh_host_rsa_key')}, (client,info) => #, debug: (stuff) -> console.warn "DEBUG!!!!: #{stuff}"
      client.on 'authentication', (ctx) =>
        console.warn "Authentication!"
        @auth_wrapper=new ContextWrapper(ctx,@)
        @emit "connect", @auth_wrapper
      client.on 'end', =>
        console.warn "Disconnection!"
        @emit "end"
            
      client.on 'ready', (channel) =>
        client._sshstream.debug=(msg) -> "CLIENT ssh stream debug: #{msg}"
        console.warn "Uhm, I guess we authenticated OK?"
        client.on 'session', (accept,reject) =>
          session=accept()
          session.on 'sftp', (accept,reject) =>
            console.log('Client SFTP session?!?!!?!?!?')
            sftpStream = accept()
            session=new SFTPSession(sftpStream)
            @_session_start_callback(session)
    
  listen: (port) ->
    @server.listen(port)
    
class Statter
  constructor: (@sftpStream, @reqid) ->
    
  is_file: ->
    @type = constants.S_IFREG
    
  is_directory: ->
    @type = constants.S_IFDIR
    
  file: (attrs={}) ->
    @sftpStream.attrs @reqid,@_get_statblock()
    
  nofile: ->
    @sftpStream.status @reqid,ssh2.SFTP_STATUS_CODE.NO_SUCH_FILE # this is starting to look familiar....
    
  _get_mode: ->
    @type | @permissions
    
  _get_statblock: ->
    {
      mode: @_get_mode()
      uid: @uid
      gid: @gid
      size: @size
      atime: @atime
      mtime: @mtime
    }
    
class SFTPFileStream extends Readable
  _read: (size) ->
    
  
class SFTPSession extends EventEmitter
  
  @Events = ["REALPATH","STAT","LSTAT","OPsteaIR","CLOSE","REMOVE","READDIR","OPEN","READ","WRITE"]
  
  constructor: (@sftpStream) ->
    @max_filehandle=0
    @handles={}
    for event in @constructor.Events
      do (event) =>
        console.warn "Now looking at event: #{event}"
        #console.warn "Constructor is: #{@constructor}"
        @sftpStream.on event, (args...) =>
          console.warn "UNIVERSAL EVENT DETECTED: #{event} - reqid: #{args[0]}"
          #console.dir(args)
          #console.warn "Constructor for 'this' is: #{@constructor}"
          # @[event].apply(@,args...)
          @[event](args...)
    
  # emitOrDefault: (event,default,args...)
      
  fetchhandle: ->
    prevhandle=@max_filehandle
    @max_filehandle++
    return new Buffer(prevhandle.toString())
  
  REALPATH: (reqid,path) ->
    console.warn "REALPATH METHOD CALLED via reqid: #{reqid} for path: #{path}"
    # if there is no event-emitter for 'realpath', then do a default implementation?
    if EventEmitter.listenerCount(@,"realpath") # weird ndoe version issue here?
      callback=(name) =>
        @sftpStream.name(reqid, {filename: name, longname: "-rwxrwxrwx 1 foo foo 3 Dec 8 2009 #{name}", attrs: {}}) # {filename: name, longname: name} # . christ.
      @emit "realpath", path,callback
    else
      @sftpStream.name(reqid, {filename: path, longname: path, attrs: {}})
              
  do_stat: (reqid,path,kind) ->
    if EventEmitter.listenerCount(@,"stat")
      @emit "stat",path,kind,new Statter(@sftpStream,reqid)
    else
      # By defaut, all files exist. This is not good.
      console.warn "WARNING: No stat function for #{kind}, all files exist!"
      @sftpStream.attrs reqid,{filename: path, longname: path, attrs: {}}

  STAT: (reqid,path) -> @do_stat(reqid,path,'STAT')
    
  LSTAT: (reqid,path) -> @do_stat(reqid,path,'LSTAT')

  #FSTAT too?
    
  OPENDIR: (reqid,path) ->
    diremit=new DirectoryEmitter(@sftpStream,reqid)
    diremit.on "newListener", (event,listener) =>
      console.warn "New Listener detected!!!!! FREAK OUT!!!! #{event}"
      return unless event is "dir"
      handle=@fetchhandle()
      @handles[handle]={mode: "OPENDIR",path: path,loc: 0,responder: diremit} # 0 is count or something?
      @sftpStream.handle reqid,handle

    #delay emitting handle until the DirectoryEmitter has registered an 'on' for 'dir' events?
    @emit "readdir",path,diremit
    
  READDIR: (reqid,handle) ->
    # now the *request* thing needs to emit "dir!" or something
    if @handles[handle]?.mode isnt "OPENDIR"
      console.warn "handle: #{handle} is not an open directory!"
      return @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.NO_SUCH_FILE
    # console.warn "Entire handle thing is: "
    @handles[handle].responder.request_directory(reqid)

  OPEN: (reqid,pathname,flags,attrs) ->
    # see if it's a READ, WRITE, or APPEND, or WHAT
    stringflags=SFTP.flagsToString(flags)
    switch stringflags
      when "r"        
        ts = new Transform()
        ts._transform = (data,encoding,callback) ->
          @push(data)
          callback()
        ts._flush = (cb) ->
          ts.eof=true
          cb()

        handle=@fetchhandle()
        @handles[handle]={mode: "READ",path: pathname,stream: ts} # stream: ws ???
        @emit "readfile",pathname, ts #ws #streamreader
        @sftpStream.handle reqid,handle
      when "w"
        # I have no idea what I'm doing
        rs = new Readable()
        started=false
        rs._read = (bytes) =>
          # only once the stream is *piped* somewhere do we want to permit the write(?)
          return if started
          handle=@fetchhandle()
          console.warn "INTERNAL _read METHOD INVOKED, DELAYED HANDLE IS BEING RETURNED: #{handle}"
          @handles[handle]={mode: "WRITE",path: pathname,stream: rs}
          @sftpStream.handle reqid,handle
          started=true
        
        @emit "writefile",pathname,rs
      else
        @emit "error", new Error("Unknown open flags: #{stringflags}")
    
  READ: (reqid,handle,offset,length) ->
    # return buffer.slice? for offset and lenght?
    console.warn "READ REQUEST FIRED - all we're doing is...asking for reqid: #{reqid}, offset: #{offset}, length: #{length}"
    #console.dir @handles[handle].stream
    # this is the read-backed writer, which was a disastrous failure

    chunk = @handles[handle].stream.read()
    if chunk
      console.warn "INSTA-CHUNK AVAIL!!!!"
      if chunk?.length > length
        console.warn "CHUNK IS TOOOOOOOOOOO BIIIIIIGGGGGGGG - you should split, return one, and 'unshift' the other?"
        badchunk=chunk.slice(length)
        goodchunk=chunk.slice(0,length)
        chunk=goodchunk
        @handles[handle].stream.unshift(badchunk)
      return @sftpStream.data reqid, chunk
    else # e.g. no chunk
      if @handles[handle].stream.eof
        return @sftpStream.status reqid, ssh2.SFTP_STATUS_CODE.EOF
      @handles[handle].stream.once "readable", =>
        console.warn "READABLE FIRED?!"
        chunk = @handles[handle].stream.read()
        if chunk?.length > length
          console.warn "CHUNK IS TOOOOOOOOOOO BIIIIIIGGGGGGGG - you should split, return one, and 'unshift' the other?"
          badchunk=chunk.slice(length)
          goodchunk=chunk.slice(0,length)
          chunk=goodchunk
          @handles[handle].stream.unshift(badchunk)
        console.warn "Read request gave us #{chunk?.length} bytes!"
        if chunk
          @sftpStream.data reqid, chunk
          @handles[handle].stream.read(0)
        else # @handles[handle].stream.rs.read(0)  ????
          if @handles[handle].stream.finished
            @sftpStream.status reqid, ssh2.SFTP_STATUS_CODE.EOF
          else
            console.warn "RETURNING EMPTY STREAM!"
            # @handles[handle].stream.rs.read(0)
            @sftpStream.data reqid, new Buffer("")
            @handles[handle].stream.read(0)
    
  WRITE: (reqid,handle,offset,data) ->
    # TODO add error checking, etc!
    console.warn "WRITE DETECTED: handle: #{handle}, offset: #{offset}, datalength: #{data.length}"
    @handles[handle].stream.push(data)
    @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
    # @handles[handle].stream.write data, =>
    #   @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
    
  CLOSE: (reqid,handle) ->
    return @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
    if @handles[handle]
      return switch @handles[handle].mode
        when "OPENDIR"
          # Don't do anything interesting, just delete it.
          # well, first send an 'end' to the responder thingee?
          console.warn "Closing directory for handle: #{handle}"
          @handles[handle].responder.emit "end" #????
          delete @handles[handle]
          @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
        when "READ"
          # @handles[handle].responder.emit "end"
          # this doesn't mean anything. no 'responder' here.
          delete @handles[handle]
          @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
        when "WRITE"
          console.warn "CLOSE-WRITE"
          @handles[handle].stream.push(null) # indicating 'end-of-stream'
          #@handles[handle].stream.end()
          delete @handles[handle]
          @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.OK
        else
          console.warn "Handle: #{handle} has data:"
          console.dir(@handles[handle])
          @sftpStream.status reqid,ssh2.SFTP_STATUS_CODE.FAILURE
    # look at the list of file handles, which one is it?
    
  REMOVE: (reqid,handle) ->      
    @emit "delete", new Responder(reqid)
    
