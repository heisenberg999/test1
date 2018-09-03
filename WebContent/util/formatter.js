sap.ui.define([
        "sap/ui/core/format/NumberFormat"
        ], function (NumberFormat) {
	"use strict";

	return {
		
		getARR : function(arrTemp){
			var arr = 0, sum = 0, len = 0;
			if(arrTemp.length){
				sum = _.reduce(arrTemp, function(memo, num){ return memo + num; }, 0);
				len = arrTemp.length;
				arr = Math.round(sum/len);
			}
			return [arr,sum,len];
		},
		
		//For Overdue Risk, Risk by criticality and Domain 
		getFormattedRisk : function(obj){
			var str = obj.vh + ";" + obj.h + ";" + obj.m + ";" + obj.l;
			return str;
		},
		
		//For Risk By Status
		getFormattedRisk2 : function(obj){
			var str = obj.c + ";" + obj.p + ";" + obj.o + ";" + obj.d;
			return str;
		},
		
		//Add Strings for Unilever
		addString : function(str1, str2){
			var arr1 = str1.split(";");
			var arr2 = str2.split(";");
			var val1 = parseInt(arr1[0]) + parseInt(arr2[0]);
			var val2 = parseInt(arr1[1]) + parseInt(arr2[1]);
			var val3 = parseInt(arr1[2]) + parseInt(arr2[2]);
			var val4 = parseInt(arr1[3]) + parseInt(arr2[3]);
			return (val1 + ";" + val2 + ";" + val3 + ";" + val4);
		},
		
		/*******************************************************************************
		 *************************DATE MODIFICATION FUNCTIONS***************************/
		convertDate : function(dt){
			try{
				if(dt){
					return dt.getDate() + '-' + (dt.getMonth() + 1) + '-' + dt.getFullYear();
				}
			}catch(e){
				console.log(e);
			}	
		},
		
		modifyTS : function(val){
			try{
				if(val){
					if(typeof(val) == "number"){ val = val.toString(); }
					var year = parseInt(val.substring(0,4));
					var month = parseInt(val.substring(4,6));
					var day = parseInt(val.substring(6,8));
					if(day == 0){ day = 1; }
					var hr = parseInt(val.substring(8,10));
					var min = parseInt(val.substring(10,12));
					var sec = parseInt(val.substring(12,14));
					return new Date(year, (month-1), day, hr, min, sec);
				}
			}catch(e){
				console.log(e);
			}
		},
		
		modifyCdate : function(dt){
			try{
				if(dt){
					var year = parseInt(dt.split("-")[2]);
					var month = parseInt(dt.split("-")[1]);
					var day = parseInt(dt.split("-")[0]);
					var ndate = new Date(year, month-1, day);
					return ndate;
				}
			}catch(e){
				console.log(e);
			}
		},
		
		modifyTCdate : function(dt){
			try{
				if(dt){
					var year = parseInt(dt.split("-")[2]);
					var month = parseInt(dt.split("-")[1]);
					var day = parseInt(dt.split("-")[0]);
					var ndate = new Date(year, month-1, day);
					//Excel Error
					if(ndate.toString() == "Invalid Date"){
						var d1 = new Date(1900,0,1);
						dt = parseInt(dt) - 2;
						var t2 = d1.getTime() + (dt * 24 * 3600 * 1000);
						ndate = new Date(t2);
					}
					return ndate;
				}
			}catch(e){
				console.log(e);
			}
		},
		/*******************************************************************************
		 ************************* END *************************************************/
		chkTCdateEqNA : function(dt){
			try{
				if(dt && (dt.replace(/[\W_]+/g," ").toLowerCase() == "na")){
					return true;
				}else{
					return false;
				}
			}catch(e){
				console.log(e);
			}
		},
		
		convNameToId : function(name, type){
			var val;
			try{
				if(name){
					val = name.replace(/[\W_]+/g,"").toUpperCase();
					switch(type){
						case "U" : return ztrend.hDescId["U"][val];  break;
						case "O" : return ztrend.hDescId["O"][val];  break;
						case "P" : return ztrend.hDescId["P"][val];  break;
						case "D" : return ztrend.hDescId["D"][val];  break;
					}
				}
			}catch(e){
				console.log(e);
			}
		},
		
		getKey : function(year,month){
			var key;
			if(month.toString().length == 1){
				key = year.toString() + "0" + month.toString();
			}else{
				key = year.toString() + month.toString();
			}
			return key;
		},
		
		/**************************************************************************************************/
		/**************************************************************************************************
		 * ************************************************************************************************/
		
		riskformat : function(str){
			if(str){
				return str.replace(/\r?\n?/g, '').trim();
			}
		},
		
		dateformat : function(dt){
			var TCDate_TBD = new Date(2050,11,31);
			var TCDate_NA  = new Date(2050,11,30);
			if(dt){
				if(dt == "Invalid Date"){
					return "NA";
				}else if(dt == TCDate_TBD){
					return "TBD";
				}else if(dt == TCDate_NA){
					return "NA";
				}else{
					return dt.getDate() + "/" + (dt.getMonth()+1) + "/" + dt.getFullYear();
				}	 
			}
		},
		
		formatNumber : function(value){
			if(!value){
				return value;
			}
			
			value = parseFloat(value);
			//var f1 =  sap.ui.core.format.NumberFormat.getFloatInstance({style: 'Standard', maxFractionDigits: 2});
			var f1 =  sap.ui.core.format.NumberFormat.getFloatInstance({ pattern : "#,###.00", groupingSeparator : "," , decimalSeparator : "." });
			return f1.format(value);
		},
		
		dateformatter : function(value){
			if(value){
				value = value.replace(/[^0-9]/g, "");
				var format = this.getOwnerComponent()._oDataSelector.userDateFormat;
				switch(format){
					case "dd.MM.yyyy" : return value.substring(6,8) + "." +  value.substring(4,6) + "." + value.substring(0,4); break;
					case "MM/dd/yyyy" : return value.substring(4,6) + "/" +  value.substring(6,8) + "/" + value.substring(0,4); break;
					case "MM-dd-yyyy" : return value.substring(4,6) + "-" +  value.substring(6,8) + "-" + value.substring(0,4); break;
					case "yyyy.MM.dd" : return value.substring(0,4) + "." +  value.substring(6,8) + "." + value.substring(4,6); break;
					case "yyyy/MM/dd" : return value.substring(0,4) + "/" +  value.substring(6,8) + "/" + value.substring(4,6); break;
					case "yyyy-MM-dd" : return value.substring(0,4) + "-" +  value.substring(6,8) + "-" + value.substring(4,6); break;
					default : return value.substring(4,6) + "/" +  value.substring(6,8) + "/" + value.substring(0,4); 
				}
			}else{
				return value;
			}
		},
		
		/******************************************************************************************/
		
	};
});
