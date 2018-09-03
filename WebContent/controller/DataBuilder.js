sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/format/NumberFormat",
	"ztrend/util/formatter"
], function(UI5Object, MessageBox, JSONModel, DateFormat, NumberFormat, formatter) {
	"use strict";

	return UI5Object.extend("ztrend.controller.DataBuilder", {

		constructor: function(oComponent) {
			//this.callService();
			var that = this;
			var c = this.c = oComponent;
			c.def1 = $.Deferred();
			
			this.TCDate_TBD = new Date(2050,11,31);
			this.TCDate_NA  = new Date(2050,11,30);
			this.anaArray = [];
			this.c.yearArr = [];
			
			/* CALL MASTER-DATA SET */
			//var url1 = "model/masterdataSet.json";
			var url1 = "https://ulapps-d.unilever.com/sap/opu/odata/SAP/ZRR_RISK_DC_SRV/RISKMASTERSet?$format=json";
			c.oModel1 = new JSONModel();
			c.setModel(c.oModel1, "rm");
			c.oModel1.setSizeLimit(100000);
			
			/* CALL HEIRARCHY SET */
			//var url2 = "model/hset.json";
			var url2 = "https://ulapps-d.unilever.com/sap/opu/odata/SAP/ZRR_RISK_DC_SRV/ZHEIRARCHYSet?$format=json";
			c.oModel2 = new JSONModel();
			c.setModel(c.oModel2, "rh");
			
			var def1 = $.Deferred();
			var def2 = $.Deferred();
			
			sap.ui.core.BusyIndicator.show();
			//Master Data Risk
			$.ajax({
				url : url1,
				success : function(data, textStatus, jqXHR){
					if(typeof(data) == "string") data = JSON.parse(data);
					def1.resolve(data.d.results);
				},
				error : function(jqXHR, textStatus, errorThrown){
					def1.reject(errorThrown);
					//alert("Error : " + errorThrown);
				}
			});
			
			//Heirarchy Set
			$.ajax({
				url : url2,
				success : function(data, textStatus, jqXHR){
					if(typeof(data) == "string") data = JSON.parse(data);
					that.c.hArr = data.d.results;
					that.arrangeHeirarchy(data.d.results);
					def2.resolve(data.d.results);
				},
				error : function(jqXHR, textStatus, errorThrown){
					def2.reject(errorThrown);
					//alert("Error : " + errorThrown);
				}
			});
			
			$.when(def1, def2).then(jQuery.proxy(defSuccess, this), jQuery.proxy(defError, this));
			
			function defSuccess(dataArr, dataH){
				sap.ui.core.BusyIndicator.hide();
				this.perform(dataArr, dataH);
			}
			
			function defError(error1, error2){
				sap.ui.core.BusyIndicator.hide();
				alert(error1 + " " + error2);
				
			}
		},
		
		arrangeHeirarchy : function(hArr){
			var hDescId = {}, hIdDesc = {}, desc, id;
			hDescId["U"] = {}, hDescId["O"] = {}, hDescId["P"] = {}, hDescId["D"] = {};
			for(var i=0; i<hArr.length; i++){
				desc = hArr[i].Descrption.replace(/[\W_]+/g,"").toUpperCase();
				id = hArr[i].Id
				switch(id.substr(0,1)){
					case "U" : hDescId["U"][desc] = id;  break;
					case "O" : hDescId["O"][desc] = id;  break;
					case "P" : hDescId["P"][desc] = id;  break;
					case "D" : hDescId["D"][desc] = id;  break;
				}
				hIdDesc[id] = hArr[i].Descrption.toUpperCase()
			}
			ztrend.hDescId = hDescId;
			ztrend.hIdDesc = hIdDesc;
		},
		
		/* This Function loops through the Master Risk Data and corrects the Discrepant Data.
		 * @CREATION/TARGET-CLOSURE DATE LOGIC : Fills the creation date if empty.
		 * Picks the first Unique Risk's Creation or Target closure Date & fills it for that particular RiskRefNo.
		 * @catRisk - This Object catagorizes Risks based on their Year and Month.
		 * @chkrisk - This Array contains Risks whose  OrgId, PlatformId or RiskDomainId is undefined.
		 * Those risks are eliminated. Check ZRISKDC application to correct the Data.
		 * */
		perform : function(dataArr, dataH){
			var t1 = performance.now();
			var catRisk = {};
			var chkrisk = []; window.chkrisk = chkrisk;
			var prevCdate, currCdate, prevTCdate, currTCdate, prevRiskid, currRiskid;
			var isFirstCdate, isFirstTCdate, cDateEditForRisk, tcDateEditForRisk, minDate, maxDate, year, month;
			var modRiskData = _.sortBy( _.sortBy(dataArr, "Timestamp"), "ZriskRefNo" );
			
			prevRiskid = currRiskid = modRiskData[0].ZriskRefNo;
			prevCdate = currCdate = formatter.modifyCdate(modRiskData[0].CreationDate);
			prevTCdate = currTCdate = formatter.modifyTCdate(modRiskData[0].TargetRiskClosureDate);
			minDate = formatter.modifyTS(modRiskData[0].Timestamp);
			maxDate = formatter.modifyTS(modRiskData[0].Timestamp);
			
			for(var i=0; i<modRiskData.length; i++){
				currRiskid = modRiskData[i].ZriskRefNo;
				modRiskData[i].Timestamp = formatter.modifyTS(modRiskData[i].Timestamp);
				if(minDate > modRiskData[i].Timestamp){
					minDate = modRiskData[i].Timestamp;
				}
				if(maxDate < modRiskData[i].Timestamp){
					maxDate = modRiskData[i].Timestamp;
				}
				
				//CREATION DATE
				isFirstCdate = isFirstTCdate = (i == 0 || prevRiskid!==currRiskid) ? true : false; //Then it is the first unique riskid
				
				if( !modRiskData[i].CreationDate ){
					if(isFirstCdate){
						modRiskData[i].CreationDate = modRiskData[i].Timestamp;
						cDateEditForRisk = currRiskid;
					}else{
						modRiskData[i].CreationDate = prevCdate;
					}
				}else{
					if(cDateEditForRisk == currRiskid){
						modRiskData[i].CreationDate = prevCdate;
					}else{
						modRiskData[i].CreationDate = formatter.modifyCdate(modRiskData[i].CreationDate);
					}	
				}
				
				//TARGET CLOSURE DATE
				if( !modRiskData[i].TargetRiskClosureDate || formatter.chkTCdateEqNA(modRiskData[i].TargetRiskClosureDate) ){
					if(isFirstTCdate){
						modRiskData[i].TargetRiskClosureDate = this.TCDate_NA;
						//tcDateEditForRisk = currRiskid;
					}else{
						modRiskData[i].TargetRiskClosureDate = prevTCdate;
					}
				}else if(modRiskData[i].TargetRiskClosureDate == "TBD"){
					modRiskData[i].TargetRiskClosureDate = this.TCDate_TBD;
				}else{
					modRiskData[i].TargetRiskClosureDate = formatter.modifyTCdate(modRiskData[i].TargetRiskClosureDate);
				}
				
				prevCdate = modRiskData[i].CreationDate;
				prevTCdate = modRiskData[i].TargetRiskClosureDate;
				prevRiskid = modRiskData[i].ZriskRefNo;
				
				if(!modRiskData[i].RiskStatus){
					modRiskData[i].RiskStatus = "Open";
				}
				if(!modRiskData[i].RiskSeverity){
					modRiskData[i].RiskSeverity = "Low";
				}
				if(!modRiskData[i].InherentRiskRating){
					modRiskData[i].InherentRiskRating = "1";
				}
				
				modRiskData[i].OrgId = formatter.convNameToId(modRiskData[i].OrgName, "O");
				modRiskData[i].PlatformId = formatter.convNameToId(modRiskData[i].PlatformGeo, "P");
				modRiskData[i].RiskDomainId = formatter.convNameToId(modRiskData[i].RiskDomain, "D");
				
				//CATAGORISE RISKS
				year = (modRiskData[i].Timestamp.getFullYear()).toString();
				month = (modRiskData[i].Timestamp.getMonth() + 1).toString();
				if(month.length == 1){
					month = "0" + month; 
				}
				
				if(this.c.yearArr.indexOf(year) == -1){
					this.c.yearArr.push(year);
				}
				
				if(!modRiskData[i].OrgId || !modRiskData[i].PlatformId || !modRiskData[i].RiskDomainId){
					chkrisk.push(modRiskData[i]);
				}else{
					if(!catRisk[year+month]){
						catRisk[year+month] = [];
					}
					catRisk[year+month].push(modRiskData[i]);
				}
			}
			
			/*console.log(minDate);
			console.log(maxDate);*/
			if(chkrisk.length > 0){
				console.log("The following Risks Need attention. Use below command to check.");
				console.log('console.table(chkrisk, ["ZriskRefNo","OrgId","OrgName","PlatformId","PlatformGeo","RiskDomainId","RiskDomain"])');
				//console.log(chkrisk);
			}
			this.c.masterData = modRiskData;
			window.rm = modRiskData;
			window.cr = catRisk;
			this.performCatRisk(catRisk);
			this.c.oModel1.setData( {d : { results : modRiskData } });
			var t2 = performance.now();
			console.log("Performance : " + (t2-t1));
		},
		
		
		/* This function will loop through the catRisk object keys.
		 * Ex- catRisk : { 
		 * 	"201801" : [Array of Risks where month is 01 and Year is 2018]
		 * }
		 * If for a particular month ex- 201802 ie Feb no key exists, which means no risks were entered
		 * during that period. Then it will call @copyPrevAnaRisk function which in turn will copy the
		 * KPI's calculated in the @anaArray for the previous month & append it to @anaArray.
		 * If key exists for a particular month then it will call @doFilterRisk which in turn will call
		 * @calcKPI funtion to calculate KPIs & insert in @anaArray.
		 * */
		performCatRisk : function(catRisk){
			var startYear, endYear, startMonth, endMonth, lastmonth;
			var key, prevArray, prevKey;
			var keysArr = Object.keys(catRisk);
			keysArr.sort();
			//console.log(keysArr);
			startYear = parseInt(keysArr[0].substring(0,4));
			startMonth = parseInt(keysArr[0].substring(4,6));
			endYear = parseInt(keysArr[keysArr.length-1].substring(0,4));
			endMonth = parseInt(keysArr[keysArr.length-1].substring(4,6));
			
			prevArray = catRisk[keysArr[0]];
			prevKey = keysArr[0];
			
			for(var i=startYear ; i<=endYear ; i++){
				var j;
				if(i==startYear){
					j=startMonth; lastmonth=12;
				}else if(i==endYear){
					j=1; lastmonth=endMonth;
				}else{
					j=1; lastmonth=12;
				}
				for( ; j<=lastmonth ; j++){
					//get Key
					key = formatter.getKey(i,j);

					if(!catRisk[key]){
						catRisk[key] = [];
						this.copyPrevAnaRisk(key, prevKey);
						
					}else{
						this.doRiskFilter(catRisk, key, prevArray);
						prevArray = catRisk[key];
						prevKey = key;
					}
				}
			}
			
			//Comment the For loop and uncomment this line to test a particular YEAR+MONTH.
			//this.doRiskFilter(catRisk, "201807", prevArray);
			
			this.c.anaData = this.anaArray; //@anaArray is complete at this point.
			this.c.def1.resolve();
		},
		
		/*This function add Previous months Unique Risk & filters the catRisk["year+month"] array to contain
		 * only latest unique Risks. It then calls  @calcKPI to calculate the KPI's and put it in @anaArray.
		 * */
		doRiskFilter : function(catRisk, key, prevArray){
			catRisk[key] = prevArray.concat(catRisk[key]);
			var filterArr = _.chain(catRisk[key]).sortBy("Timestamp").reverse().groupBy("ZriskRefNo").map(_.first).value();
			catRisk[key] = filterArr;
			this.calcKPI(catRisk[key], key);
		},
		
		/*This function copies the previous months calculated KPIs from @anaArray and appends it
		 * for the current month.
		 * */
		copyPrevAnaRisk : function(key, prevKey){
			var year  = parseInt(key.substring(0,4));
			var month = parseInt(key.substring(4,6));
			var prevYear = parseInt(prevKey.substring(0,4));
			var prevMonth = parseInt(prevKey.substring(4,6));
			var filterArr = _.filter(this.anaArray, function(obj){ 
								 if( prevYear == obj.YearKey && prevMonth == obj.MonthKey ){
									 return obj;
								 }});
			
			var tempArr = [], riskobj;
			for(var i=0; i<filterArr.length; i++){
				riskobj = _.extend({}, filterArr[i]);
				riskobj.Added = 0;
				riskobj.Closed = 0;
				riskobj.YearKey = year;
				riskobj.MonthKey = month;
				tempArr.push(riskobj)
			}
				
			this.anaArray = this.anaArray.concat(tempArr);
			
			/*var tempArr = _.each(filterArr, function(obj, index){
				obj.Added = 0;
				obj.Closed = 0;
				obj.YearKey = year;
				obj.MonthKey = month;
			});
			this.anaArray = this.anaArray.concat(tempArr);*/
		},
		
		/*This function creates the @anaArray (ie Analysis Array) which is required to feed data to 
		 * the GRAPH
		 * */
		calcKPI : function(dataArr, key){
			var tempArrObj = {};
			tempArrObj.Platform = {}, tempArrObj.Org = {}; //tempArrObj.Domain = {};
			
			var riskSeverity, riskStatus, pid, oid, did; 
			var today, currYear, currMonth, year, month, tcDate, ovrrskFlag=false, monthSDate, monthEDate;
			currYear = new Date().getFullYear();
			currMonth = new Date().getMonth() + 1 ;
			today = new Date();
			year  = parseInt(key.substring(0,4));
			month = parseInt(key.substring(4,6));
			monthSDate = new Date(year, month-1, 1);
			monthEDate = new Date(year, month, 1);
			if(year == currYear && month==currMonth){
				ovrrskFlag = true;
			}
	
			for(var i=0; i<dataArr.length; i++){
				riskSeverity = dataArr[i].RiskSeverity.toLowerCase();
				riskStatus   = dataArr[i].RiskStatus.toLowerCase();
				pid = dataArr[i].PlatformId;
				oid = dataArr[i].OrgId;
				did = dataArr[i].RiskDomainId;
				
				/******************************************************************************/
				if(!tempArrObj.Platform[pid]){
					tempArrObj.Platform[pid] = {};
					tempArrObj.Platform[pid].ARR = [];
					tempArrObj.Platform[pid].ADDED = 0;
					tempArrObj.Platform[pid].CLOSED = 0;
					tempArrObj.Platform[pid].OVRRSK = {};
					tempArrObj.Platform[pid].OVRRSK.vh = 0;
					tempArrObj.Platform[pid].OVRRSK.h = 0;
					tempArrObj.Platform[pid].OVRRSK.m = 0;
					tempArrObj.Platform[pid].OVRRSK.l = 0;
					tempArrObj.Platform[pid].RSKCRT = {};
					tempArrObj.Platform[pid].RSKCRT.vh = 0;
					tempArrObj.Platform[pid].RSKCRT.h = 0;
					tempArrObj.Platform[pid].RSKCRT.m = 0;
					tempArrObj.Platform[pid].RSKCRT.l = 0;
					tempArrObj.Platform[pid].RSKSTS = {};
					tempArrObj.Platform[pid].RSKSTS.c = 0;
					tempArrObj.Platform[pid].RSKSTS.p = 0;
					tempArrObj.Platform[pid].RSKSTS.o = 0;
					tempArrObj.Platform[pid].RSKSTS.d = 0;
				}
				
				if(!tempArrObj.Org[oid]){
					tempArrObj.Org[oid] = {};
					tempArrObj.Org[oid].ARR = [];
					tempArrObj.Org[oid].ADDED = 0;
					tempArrObj.Org[oid].CLOSED = 0;
					tempArrObj.Org[oid].OVRRSK = {};
					tempArrObj.Org[oid].OVRRSK.vh = 0;
					tempArrObj.Org[oid].OVRRSK.h = 0;
					tempArrObj.Org[oid].OVRRSK.m = 0;
					tempArrObj.Org[oid].OVRRSK.l = 0;
					tempArrObj.Org[oid].RSKCRT = {};
					tempArrObj.Org[oid].RSKCRT.vh = 0;
					tempArrObj.Org[oid].RSKCRT.h = 0;
					tempArrObj.Org[oid].RSKCRT.m = 0;
					tempArrObj.Org[oid].RSKCRT.l = 0;
					tempArrObj.Org[oid].RSKSTS = {};
					tempArrObj.Org[oid].RSKSTS.c = 0;
					tempArrObj.Org[oid].RSKSTS.p = 0;
					tempArrObj.Org[oid].RSKSTS.o = 0;
					tempArrObj.Org[oid].RSKSTS.d = 0;
				}
				/*******************************************************************************/
				
				if(riskStatus !== "closed"){
					
					tempArrObj.Platform[pid].ARR.push(parseInt(dataArr[i].InherentRiskRating));
					tempArrObj.Org[oid].ARR.push(parseInt(dataArr[i].InherentRiskRating));
					
					/*if(!tempArrObj.Domain[did]){
						tempArrObj.Domain[did] = {};
						tempArrObj.Domain[did].vh = 0;
						tempArrObj.Domain[did].h = 0;
						tempArrObj.Domain[did].m = 0;
						tempArrObj.Domain[did].l = 0;
					}*/
					if(!tempArrObj.Platform[pid][did]){
						tempArrObj.Platform[pid][did] = {};
						tempArrObj.Platform[pid][did].vh = 0;
						tempArrObj.Platform[pid][did].h = 0;
						tempArrObj.Platform[pid][did].m = 0;
						tempArrObj.Platform[pid][did].l = 0;
					}
					if(!tempArrObj.Org[oid][did]){
						tempArrObj.Org[oid][did] = {};
						tempArrObj.Org[oid][did].vh = 0;
						tempArrObj.Org[oid][did].h = 0;
						tempArrObj.Org[oid][did].m = 0;
						tempArrObj.Org[oid][did].l = 0;
					}
					switch(riskSeverity){
						case "very high" : 
							tempArrObj.Platform[pid][did].vh++;
							tempArrObj.Org[oid][did].vh++;
							tempArrObj.Platform[pid].RSKCRT.vh++;
							tempArrObj.Org[oid].RSKCRT.vh++;
							break;
						case "high" : 
							tempArrObj.Platform[pid][did].h++;
							tempArrObj.Org[oid][did].h++;
							tempArrObj.Platform[pid].RSKCRT.h++;
							tempArrObj.Org[oid].RSKCRT.h++;
							break;
						case "medium" : 
							tempArrObj.Platform[pid][did].m++;
							tempArrObj.Org[oid][did].m++;
							tempArrObj.Platform[pid].RSKCRT.m++;
							tempArrObj.Org[oid].RSKCRT.m++;
							break;
						case "low" : 
							tempArrObj.Platform[pid][did].l++;
							tempArrObj.Org[oid][did].l++;
							tempArrObj.Platform[pid].RSKCRT.l++;
							tempArrObj.Org[oid].RSKCRT.l++;
							break;
					}
					
					switch(riskStatus){
						case "in progress" : 
							tempArrObj.Platform[pid].RSKSTS.p++;
							tempArrObj.Org[oid].RSKSTS.p++;
							break;
						case "open" :
							tempArrObj.Platform[pid].RSKSTS.o++;
							tempArrObj.Org[oid].RSKSTS.o++;
							break;
						case "delayed" : 
							tempArrObj.Platform[pid].RSKSTS.d++;
							tempArrObj.Org[oid].RSKSTS.d++;
							break;
					}
					
					if(ovrrskFlag){
						if(dataArr[i].TargetRiskClosureDate  < today){
							switch(riskSeverity){
								case "very high" : 
									tempArrObj.Platform[pid].OVRRSK.vh++;
									tempArrObj.Org[oid].OVRRSK.vh++;
									break;
								case "high" : 
									tempArrObj.Platform[pid].OVRRSK.h++;
									tempArrObj.Org[oid].OVRRSK.h++;
									break;
								case "medium" : 
									tempArrObj.Platform[pid].OVRRSK.m++;
									tempArrObj.Org[oid].OVRRSK.m++;
									break;
								case "low" : 
									tempArrObj.Platform[pid].OVRRSK.l++;
									tempArrObj.Org[oid].OVRRSK.l++;
									break;
							}
						}
					}else{
						if(dataArr[i].TargetRiskClosureDate < monthEDate){
							switch(riskSeverity){
								case "very high" : 
									tempArrObj.Platform[pid].OVRRSK.vh++;
									tempArrObj.Org[oid].OVRRSK.vh++;
									break;
								case "high" : 
									tempArrObj.Platform[pid].OVRRSK.h++;
									tempArrObj.Org[oid].OVRRSK.h++;
									break;
								case "medium" : 
									tempArrObj.Platform[pid].OVRRSK.m++;
									tempArrObj.Org[oid].OVRRSK.m++;
									break;
								case "low" : 
									tempArrObj.Platform[pid].OVRRSK.l++;
									tempArrObj.Org[oid].OVRRSK.l++;
									break;
							}
						}
					}
					
					if(dataArr[i].CreationDate >= monthSDate && dataArr[i].CreationDate < monthEDate){
						tempArrObj.Platform[pid].ADDED++;
						tempArrObj.Org[oid].ADDED++;
					}
				}//ENDIF
				else{
					//Closed Risks
					if(dataArr[i].Timestamp >= monthSDate && dataArr[i].Timestamp < monthEDate){
						tempArrObj.Platform[pid].CLOSED++;
						tempArrObj.Org[oid].CLOSED++;
					}
					
					//for Risk By Status
					tempArrObj.Platform[pid].RSKSTS.c++;
					tempArrObj.Org[oid].RSKSTS.c++;
				}
				
				
			}
			window.oTemp = tempArrObj;
			this.formAnaTable(tempArrObj, key);
		},
		
		formAnaTable : function(tempArrObj, key){
			//this.anaArray;
			var domArr = ["D001","D002","D003","D004","D005","D006","D007","D008","D009"];
			var row, year, month, tempOrgArr = []; 
			var arrArray, sum=0, len=0, added=0, closed=0 ;
			
			year  = parseInt(key.substring(0,4));
			month = parseInt(key.substring(4,6));
			
			//PLATFORM
			for(var plkey in tempArrObj.Platform){
				row = _.extend({}, this.analyTmplt);
				row.YearKey = year;
				row.MonthKey = month;
				row.RiskIdKey = plkey;
				row.Descrption = ztrend.hIdDesc[plkey];
				row.Arr = formatter.getARR(tempArrObj.Platform[plkey].ARR)[0];
				row.Added = tempArrObj.Platform[plkey].ADDED;
				row.Closed = tempArrObj.Platform[plkey].CLOSED;
				row.OvrRsk = formatter.getFormattedRisk(tempArrObj.Platform[plkey].OVRRSK);
				row.Rskcrt = formatter.getFormattedRisk(tempArrObj.Platform[plkey].RSKCRT);
				row.Rsksts = formatter.getFormattedRisk2(tempArrObj.Platform[plkey].RSKSTS);
				domArr.map(function(dom){
					if(tempArrObj.Platform[plkey][dom]){
						row[dom] = formatter.getFormattedRisk(tempArrObj.Platform[plkey][dom]);
					}
				})
				this.anaArray.push(row);
			}
			
			//ORGANISATION
			for(var orgkey in tempArrObj.Org){
				row = _.extend({}, this.analyTmplt);
				row.YearKey = year;
				row.MonthKey = month;
				row.RiskIdKey = orgkey;
				row.Descrption = ztrend.hIdDesc[orgkey];
				
				arrArray = formatter.getARR(tempArrObj.Org[orgkey].ARR);
				row.Arr = arrArray[0]; 
				sum = sum + arrArray[1];
				len = len + arrArray[2];
				
				row.Added = tempArrObj.Org[orgkey].ADDED;
				added = added + row.Added;
				row.Closed = tempArrObj.Org[orgkey].CLOSED;
				closed = closed + row.Closed;
				
				row.OvrRsk = formatter.getFormattedRisk(tempArrObj.Org[orgkey].OVRRSK);
				row.Rskcrt = formatter.getFormattedRisk(tempArrObj.Org[orgkey].RSKCRT);
				row.Rsksts = formatter.getFormattedRisk2(tempArrObj.Org[orgkey].RSKSTS);
				domArr.map(function(dom){
					if(tempArrObj.Org[orgkey][dom]){
						row[dom] = formatter.getFormattedRisk(tempArrObj.Org[orgkey][dom]);
					}
				})
				this.anaArray.push(row);
				tempOrgArr.push(row);
			}
			
			//UNILEVER
				row = _.extend({}, this.analyTmplt);
				row.YearKey = year;
				row.MonthKey = month;
				row.RiskIdKey = "UL01";
				row.Descrption = "UNILEVER";
				if(sum == 0 && len == 0){ 
					row.Arr = 0;
				}else{
					row.Arr = Math.round(sum/len);
				}
				row.Added = added;
				row.Closed = closed;
				$.each(tempOrgArr, function(index, obj){
					row.D001 = formatter.addString(row.D001, obj.D001);
					row.D002 = formatter.addString(row.D002, obj.D002); 
					row.D003 = formatter.addString(row.D003, obj.D003); 
					row.D004 = formatter.addString(row.D004, obj.D004); 
					row.D005 = formatter.addString(row.D005, obj.D005); 
					row.D006 = formatter.addString(row.D006, obj.D006); 
					row.D007 = formatter.addString(row.D007, obj.D007); 
					row.D008 = formatter.addString(row.D008, obj.D008); 
					row.D009 = formatter.addString(row.D009, obj.D009); 
					row.OvrRsk = formatter.addString(row.OvrRsk, obj.OvrRsk); 
					row.Rskcrt = formatter.addString(row.Rskcrt, obj.Rskcrt);
					row.Rsksts = formatter.addString(row.Rsksts, obj.Rsksts); 
				});
				
				this.anaArray.push(row);
			
			window.ana = this.anaArray;
		},
		
		analyTmplt : {
			"YearKey": "",
			"MonthKey": "",
			"RiskIdKey": "",
			"Descrption": "",
			"Arr": 0,
			"Added": 0,
			"Closed": 0,
			"D001": "0;0;0;0",
			"D002": "0;0;0;0",
			"D003": "0;0;0;0",
			"D004": "0;0;0;0",
			"D005": "0;0;0;0",
			"D006": "0;0;0;0",
			"D007": "0;0;0;0",
			"D008": "0;0;0;0",
			"D009": "0;0;0;0",
			"OvrRsk": "0;0;0;0",
			"Rskcrt": "0;0;0;0",
			"Rsksts": "0;0;0;0"
		}

	});
});