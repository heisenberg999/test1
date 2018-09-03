sap.ui.define([
		"ztrend/controller/BaseController",
		"sap/ui/model/json/JSONModel",
		"ztrend/util/formatter",
		"sap/viz/ui5/controls/common/feeds/FeedItem",
	    "sap/viz/ui5/data/FlattenedDataset",
		"sap/m/MessageBox",
		"sap/m/MessageToast",
		"ztrend/util/CustomChartFormatter"
	], function (BaseController, JSONModel, Formatter, FeedItem, FlattenedDataset, MessageBox, MessageToast, Chart) {
		"use strict";

		return BaseController.extend("ztrend.controller.testview", {
			
			formatter : Formatter,
			
			onInit : function () {
				
				this.getRouter().getRoute("testview").attachPatternMatched(this._onRouteMatched, this);
				this.getRouter().attachBypassed(this.onBypassed, this);
			},
			
			_onRouteMatched :  function(oEvent) {
				
			}
	});
});