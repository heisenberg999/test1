sap.ui.define([
		"ztrend/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"ztrend/util/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/Sorter",
		"sap/viz/ui5/controls/common/feeds/FeedItem",
	    "sap/viz/ui5/data/FlattenedDataset",
	    "ztrend/controller/Constant",
	], function (BaseController, JSONModel, Formatter, Filter, Sorter, FeedItem, FlattenedDataset, Constant) {
		"use strict";

		return BaseController.extend("ztrend.controller.view1", {
			
			formatter : Formatter,
			
			onInit : function () {
				//Set Heirarchy Model
				this.modelH = new JSONModel();
				this.getView().setModel(this.modelH,"mh");
				
				//Year Model
				this.modelYear = new JSONModel();
				this.getView().setModel(this.modelYear,"myear");
				
				//Set Graph Model
				this.modelG = new JSONModel();
				this.getView().setModel(this.modelG,"mg");
				
				//Set Risk-Table Model
				this.modelTable = new JSONModel();
				this.getView().setModel(this.modelTable,"tableModel");
				this.modelTable.setSizeLimit(10000);
				
				this.getRouter().getRoute("view1").attachPatternMatched(this._onRouteMatched, this);
				this.getRouter().attachBypassed(this.onBypassed, this);
			},
			
			_onRouteMatched :  function(oEvent) {
				this.getOwnerComponent().def1.done(jQuery.proxy(this.initialSettings,this));
			},
			
			initialSettings : function(){
				var that = this;
				this.riskTableData = this.getOwnerComponent().masterData;
				this.anaData = this.getOwnerComponent().anaData;
				this.ulSelect = this.byId("idUL");
				this.orgSelect = this.byId("idOrg");
				this.plSelect = this.byId("idPlatform");
				
				this.monthMap = { 1 : "Jan", 2 : "Feb", 3 : "March", 4 : "April", 5 : "May", 6 : "June", 7 : "July",
						8 : "Aug", 9 : "Sept", 10 : "Oct", 11 : "Nov", 12 : "Dec"
				};
				this.monthMapRev = {"Jan" : 1, "Feb" : 2, "March" : 3, "April" : 4 , "May" : 5, "June" : 6, "July" : 7,
						"Aug" : 8, "Sept" : 9, "Oct" : 10, "Nov" : 11, "Dec" : 12
				};
				this.kpiKeyMap = { "ARR" : "Average Risk Rating", "AVC" : "Added vs Closed Risks", 
						"RBD" : "Risks by Domain", "OR" : "Overdue Risks", "RBC" : "Risks by Criticality" };
				
				this.selectedLevel = "UL";
				this.selectedUL = "";
				this.selectedORG = "";
				this.selectedPL = "";
				this.currentKPI = "ARR";
				this.selectedVizType = "";
				
				var actionButton = [{
                    type: 'action',
                    text: 'View Risks',
                    press: jQuery.proxy(this.onViewRiskPress, this),
                }];
				var oVizFrameArr = ["idVizFrameARR", "idVizFrameAVC", "idVizFrameRBD", "idVizFrameOR", "idVizFrameRBC", "idVizFrameRBS"];
				var oPopOverArr = ["idPopOverARR", "idPopOverAVC", "idPopOverRBD", "idPopOverOR", "idPopOverRBC", "idPopOverRBS"];
				var keyArr = ["ARR", "AVC", "RBD", "OR", "RBC", "RBS"];
				//Connect popovers to vizframes
				$.each(keyArr, function(i, key){
					var oVizFrame = that.byId("idVizFrame" + key); 
					var oPopOver = that.byId("idPopOver" + key);
					oPopOver.connect(oVizFrame.getVizUid());
					if(key !== "ARR"){
						oPopOver.setActionItems(actionButton);
					}
					oPopOver.setCustomDataControl(jQuery.proxy(that.popoverDataControl,that));
					oPopOver.addStyleClass("sapUiSizeCompact");
				});
				
				this._setYear();
				this._setMasterData();
				this.modifyData();
				//$.when(this.yearDef, this.hDef).done(jQuery.proxy(this.modifyData,this));
			},
			
			_setMasterData : function(){
				this.hDef = $.Deferred();
				var dataArr = this.getOwnerComponent().hArr;
				var newDataArr = [];
				this.domainDespMap = {};
				var that = this;
				//Eliminate the Domains
				$.each(dataArr, function(i, obj){
					if(obj.Id.indexOf("D") == -1){
						newDataArr.push(obj);
					}else{
						that.domainDespMap[obj.Id] = obj.Descrption;
					}
				});
				this.modelH.setData(getHeirarchy(newDataArr));
				this.selectedUL = this.modelH.getObject("/0")["Id"];
				this.hDef.resolve();
				
				function getHeirarchy(array){
				    var map = {}
				    for(var i = 0; i < array.length; i++){
				        var obj = array[i];
				        if(!(obj.Id in map)){
				            map[obj.Id] = obj;
				            map[obj.Id].children = [];
				        }       
				        if(typeof map[obj.Id].Id == 'undefined'){
				            map[obj.Id].Id = obj.Id;
				            map[obj.Id].Parentid = obj.Parentid;
				            map[obj.Id].Descrption = obj.Descrption;
				        }
				        var parent = obj.Parentid;
				        if(obj.Parentid === "" || obj.Parentid === "NULL"){
				        	parent = "ROOT";
				        }
				        if(!(parent in map)){
				            map[parent] = {};
				            map[parent].children = [];
				        }
				        map[parent].children.push(map[obj.Id]);
				    }
				    //console.log(JSON.stringify(map["ROOT"].children,2,2));
				    //Insert All for Platform Select Box
				    for(var key in map){
				    	if(key.indexOf("ORG") !== -1){
				    		map[key].children.unshift({ Id : "ALL", Descrption : "All", Parentid : key });
				    	}
				    }
				    return map["ROOT"].children;
				}
				
			},
			
			_setYear : function(){
				this.yearDef = $.Deferred();
				var yearArr = this.getOwnerComponent().yearArr;
				yearArr.sort().reverse();
				this.selectedYear = yearArr[0];
				var dataYear = _.map(yearArr,function(year){ return { year : year }});
				this.modelYear.setData(dataYear);
				this.yearDef.resolve();
			},
			
			modifyData : function(){
				var dataArr = this.anaData;
				var that = this;
				var colArr = ["D001","D002","D003","D004","D005","D006","D007","D008","D009","OVR_RSK","RSKCRT","RSKSTS"];
				$.each(dataArr, function(i, obj){
					obj["ID"] = obj["RiskIdKey"]; delete obj["RiskIdKey"];
					obj["Month"] = parseInt(obj["MonthKey"]); delete obj["MonthKey"];
					obj["Year"] = parseInt(obj["YearKey"]); delete obj["YearKey"];
					obj["ARR"] = parseInt(obj["Arr"]); delete obj["Arr"];
					obj["OVR_RSK"] = obj["OvrRsk"]; delete obj["OvrRsk"];
					obj["RSKCRT"] = obj["Rskcrt"];	delete obj["Rskcrt"];
					obj["RSKSTS"] = obj["Rsksts"];	delete obj["Rsksts"];
					obj["Desc"] = obj["Descrption"]; delete obj["Descrption"];
					obj["Added"] = parseInt(obj["Added"]);
					obj["Closed"] = parseInt(obj["Closed"]);
					
					obj.monthName = that.monthMap[obj.Month];
					$.each(colArr, function(i2, col){
						var arr = cal(obj[col]);
						if(col === "RSKSTS"){
							//Closed Prog Open Delay
							obj[col + "_c"] = parseInt(arr[0]) || 0;
							obj[col + "_p"] = parseInt(arr[1]) || 0;
							obj[col + "_o"] = parseInt(arr[2]) || 0;
							obj[col + "_d"] = parseInt(arr[3]) || 0;
							obj[col] = obj[col + "_c"] + obj[col + "_p"] + obj[col + "_o"] + obj[col + "_d"];
						}else{
							obj[col + "_vh"] = parseInt(arr[0]) || 0;
							obj[col + "_h"] = parseInt(arr[1]) || 0;
							obj[col + "_m"] = parseInt(arr[2]) || 0;
							obj[col + "_l"] = parseInt(arr[3]) || 0;
							obj[col] = obj[col + "_vh"] + obj[col + "_h"] + obj[col + "_m"] + obj[col + "_l"];
						}
						
					})
				});
				
				this.graphData = dataArr;
				this.createGraphData();
				//console.log(dataArr);
				function cal(val){
					var arr;
					if(!val){
						arr = [0,0,0,0];
					}else{
						arr = val.split(";");
					}
					return arr;
				}
			},
			
			onRadioPress : function(evt){
				if(!evt.getParameter("selected")){
					return;
				}
				var level = evt.getSource().getCustomData()[0].getValue();
				this.selectedLevel = level;
				if(level === "UL"){
					this.orgSelect.setEnabled(false);
					this.plSelect.setEnabled(false);
					this.ulSelect.setEnabled(true);
				}else{
					this.orgSelect.setEnabled(true);
					this.plSelect.setEnabled(true);
					this.ulSelect.setEnabled(false);
					
					if(!this.selectedORG){
						this.selectedORG = this.orgSelect.getSelectedKey();
					}
					if(!this.selectedPL){
						this.selectedPL = this.plSelect.getSelectedKey();
					}
				}
				
				this.createGraphData();
			},
			
			onYearSelect : function(evt){
				var year = evt.getSource().getSelectedKey();
				this.selectedYear = year;
				this.createGraphData();
			},
			
			onULSelect : function(evt){
				debugger;
				var modelName = "mh";
				var path = this.ulSelect.getSelectedItem().getBindingContext("mh").getPath();
				path = modelName + ">" + path + "/children";
				var template = new sap.ui.core.Item({
					text : "{mh>Descrption}",
					key : "{mh>Id}"
				});
				this.orgSelect.removeAggregation("items");
				this.orgSelect.bindAggregation("items",{
					path : path,
					template : template
				});
				
				path = path + "/0/children";
				this.plSelect.removeAggregation("items");
				this.plSelect.bindAggregation("items",{
					path : path,
					template : template
				});
				
				var key = evt.getSource().getSelectedKey();
				this.selectedUL  = key;
				
				this.createGraphData();
			},
			
			onOrganisationSelect : function(evt){
				debugger;
				var modelName = "mh";
				var path = this.orgSelect.getSelectedItem().getBindingContext("mh").getPath();
				path = modelName + ">" + path + "/children";
				var template = new sap.ui.core.Item({
					text : "{mh>Descrption}",
					key : "{mh>Id}"
				});
				this.plSelect.removeAggregation("items");
				this.plSelect.bindAggregation("items",{
					path : path,
					template : template
				});
				
				var key = evt.getSource().getSelectedKey();
				this.selectedORG = key;
				this.selectedPL = "ALL";
				
				this.createGraphData();
			},
				
			onPlatformSelect : function(evt){
				debugger;
				var key = evt.getSource().getSelectedKey();
				this.selectedPL = key;
				
				this.createGraphData();
			},
			
			
			createGraphData : function(){
				var that = this;
				var filteredData = [];
				if(this.selectedLevel === "UL"){
					filteredData = _.filter(this.graphData, function(obj){ 
						return (obj.ID === that.selectedUL && obj.Year == that.selectedYear); 
					});
				}else{
					//case 1: if Platform is All then select the parent ORG
					if(this.selectedPL === "ALL"){
						filteredData = _.filter(this.graphData, function(obj){ 
							return (obj.ID === that.selectedORG && obj.Year == that.selectedYear); 
						});
					}else{
						filteredData = _.filter(this.graphData, function(obj){ 
							return (obj.ID === that.selectedPL && obj.Year == that.selectedYear); 
						});
					}
					
				}
				
				this.modelG.setData(filteredData);
				this.initializeVizFrame();
			},
			
			initializeVizFrame : function(vizType){
				
				//var oVizFrame = this.byId("idVizFrame");
				var that = this;		
				var oVizFrameArr = ["idVizFrameARR", "idVizFrameAVC", "idVizFrameRBD", "idVizFrameOR", "idVizFrameRBC", "idVizFrameRBS"];
				
				$.each(oVizFrameArr, function(index, vizId){
					var oVizFrame = that.byId(vizId);
					oVizFrame.removeAllFeeds();
					//oVizFrame.setVizProperties({});
					
					
					that.setDataset(oVizFrame);
					
					
					var vizType = "";
					var kpiType = vizId.slice(10);
					
					switch(kpiType){
					
					case "ARR" : 
						vizType = "line";
						oVizFrame.setVizProperties({ plotArea: { 
							colorPalette : ["#e75480"]
						} });
						break;
					case "AVC" : 
						vizType = "dual_column";
						oVizFrame.setVizProperties({ plotArea: { 
							primaryValuesColorPalette : ["#2f4f4f"],
		                    secondaryValuesColorPalette : ["#f3d4a0"] 
						} });
						break;
					case "RBD" : 
						vizType = "stacked_column";
						oVizFrame.setVizProperties({ plotArea: { 
							colorPalette : ["rgb(0,102,204)","rgb(218,227,243)","rgb(35,157,142)","rgb(248,203,173)",
								"rgb(153,102,0)","rgb(153,153,255)","rgb(123,93,163)","rgb(226,249,7)","rgb(0, 204, 102)"]
						} });
						break;
					case "OR" : 
						vizType = "column";
						oVizFrame.setVizProperties({ plotArea: { 
							colorPalette : ["#53c0f0"]
						} });
						break;
					case "RBC" : 
						vizType = "stacked_column";
						oVizFrame.setVizProperties({ plotArea: { 
							colorPalette : ["#8dd789","#ffff66","#ffc000","#e44a4a"]
						} });
						break;
					case "RBS" : 
						vizType = "stacked_column";
						oVizFrame.setVizProperties({ plotArea: { 
							colorPalette : ["#8dd789","#ffff66","#ffc000","#e44a4a"]
						} });
						break;
					};
					
					/*if(kpiType === "RBD" ){//|| vizType === "OR" TODO
						that.currentKPI = kpiType;
						that.setVizFrameProperties2(oVizFrame);
					}
					
					if(kpiType === "RBC" || kpiType === "RBS"){
						oVizFrame.setVizProperties({
							plotArea: {
			               	 	colorPalette : ["#2CA02C","#FFFF00","#FFBF00","#D62728"]
			                },
						});
					}*/
					that.setVizFrameProperties(oVizFrame);
					that.setFeedAxis(oVizFrame, kpiType);
					oVizFrame.setVizType(vizType);
				});				
			},
			
			setDataset : function(oVizFrame){
				var bindingPath = "mg>/";
				var measures = [{
                    name: 'Average Risk Rating',
                    value: '{mg>ARR}'
                }, {
                    name: 'Added Risks',
                    value: '{mg>Added}'
                }, {
                    name: 'Closed Risks',
                    value: '{mg>Closed}'
                },
                /*{
                    name: this.domainDespMap["D001"],
                    value: '{mg>D001}'
                },*/
                {
                    name: 'Overdue Risks',
                    value: '{mg>OVR_RSK}'
                },{
                    name: 'Risks By Criticality',
                    value: '{mg>RSKCRT}'
                },{
                    name: 'Very High Risks',
                    value: '{mg>RSKCRT_vh}'
                },{
                    name: 'High Risks',
                    value: '{mg>RSKCRT_h}'
                },{
                    name: 'Medium Risks',
                    value: '{mg>RSKCRT_m}'
                },{
                    name: 'Low Risks',
                    value: '{mg>RSKCRT_l}'
                },{
                    name: 'Risks By Status',
                    value: '{mg>RSKSTS}'
                },{
                    name: 'Closed',
                    value: '{mg>RSKSTS_c}'
                },{
                    name: 'In Progress',
                    value: '{mg>RSKSTS_p}'
                },{
                    name: 'Open',
                    value: '{mg>RSKSTS_o}'
                },{
                    name: 'Delayed',
                    value: '{mg>RSKSTS_d}'
                }];
				
				var domainKeys = Object.keys(this.domainDespMap);
				for(var i=0;i<domainKeys.length;i++){
					measures.push({
						name : this.domainDespMap[domainKeys[i]],
						value : "{mg>" + domainKeys[i] + "}"
					})
				}
				var oDataset = new FlattenedDataset({
	                dimensions: [
	                {
	                	name: "Month",
	                    value: "{mg>monthName}"
	                }
	                ],
	                measures: measures,
	                data: {
	                    path: bindingPath
	                }
	            });
				
				oVizFrame.setDataset(oDataset);
			},
			
			setFeedAxis: function(oVizFrame, kpiType){

				var feedCategoryAxis = new FeedItem({
	                'uid': "categoryAxis",
	                'type': "Dimension",
	                'values': ["Month"]
	            });
				oVizFrame.addFeed(feedCategoryAxis);

				var feedValueAxis, feedValueAxis2;
				
				switch(kpiType){
				
				case "ARR" : 
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': ["Average Risk Rating"]
					});
					break;
				case "AVC" : 
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': ["Added Risks"]
					});
					feedValueAxis2 = new FeedItem({
						'uid': "valueAxis2",
						'type': "Measure",
						'values': ["Closed Risks"]
					});
					break;
				case "RBD" : 
					var domainArr = [];
					for(var domain in this.domainDespMap){
						domainArr.push(this.domainDespMap[domain]);
					}
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': domainArr
					});
					break;
				case "OR" : 
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': ["Overdue Risks"]
					});
					break;
				case "RBC" : 
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': ["Low Risks","Medium Risks","High Risks","Very High Risks"]
					});
					break;
				case "RBS" : 
					feedValueAxis = new FeedItem({
						'uid': "valueAxis",
						'type': "Measure",
						'values': ["Closed","In Progress","Open","Delayed"]
					});
					break;
				}

				oVizFrame.addFeed(feedValueAxis);
				if(feedValueAxis2){
					oVizFrame.addFeed(feedValueAxis2);
				}
			},
			
			setVizFrameProperties: function(oVizFrame){
	        	var that = this;
				oVizFrame.setVizProperties({
	                general: {
	                    layout: {
	                        padding: 0.04
	                    }
	                },
	                valueAxis: {
	                	visible : false,
	                    label: {
	                    	//formatString: Chart.FIORI_LABEL_SHORTFORMAT_10
	                    },
	                	title: {
	                        visible: false
	                    }
	                },
	                valueAxis2: {
	                	visible : false,
	                    label: {
	                    	//formatString: Chart.FIORI_LABEL_SHORTFORMAT_10
	                    },
	                	title: {
	                        visible: false
	                    }
	                },
	                categoryAxis: {
	                	visible : true,
	                	title: {
	                        visible: false
	                    }
	                    /*label : {
	                    	rotation : "fixed",
	                    	truncatedLabelRatio : 1
	                    }*/
	                },
	                plotArea: {
	                	dataLabel: {
	                		visible: true,
	                        position: 'outside'
	                        //formatString: Chart.TEST_LABEL_SHORTFORMAT_2
	                       // renderer : Globals.labelRenderer.bind(that)
	                    },
	                    gap : {
	                    	//barSpacing : 0.5 
	                    	//groupSpacing : 0.1  
	                    	//innerGroupSpacing : 0.1  
	                    },
	                    //drawingEffect: sap.viz.ui5.types.Bar_drawingEffect.glossy,
	               	 	//colorPalette : d3.scale.category10().range()
	                    
	                    //colorPalette : ["#EAE98F", "#F9BE92", "#EC9A99", "#BC98BD", "#1EB7B2", "#73C03C", "#F48323", "#EB271B", "#D9B5CA", "#AED1DA"]
	                    
	                },
	                legend: {
	                    title: {
	                        visible: false
	                    },
	                    showFullLabel: false
	                },
	                legendGroup : { 
	                	layout : {
	                		position : "top"
	                	},
	                	//respectPlotPosition : false
	                },
	                title: {
	                    visible: false
	                },
	                interaction: { 
	                	selectability : { 
	                		mode : 'EXCLUSIVE',
	                		axisLabelSelection : false,
	                		legendSelection : false
	                	}
	                	
	                	//behaviorType: null
	                },
	                tooltip:{
	                    visible: true,
	                    bodyDimensionLabel: { color: "green"},
	                    bodyDimensionValue: { color: "blue" },
	                    bodyMeasureLabel: { color: "green"},
	                    bodyMeasureValue: { color: "blue" }
	                }
	            });
			},
			
			dataSelect : function(evt){
				debugger;
				var kpikey = evt.getSource().getCustomData()[1].getValue();
				this.selectedVizType = kpikey;
				var data = evt.getParameter("data")[0].data;
				this.selectedVizData = data;
				//this.filterRiskTableData();
			},
			
			setPopContent : function(kpikey, oPopOver){
				
			},
			
			onViewRiskPress : function(evt){
				var that = this;
				if (!this.oRiskTableDialog) {
    				this.oRiskTableDialog = sap.ui.xmlfragment("ztrend.fragment.riskTableDialog", this);
    				this.getView().addDependent(this.oRiskTableDialog);
    			}
				
				//Filtering to be done here
				//this.modelTable.setData(this.riskTableData);
				var length = this.filterRiskTableData();
				var risktable = sap.ui.getCore().byId("idRiskTable");  
				setTimeout(function(){ 
					that.oRiskTableDialog.open();
					if(length <= 17){
						risktable.setVisibleRowCount(length);
					}else{
						risktable.setVisibleRowCount(17);
					}
					risktable.rerender();
				}, 500);
				
			},
			
			filterRiskTableData : function(){
				debugger;
				var filter1Arr = [], filter2Arr = [], filter3Arr = [], filterObj = {},
					data = this.selectedVizData;
				
				/*******************************************************************/
				//Collect the latest Unique Risks till the end of selected month.  
				//If level is UL
				var startdate = new Date(this.selectedYear, (this.monthMapRev[data.Month]-1));
				var enddate   = new Date(this.selectedYear, this.monthMapRev[data.Month]);
				if(this.byId("idRB1").getSelected()){
					filter1Arr = _.filter(this.riskTableData, function(obj){
						if(obj.Timestamp < enddate){
							return obj;
						}
					});
				}else{
					//If level is ORG
					if(this.plSelect.getSelectedItem().getText() === "All"){
						var org = convertcase(this.orgSelect.getSelectedItem().getText());
						filter1Arr = _.filter(this.riskTableData, function(obj){
							if(convertcase(obj.OrgName) === org && obj.Timestamp < enddate){
								return obj;
							}
						})
					}else{ //If level is PL
						var pl = convertcase(this.plSelect.getSelectedItem().getText());
						filter1Arr = _.filter(this.riskTableData, function(obj){
							if(convertcase(obj.PlatformGeo) === pl && obj.Timestamp < enddate){
								return obj;
							}
						})
					}
				}
				
				filterObj = _.groupBy(_.sortBy(filter1Arr, "Timestamp"), 'ZriskRefNo');
				var latestRisk;
				for(var key in filterObj){
					latestRisk = filterObj[key][filterObj[key].length-1];
					//filter2Arr contains latest Risks till that month
					filter2Arr.push( latestRisk );
				}
				
				/*******************************************************************/
				
				switch(this.selectedVizType){
					case "ARR" : 
						break;
					case "AVC" :
						if(data.measureNames === "Added Risks"){
							filter3Arr = _.filter(filter2Arr, function(obj){
								if(obj.CreationDate >= startdate && obj.CreationDate < enddate){
									return obj;
								}
							});
						}else if(data.measureNames === "Closed Risks"){
							filter3Arr = _.filter(filter2Arr, function(obj){
								if(convertcase(obj.RiskStatus) === "closed" && obj.Timestamp >= startdate){
									return obj;
								}
							});
						}
						break;
					case "RBD" :
						var domain = convertcase(data.measureNames);
						filter3Arr = _.filter(filter2Arr, function(obj){
							if(convertcase(obj.RiskStatus) !== "closed" && convertcase(obj.RiskDomain) === domain){
								return obj;
							}
						});
						break;
					case "OR" : 
						var todaydt = new Date();
						if(todaydt < enddate){
							enddate = todaydt;
						}
						filter3Arr = _.filter(filter2Arr, function(obj){
							if(convertcase(obj.RiskStatus) !== "closed" && obj.TargetRiskClosureDate < enddate){
								return obj;
							}
						});
						break;
					case "RBC" : 
						var severity;
						if(data.measureNames === "Low Risks"){
							severity = "low";
						}else if(data.measureNames === "Medium Risks"){
							severity = "medium";
						}else if(data.measureNames === "High Risks"){
							severity = "high";
						}else if(data.measureNames === "Very High Risks"){
							severity = "veryhigh";
						}
						filter3Arr = _.filter(filter2Arr, function(obj){
							if(convertcase(obj.RiskStatus) !== "closed" && convertcase(obj.RiskSeverity) === severity){
								return obj;
							}
						});
						break;
					case "RBS" : 
						var status;
						if(data.measureNames === "Closed"){
							status = "closed";
						}else if(data.measureNames === "In Progress"){
							status = "inprogress";
						}else if(data.measureNames === "Open"){
							status = "open";
						}else if(data.measureNames === "Delayed"){
							status = "delayed";
						}
						filter3Arr = _.filter(filter2Arr, function(obj){
							if(convertcase(obj.RiskStatus) === status){
								return obj;
							}
						});
						break;
				};
				
				this.modelTable.setData(filter3Arr);
				return filter3Arr.length;
				//console.log(filter3Arr);
				
				function convertcase(str){
					return str.replace(/\s/g,'').toLowerCase();
				}
			},
			
			onTableDialogClose : function(evt){
				this.oRiskTableDialog.close();
    		},
			
			popoverDataControl : function(data, a){
				var str1 = "<div style = 'margin: 15px 30px 0 30px'>";
				var str1_1 = "<div style = 'margin: 5px 30px 0 30px'>";
				var str1_2 = "<div style = 'margin: 5px 30px 15px 30px'>";
				var str2 = ":<span style = 'float: right'>";
				var str3 = "</span></div>"
				
				var vizType = this.selectedVizType;
				var val = data.data.val;
				var divStr = "";
				if(vizType == "RBD"){
					var month = val[0].value;
					var domainname = val[2].name;
					var dom;
					
					for(var key in this.domainDespMap){
						if(this.domainDespMap[key] === domainname){
							dom = key;
						}
					}
					var dataArr = this.modelG.getData();
					var filteredData = _.filter(dataArr, function(obj){ 
						return (obj.monthName === month); 
					})[0];
					divStr = divStr + str1 + val[0].name + str2 + val[0].value + str3;
                    divStr = divStr + str1_1 + val[2].name + str2 + val[2].value + str3;
                    divStr = divStr + str1_1 + 'Very High' + str2 + filteredData[dom+"_vh"] + str3;
                    divStr = divStr + str1_1 + 'High' + str2 + filteredData[dom+"_h"] + str3;
                    divStr = divStr + str1_1 + 'Medium' + str2 + filteredData[dom+"_m"] + str3;
                    divStr = divStr + str1_2 + 'Low' + str2 + filteredData[dom+"_l"] + str3;
                    
				}else if(vizType == "OR"){
					var month = val[0].value;
					var dataArr = this.modelG.getData();
					var filteredData = _.filter(dataArr, function(obj){ 
						return (obj.monthName === month); 
					})[0];
					divStr = divStr + str1 + val[0].name + str2 + val[0].value + str3;
                    divStr = divStr + str1_1 + val[2].name + str2 + val[2].value + str3;
                    divStr = divStr + str1_1 + 'Very High' + str2 + filteredData["OVR_RSK_vh"] + str3;
                    divStr = divStr + str1_1 + 'High' + str2 + filteredData["OVR_RSK_h"] + str3;
                    divStr = divStr + str1_1 + 'Medium' + str2 + filteredData["OVR_RSK_m"] + str3;
                    divStr = divStr + str1_2 + 'Low' + str2 + filteredData["OVR_RSK_l"] + str3;
                    
				}else{
					divStr = divStr + str1 + val[0].name + str2 + val[0].value + str3;
                    divStr = divStr + str1_2 + val[2].name + str2 + val[2].value + str3;
				}
				return  new sap.ui.core.HTML({content:divStr});
			}
			/*
			 * <table class="v-tooltip-dimension-measure" style="border-collapse: collapse;">
			 * 	<tr>
			 * 		<td style="color:green;font-family:Arial;font-size:12px;white-space:nowrap;overflow:hidden;padding-bottom:8px;" class="v-body-dimension-label">Month:</td>
			 * 		<td style="color:blue;font-family:Arial;font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;padding-left:7px;padding-bottom:8px;" class="v-body-dimension-value">March</td></tr><tr><td style="color:green;font-family:Arial;font-size:12px;white-space:nowrap;overflow:hidden;padding-bottom:0px;" class="v-body-measure-label">INFORMATION SECURITY:</td><td style="color:blue;font-family:Arial;font-size:13px;font-weight:bold;white-space:nowrap;overflow:hidden;padding-left:7px;padding-bottom:0px;" class="v-body-measure-value">68</td>
			 *  </tr>
			 * </table>
			 * 
			 * */
			
	});
});
