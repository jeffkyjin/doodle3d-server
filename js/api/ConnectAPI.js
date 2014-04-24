/*
 * This file is part of the Doodle3D project (http://doodle3d.com).
 *
 * Copyright (c) 2013, Doodle3D
 * This software is licensed under the terms of the GNU GPL v2 or later.
 * See file LICENSE.txt or visit http://www.gnu.org/licenses/gpl.html for full license details.
 */
function ConnectAPI() {
	
	// callbacks
	this.refreshing; 		// I'm refreshing my list
	this.listUpdated; 	// the list of boxes is updated / changed
	this.boxAppeared; 	// a new box appeared
	this.boxDisapeared; // a box disappeared
	//this.boxUpdated; 		// a box is updated / changed
	
	var _apiURL = "http://connect.doodle3d.com/api";
	var _networkAPI = new NetworkAPI();
	var _timeoutTime = 3000;
	
	var _refreshDelay;
	var _refreshInterval = 3000;
	var _running;
	var _listChanged = false;
	
	var _wiredBox = {localip:"192.168.5.1",wifiboxid:"Wired WiFi-Box"};
	var _apBox = {localip:"192.168.10.1",wifiboxid:"WiFi-Box",link:"http://draw.doodle3d.com"};
	
	var _boxTimeoutTime 		= 500;
	var _numBoxesChecking 	= 0; // count how many boxes we are checking
	var _numBoxesFound 			= 0; // count how many boxes responded
	var _boxes 							= {}; // current list of boxes
	var _numBoxes 					= 0; // current number of boxes
	
	var _self = this;
	
	this.list = function(completeHandler,failedHandler) {
		//console.log("ConnectAPI:list");
		$.ajax({
			url: _apiURL + "/list.php",
			type: "GET",
			dataType: 'json',
			timeout: _timeoutTime,
			success: function(response){
				//console.log("ConnectAPI:list response: ",response);
				if(response.status == "error" || response.status == "fail") {
					//console.log("ConnectAPI:list failed: ",response);
					if(failedHandler) failedHandler(response);
				} else {
					completeHandler(response.data);
				}
			}
		}).fail(function() {
			//console.log("ConnectAPI:list failed");
			if(failedHandler) failedHandler();
		});
	};
	
	this.start = function(interval,listUpdated) {
		if(interval) {
			_refreshInterval = interval;
		}
		if(listUpdated) {
			_self.listUpdated = listUpdated;
		}
		_running = true;
		_self.refresh();
	}
	this.stop = function() {
		_running = false;
		clearTimeout(_refreshDelay);
	}
	this.refresh = function(listUpdated) {
		if(listUpdated) {
			_self.listUpdated = listUpdated;
		}
		if(_self.refreshing) {
			_self.refreshing();
		}
		
		_self.list(function(foundBoxes) {
			//console.log("  foundBoxes: ",foundBoxes);
			foundBoxes.push(_wiredBox); // always check for a wired box
			updateList(foundBoxes);
			if(_running) {
				clearTimeout(_refreshDelay);
				_refreshDelay = setTimeout(_self.refresh, _refreshInterval);
			}
			//removeBox(_apBox.localip,true); // TODO: why again?
		}, function() {
			// if web is not accessible try to find a box as an accesspoint
			// if not found, we look for a wired box
			_networkAPI.alive(_apBox.localip,_boxTimeoutTime,function() {
				updateList([_apBox]);
			}, function() {
				updateList([_wiredBox]);
			});			
			if(_running) {
				clearTimeout(_refreshDelay);
				_refreshDelay = setTimeout(_self.refresh, _refreshInterval);
			}
		});
	}
	
	function updateList(foundBoxes) {
		//console.log("updateList");
		_numBoxesChecking = 0;
		_numBoxesFound = 0;
		_listChanged = false;
		
	  // remove stored, but not found boxes
		jQuery.each(_boxes, function (index,box) {
			var found = false;
			jQuery.each(foundBoxes, function (index,foundBox) {
				if(foundBox.localip == box.localip && 
						foundBox.wifiboxid == box.wifiboxid) found = true;
			});
			if(!found) removeBox(box.localip);
		})
		
		// check if all found boxes are alive
		jQuery.each(foundBoxes, function (index,foundBox) {
			checkBox(foundBox);
		});
		
		if(foundBoxes.length == 0 && _self.listUpdated) {
			_self.listUpdated(_boxes); 
		}
	}
	function checkBox(boxData) {
		//console.log("  checkBox: ",boxData.localip);
		_numBoxesChecking++;
		
		_networkAPI.alive(boxData.localip,_boxTimeoutTime,function() {
			addBox(boxData);
			_numBoxesFound++;
		}, function() {
			removeBox(boxData.localip);
		},function(){
			_numBoxesChecking--;
			if(_numBoxesChecking <= 0 && _listChanged && _self.listUpdated) {
				_self.listUpdated(_boxes);
			}
		});
	}
	function getBox(localip) {
		return _boxes[localip];
	}
	function addBox(box) {
		if(getBox(box.localip) !== undefined) return;
		_boxes[box.localip] = box;
		_numBoxes++;
		if(_self.boxAppeared) _self.boxAppeared(box);
		_listChanged = true;
	}
	function removeBox(localip) {
		var box = getBox(localip);
		if(box === undefined) return;
		delete _boxes[localip];
		_numBoxes--;
		if(_self.boxDisapeared) _self.boxDisapeared(box);
		_listChanged = true;
	}
}