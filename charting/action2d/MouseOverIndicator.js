define([
    	"dojo/_base/lang", 
    	"dojo/_base/declare", 
    	"dojo/_base/connect", 
    	"dojo/_base/window", 
    	"dojo/_base/sniff",
    	"dojo/_base/array",
    	"dojo/on",
    	"dojo/mouse",
    	"./Base",
    	"./_IndicatorElement", 
    	"dojox/lang/utils", 
    	"dojo/_base/event",
    	 "dijit/Tooltip"
    ], function(lang, declare, hub, win, has, array, on, mouse, Base, IndicatorElement, du, eventUtil, Tooltip){ 

    	/*=====
    	var __MouseIndicatorCtorArgs = {
    		// summary:
    		//		Additional arguments for mouse indicator.
    		// series: String
    		//		Target series name for this action.
    		// autoScroll: Boolean?
    		//		Whether when moving indicator the chart is automatically scrolled. Default is true.
    		// vertical: Boolean?
    		//		Whether the indicator is vertical or not. Default is true.
    		// fixed: Boolean?
    		//		Whether a fixed precision must be applied to data values for display. Default is true.
    		// precision: Number?
    		//		The precision at which to round data values for display. Default is 1.
    		// lineStroke: dojo/gfx/Stroke?
    		//		An optional stroke to use for indicator line.
    		// lineOutline: dojo/gfx/Stroke?
    		//		An optional outline to use for indicator line.
    		// lineShadow: dojo/gfx/Stroke?
    		//		An optional shadow to use for indicator line.
    		// stroke: dojo.gfx.Stroke?
    		//		An optional stroke to use for indicator label background.
    		// outline: dojo.gfx.Stroke?
    		//		An optional outline to use for indicator label background.
    		// shadow: dojo.gfx.Stroke?
    		//		An optional shadow to use for indicator label background.
    		// fill: dojo.gfx.Fill?
    		//		An optional fill to use for indicator label background.
    		// fillFunc: Function?
    		//		An optional function to use to compute label background fill. It takes precedence over
    		//		fill property when available.
    		// labelFunc: Function?
    		//		An optional function to use to compute label text. It takes precedence over
    		//		the default text when available.
    		//	|		function labelFunc(firstDataPoint, secondDataPoint, fixed, precision) {}
    		//		`firstDataPoint` is the `{x, y}` data coordinates pointed by the mouse.
    		//		`secondDataPoint` is only useful for dual touch indicators not mouse indicators.
    		//		`fixed` is true if fixed precision must be applied.
    		//		`precision` is the requested precision to be applied.
    		// font: String?
    		//		A font definition to use for indicator label background.
    		// fontColor: String|dojo.Color?
    		//		The color to use for indicator label background.
    		// markerStroke: dojo.gfx.Stroke?
    		//		An optional stroke to use for indicator marker.
    		// markerOutline: dojo.gfx.Stroke?
    		//		An optional outline to use for indicator marker.
    		// markerShadow: dojo.gfx.Stroke?
    		//		An optional shadow to use for indicator marker.
    		// markerFill: dojo.gfx.Fill?
    		//		An optional fill to use for indicator marker.
    		// markerSymbol: String?
    		//		An optional symbol string to use for indicator marker.
    	};
    	=====*/

    	return declare("dojox.charting.action2d.MouseIndicator", Base, {
    		// summary:
    		//		Create a mouse indicator action. You can drag mouse over the chart to display a data indicator.

    		// the data description block for the widget parser
    		defaultParams: {
    			series: "",
    			vertical: true,
    			autoScroll: true,
    			tooltip: true,
    			fixed: true,
    			precision: 0
    		},
    		optionalParams: {
    			lineStroke: {},
    			outlineStroke: {},
    			shadowStroke: {},
    			stroke:		{},
    			outline:	{},
    			shadow:		{},
    			fill:		{},
    			fillFunc:  null,
    			labelFunc: null,
    			font:		"",
    			fontColor:	"",
    			markerStroke:		{},
    			markerOutline:		{},
    			markerShadow:		{},
    			markerFill:			{},
    			markerSymbol:		"",
    			text: null
    		},	

    		constructor: function(chart, plot, kwArgs){
    			// summary:
    			//		Create an mouse indicator action and connect it.
    			// chart: dojox/charting/Chart
    			//		The chart this action applies to.
    			// kwArgs: __MouseIndicatorCtorArgs?
    			//		Optional arguments for the chart action.
    			
    			//this._listeners = [{eventName: "onmouseover", methodName: "onMouseDown"}];
    			this._listeners = [];
    			
    			this.opt = lang.clone(this.defaultParams);
    			du.updateWithObject(this.opt, kwArgs);
    			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
    			this._uName = "mouseIndicator"+(this.opt.series?this.opt.series:this.chart.id);
    			this._handles = [];
    			this.connect();
    			this.isRendering = false;
    		},
    		
    		_disconnectHandles: function(){
    			if(has("ie")){
    				this.chart.node.releaseCapture();
    			}
    			array.forEach(this._handles, hub.disconnect);

    			this._handles = [];
    		},

    		connect: function(){
    			// summary:
    			//		Connect this action to the chart. This adds a indicator plot
    			//		to the chart that's why Chart.render() must be called after connect.
    			//this.inherited(arguments);
    			// add plot with unique name
    			console.log("MouseIndicator::connect");
    			this._listeners.push(on(this.chart.node, mouse.enter, lang.hitch(this, "onMouseEnter")));
    			this._listeners.push(on(this.chart.node, mouse.leave, lang.hitch(this, "onMouseUp")));
    			
    			this.chart.addPlot(this._uName, {type: IndicatorElement, inter: this});
    		},

    		disconnect: function(){
    			// summary:
    			//		Disconnect this action from the chart.
    			if(this._isMouseDown){
    				this.onMouseUp();
    			}
    			this.chart.removePlot(this._uName);
    			
    			this.inherited(arguments);
    			
    			array.forEach(this._listeners, function(handle){ handle.remove(); });
    			this._disconnectHandles();
    		},

    		onMouseEnter: function(event){
    			// summary:
    			//		Called when mouse is down on the chart.
    			if(!this._isMouseDown){
    				this._isMouseDown = true;
    				console.log("MouseIndicator2:onMouseEnter");
    				
    				//ff we now want to capture mouse move events everywhere to avoid
    				// stop scrolling when going out of the chart window
    				
    				if(has("ie")){
    					this._handles.push(hub.connect(this.chart.node, "onmousemove", this, "onMouseMove"));
    					this.chart.node.setCapture();
    				}else{
    					this._handles.push(hub.connect(win.doc, "onmousemove", this, "onMouseMove"));
    				}	
    				
    				this._onMouseSingle(event);
    			}
    		},

    		onMouseMove: function(event){
    			// summary:
    			//		Called when the mouse is moved on the chart.
    			if(this._isMouseDown){
    				this._onMouseSingle(event);
    			}
    		},

    		_onMouseSingle: function(event){
    			var plot = this.chart.getPlot(this._uName);
    			//TODO: use deferred instead of this flag
    			if(!this.isRendering){
    				if(plot.pageCoord == null || ( this.opt.vertical && plot.pageCoord.x != event.pageX || 
    						!this.opt.vertical && plot.pageCoord.y != event.pageY)){
    					this.isRendering = true;
    					plot.pageCoord  = {x: event.pageX, y: event.pageY};
    					plot.dirty = true;
    					this.chart.render();
    					/*
    					this.aroundRect = {type: "rect"};
    					//TODO: use round coord calculate by _IndicatorElement.
    					this.aroundRect.w = this.aroundRect.h = 1;
    					this.aroundRect.x = event.pageX;
    					this.aroundRect.y = event.pageY ;
    					// TODO: add position and correct span ltr<->rtl -> see action2d/Tooltip
    					Tooltip.show("<span dir = 'rtl'>TEST</span>", this.aroundRect);
    					*/
    					this.isRendering = false;
    				}
    			}
    			eventUtil.stop(event);
    		},

    		onMouseUp: function(event){
    			// summary:
    			//		Called when mouse is up on the chart.
    			console.log("MouseIndicator2:onMouseUp");
    			var plot = this.chart.getPlot(this._uName);
    			plot.stopTrack();
    			this._isMouseDown = false;
    			this._disconnectHandles();
    			plot.pageCoord = null;
    			plot.dirty = true;
    			this.chart.render();
    			
    			Tooltip.hide(plot.aroundRect);
    			plot.aroundRect = null;
    		}
    	});
    });
