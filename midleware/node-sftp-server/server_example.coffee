
fs=require 'fs'

SFTPServer=require "./wrapper"


srv=new SFTPServer()

srv.listen(8022)

srv.on "connect", (auth) ->
  console.warn "authentication attempted"
  if auth.method isnt 'password' || auth.username isnt "brady" || auth.password isnt "test"
    return auth.reject() # forcing a short-circuit here is weird, but you could just as easily do if/else
  console.warn "We haven't *outhright* accepted yet..."

  username=auth.username
  password=auth.password
  other_session_stuff="whatever"
  auth.accept (session) -> #begin_session (auth.username,auth.password,session)
    console.warn "Okay, we've accepted, allegedly?"
    session.on "readdir", (path,responder) ->
      # do all prepration work to read a directory
      console.warn "Readdir request for path: #{path}"
      dirs=[1...10000]
      i=0
      responder.on "dir", () ->
        if dirs[i]
          console.warn "Returning directory: #{dirs[i]}"
          responder.file(dirs[i])
          i++
        else
          responder.end() # should be 'end'?
      responder.on "end", ->
        console.warn "Now I would normally do, like, cleanup stuff, for this directory listing"
        
    session.on "readfile", (path,writestream) ->
      # something=fs.createReadStream "/tmp/grumple.txt"
      # something.pipe(writestream)
      fs.createReadStream("/tmp/grumple.txt").pipe(writestream)
      #writestream.end("THE END OF THIS")
      #req(something) # no?
      
    session.on "writefile", (path,readstream) ->
      something=fs.createWriteStream "/tmp/garbage"
      readstream.pipe(something)
  
# Don't know where this goes?
srv.on "end", () ->
  console.warn "Example says user disconnected"
  #sometihng
  
#srv.on "session", (authblob,session) ->
  # console.warn "Hey, session started! You're logged in as BLAH..."
# begin_session = (username,password,session) ->
