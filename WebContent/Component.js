sap.ui.define([
		"sap/ui/core/UIComponent",
		"sap/ui/model/json/JSONModel",
		"sap/ui/Device",
		"ztrend/model/models",
		"ztrend/controller/DataBuilder"
	], function (UIComponent, JSONModel, Device, models, DataBuilder) {
		"use strict";

		return UIComponent.extend("ztrend.Component", {

			metadata : {
				manifest : "json"
			},

			init : function () {

				this._oDataBuilder = new DataBuilder(this);

				UIComponent.prototype.init.apply(this, arguments);
				this.getRouter().initialize();
			},
			
			destroy : function () {
				this._oDataBuilder.destroy();
				// call the base component's destroy function
				UIComponent.prototype.destroy.apply(this, arguments);
			},

			getContentDensityClass : function() {
				if (this._sContentDensityClass === undefined) {
					// check whether FLP has already set the content density class; do nothing in this case
					if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
						this._sContentDensityClass = "";
					} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
						this._sContentDensityClass = "sapUiSizeCompact";
					} else {
						// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
						this._sContentDensityClass = "sapUiSizeCozy";
					}
				}
				return this._sContentDensityClass;
			}

		});

	}
);