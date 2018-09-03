/*global history */
sap.ui.define([
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/routing/History",
		"sap/m/MessageToast",
		"ztrend/controller/Constant"
	], function (Controller, History, MessageToast, Constant) {
		//"use strict";

		return Controller.extend("ztrend.controller.BaseController", {
			
			getRouter : function () {
				return this.getOwnerComponent().getRouter();
			},

			getModel : function (sName) {
				return this.getView().getModel(sName);
			},
			
			setModel : function (oModel, sName) {
				return this.getView().setModel(oModel, sName);
			},

			getResourceBundle : function () {
				return this.getOwnerComponent().getModel("i18n").getResourceBundle();
			},

			onNavBack : function() {
				var sPreviousHash = History.getInstance().getPreviousHash();

				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.getRouter().navTo("view2", {}, true);
				}
			},
			
			onInfoPress : function(oEvent){
				var oItem = oEvent.getParameter("item");
				var key = oItem.getKey();
				var dataSel = this.getOwnerComponent()._oDataSelector;
				var model = this.getOwnerComponent().postingModel;
				
				if ( key == "1"){
					//open the user guide fragment
					if (!this._oUserGuideDialog) {
						this._oUserGuideDialog = sap.ui.xmlfragment("ztrend.fragment.userguide", this);
						this.getView().addDependent(this._oUserGuideDialog);
					}
					this._oUserGuideDialog.open();
				}else if( key == "3" ){
					dataSel.latestPostingDate(model);
					MessageToast.show("Date Refreshed.");
				}
			},
			
			onHomePress : function(oEvent){
				this.getRouter().navTo("view1", null, true);
			},
			
			onUserGuideClosePress : function(){
				//var component = this.getOwnerComponent();
				this._oUserGuideDialog.close();
			},
			
			generateColNames : function(obj){
				var colnames = [];
				var keys = Object.keys(obj);
				var index = keys.indexOf("__metadata");
				if(index != -1){
					keys.splice(index, 1);
				}
				$.each(keys, function(index, key){
					if(key == "NoOfCancels"){
						//skip this
					}else{
						colnames.push(Constant.columnMap[key]);
					}
					
				})
				return colnames;
			},
			
			generateColNames2 : function(obj){
				var colnames = [];
				var keys = Object.keys(obj);
				var index = keys.indexOf("__metadata");
				if(index != -1){
					keys.splice(index, 1);
				}
				$.each(keys, function(index, key){
					if(key == "NoOfCancels"){
						//skip this
					}else{
						colnames.push(Constant.columnMap2[key]);
					}
					
				})
				return colnames;
			},
			
			onDownloadExcel : function(colnames, dataArr){
				 var CSV = '';   
		    	  
		    	  var keys = Object.keys(dataArr[0]);
		    	  var index = keys.indexOf("__metadata");
		    	  keys.splice(index, 1);
		    	  
		    	  $.each(colnames, function(index, col){
		    		  CSV = CSV + col + ",";
		    	  });
		    	  CSV = CSV + "\r\n";
		    	  
		    	  $.each(dataArr, function(index, obj){
		    		  $.each(keys, function(i, key){
		    			  if(key == "NoOfCancels"){
		    				  //skip this
		    			  }else{
		    				  CSV = CSV + '"' + obj[key] + '",';
		    			  }
		    		  });
		    		  CSV = CSV + "\r\n";
		    	  });
		    	  
		    	  if (CSV == '') {        
		    		  MessageToast.show("No Data Found");
		    		  return;
		    	  }
		    	  
		    	  //Donwload Code begins here
		    	  var fileName = "Download";
		    	  //If Browser is IE
		    	  if (navigator.appName == 'Microsoft Internet Explorer' ||  !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv:11/)) || (typeof $.browser !== "undefined" && $.browser.msie == 1))
		    	  {
		    	      fileName = fileName + ".csv";
		    	      var mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8";
		    	      //var mimetype = "application/vnd.ms-excel;charset=charset=utf-8";
		    	      var blob = new Blob([CSV], { type: mimetype });
		    	      saveAs(blob, fileName);
		    	  
		    	  }else{
		    		  
			    	  var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);
			    	  var link = document.createElement("a");    
			    	  link.href = uri;
			    	  link.style = "visibility:hidden";
			    	  link.download = fileName + ".csv";
			    	  document.body.appendChild(link);
			    	  link.click();
			    	  document.body.removeChild(link);
		    	  }
		    	  
		    	  
		    	  
			}

		});

	}
);