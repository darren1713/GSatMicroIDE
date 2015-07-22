/**
 Copyright 2015 Juergen Marsch (juergenmarsch@googlemail.com)
 Based on ESPRUINO WebIDE from  Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 ------------------------------------------------------------------
  "Send to Espruino" implementation
 ------------------------------------------------------------------
**/
"use strict";
(function(){

  function init() {
    // Add stuff we need
    LUA.Core.App.addIcon({
	      id: "save",
	      icon: "save",
	      title : "Save File",
	      order: 200,
	      area: {
	        name: "code",
	        position: "top"
	      },
	      click: function() {
			  try {
				if(LUA.Core.Serial.isConnected()) {
					// use raw code for file saving, don't LUAfy it
					var before = LUA.Core.Code.getCurrentCode();
					console.log(before);

				  	var cmd = 'f=assert(io.open("/wo/script.lua", "w"))' + "\n";
				  	var lines = before.split("\n");
				  	for(var i = 0; i < lines.length; i++) {
						cmd += 'f:write(\'' + lines[i] + '\\n\')' + "\n"; // todo: escape lua?
					}
					cmd += "f:close()\n"
					console.log(cmd);
				  	LUA.Core.Serial.write(cmd);
				} else {
					LUA.Core.Notifications.warning("Not connected to GSatMicro");
				}
		  	} catch(err) {
			  LUA.Core.Notifications.warning(err.message);
		  	}
		}
    });

    LUA.Core.App.addIcon({
		      id: "read",
		      icon: "refresh",
		      title : "Read File",
		      order: 201,
		      area: {
		        name: "code",
		        position: "top"
		      },
		      click: function() {
				  try {
					if(LUA.Core.Serial.isConnected()) {
						// capture output as file....
						addProcessorGetWatched(waitingGetWatched, 5000);
						var cmd = 'f = io.open("/wo/script.lua")' + "\n";
						cmd += "print('<<<<<')\n";
						cmd += "while true do\n";
						cmd += "local line = f:read(\"*l\")\n";
						cmd += "if line == nil then break end\n";
						cmd += "print(line)\n";
						cmd += "end\n";
						cmd += "print('>>>>>')\n";
						console.log(cmd);

						//addProcessorGetWatched(waitingGetWatched,5000);
						  //function waitingGetWatched(data){
						  //var html;
						  //removeProcessorGetWatched();
						  //html = LUA.Core.Utils.escapeHTML(data);
						  //}
						  /*
						  function addProcessorGetWatched(waitingFunc,maxDuration){
						      LUA.removeProcessorsByType("getWatched");
						      LUA.addProcessor("getWatched",{processor:function (data, callback) {
						        waitingFunc(data);
						        callback(data);
						      },module:"send",maxDuration:maxDuration});
  							}
						  */
						//LUA.Core.Serial.startListening(LUA.Core.Terminal.outputDataHandler);
						//LUA.Core.Terminal.setEcho(false);

						LUA.Core.Serial.write(cmd);


					} else {
						LUA.Core.Notifications.warning("Not connected to GSatMicro");
					}
			  	} catch(err) {
				  LUA.Core.Notifications.warning(err.message);
			  	}
			}
    });


    /*LUA.Core.App.addIcon({
      id: "deploy",
      icon: "deploy",
      title : "Send to ESP8266",
      order: 400,
      area: {
        name: "code",
        position: "top"
      },
      click: function() {
        if(LUA.Core.Serial.isConnected()){
          LUA.Core.Code.getLUACode(function(code){
            LUA.callProcessor("sending");
            LUA.Core.Serial.write(code + "\n");
          });
        }
        else{ LUA.Core.Notifications.warning("Not connected to GSatMicro"); }
      }
    });
    LUA.Core.App.addIcon({
      id: "sendModules",
      icon: "cloud",
      title: "Send modules to ESP8266",
      order: 500,
      area: { name:"code", position:"top"},
      click: function(){
        var code,modules=[],search,result;
        if(LUA.Core.Serial.isConnected()){
          code = LUA.Core.EditorLUA.getCode(true);
          search = /--requires(.*)\n/gi;
          while(result = search.exec(code)){modules.push(JSON.parse(result[1]));}
          if(modules.length > 0){refreshAllModules(modules,function(b){
            if(b){LUA.Core.Notifications.info("File refresh finished");}
            else{LUA.Core.Notifications.error("Error in Upload");}
          });}
          else{ LUA.Core.Notifications.info("No modules defined for upload");}
        }
        else{ LUA.Core.Notifications.warning("Not connected to board"); }
      }
    });*/

    LUA.addProcessor("connected",{processor: function(data, callback) {
      $(".send").button( "option", "disabled", false);
      callback(data);
    },module:"send"});
    LUA.addProcessor("disconnected",{processor: function(data, callback) {
      $(".send").button( "option", "disabled", true);
      callback(data);
    },module:"send"});
  }

  function waitingGetWatched(data){
  		var html;
  		removeProcessorGetWatched();
  		html = LUA.Core.Utils.escapeHTML(data);
  		console.log('Received data we were waiting for: ' + html);
  }

  function addProcessorGetWatched(waitingFunc, maxDuration){
	  LUA.removeProcessorsByType("getWatched");
	  console.log('adding output watcher');
	  LUA.addProcessor("getWatched",{processor:function (data, callback) {
		waitingFunc(data);
		callback(data);
	  }, module:"send", maxDuration: maxDuration} );
  }

  function getMacro(macroGroup,macro,callback){
    $.get("data/lua/macro/" + macroGroup + ".json",function(data){
      var m = JSON.parse(data);
      callback(m[macro]);
    });
  }
  function convertLUA(data,params){
    var r,i,j,k,re,re2,lines = [];
    for(i = 0; i < data.length;i++){
      if(params){
        for(j in params){
          if(j === "filedata"){
            re = new RegExp("\"","g");
            re2 = new RegExp("\\\\","g");
            lines = params[j].split("\n");
            for(k = 0; k < lines.length; k++){
              lines[k] = lines[k].replace(re2,"\\\\");
              lines[k] = 'file.writeline("' + lines[k].replace(re,"\\\"") + '")';
            }
          }
          else{
            re = new RegExp(j,"g");
            data[i] = data[i].replace(re,params[j]);
          }
        }
      }
    }
    return data.join(" ").replace(/filedata/,lines.join("\n"));
  }

  function setSerial(baudRate,echo,callback){
    getMacro("serial","setBaud",function(macro){
      var r,options = {};
      options.baudRate = baudRate;
      options.echo = (echo)?1:0;
      r = convertLUA(macro,options);
      LUA.Core.Serial.write(r + "\n",function(){
        LUA.Core.Notifications.info("Set Baudrate/echo to " + options.baudRate + "/" + options.echo);
        if(callback) callback();
      });
    });
  }
  function getInfo(callback){
    getMacro("serial","getInfo",function(macro){
      var r = convertLUA(macro);
      LUA.Core.Serial.write(r + "\n",function(){if(callback){callback();}});
    });
  }

  function refreshAllModules(modules,callback){
    var i,j,ext,html;
    html = '<Table><tr><th>Uploading</th><th>Read GitHub</th><th>refreshed</th></tr>'
    for(i = 0; i < modules.length; i++){
      html += '<tr><th>' + modules[i].id + '</th>';
      html += '<th><input type="checkbox" id="refresh_gotModule' + i + '"></th>';
      html += '<th><input type="checkbox" id="refresh_sentModule' + i + '"></th></tr>';
    }
    html += "</table>";
    LUA.Core.App.openPopup({position: "relative",title: "Refresh Modules",id: "refreshModulesTab",contents: html});
    i = 0; j = 0;
    uploadModule(modules[i]);
    function uploadModule(module){
      if(module.git){
        var git = module.git;
        ext = git.path.substr(git.path.lastIndexOf("."));
        LUA.Plugins.GetGitHub.getGitHubFile(git.owner,git.repo,git.path,git.branch,sendModule);
      }
      else if(module.project){
        var p = module.project;
        ext = p.path.substr(p.path.lastIndexOf("."));
        LUA.Plugins.Project.loadFile(p.path,sendModule);
      }
      function sendModule(data){
        if(data){
          $("#refresh_gotModule" + i)[0].checked = true;
          saveFile(module.id + ext,data,function(){
            $("#refresh_sentModule" + i)[0].checked = true;
            i++; j++; nextModule();
          });
        }
        else{i++; nextModule();}
      }
      function nextModule(){
        if(i < modules.length){ uploadModule(modules[i]);}
        else{
          if(i === j){LUA.Core.App.closePopup(); callback(true);}
          else{callback(false);}
        }
      }
    }
  }

  function getFiles(callback) {
    getMacro("file","getFiles",function(macro){
      var r = convertLUA(macro);
      LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
    });
  }
  function saveFile(fileName,data,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","saveFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName,"filedata":data});
        LUA.Core.Serial.writeByLine(r + "\n",">",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function readFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","readFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(bs){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function dropFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","dropFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function doFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","doFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }
  function compileFile(fileName,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("file","compileFile",function(macro){
        var r = convertLUA(macro,{"filename":fileName});
        LUA.Core.Serial.write(r + "\n",function(){if(callback)callback();});
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }

  function getPolling(funcName,data,callback){
    if(LUA.Core.Serial.isConnected()){
      getMacro("serial","polling",function(macro){
        var r = convertLUA(macro,{"funcName":funcName,"varData":data});
        LUA.Core.Serial.write(r + "\n",function(bs){if(callback)callback(); });
      });
    }
    else{ LUA.Core.Notifications.warning("Not connected to board"); }
  }

  LUA.Core.Send = {
    init : init,
    setSerial : setSerial,
    getInfo : getInfo,
    getFiles : getFiles,
    saveFile : saveFile,
    readFile : readFile,
    dropFile : dropFile,
    doFile : doFile,
    compileFile : compileFile,
    getPolling : getPolling
  };
}());
