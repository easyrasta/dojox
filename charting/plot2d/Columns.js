define(["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./CartesianBase", "./_PlotEvents", "./common",
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, arr, declare, CartesianBase, _PlotEvents, dc, df, dfr, du, fx){

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Columns", [CartesianBase, _PlotEvents], {
		// summary:
		//		The plot object representing a column chart (vertical bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null,  // animate bars into place
			enableCache: false
		},
		optionalParams: {
			minBarSize:	1,	// minimal column width in pixels
			maxBarSize:	1,	// maximal column width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			styleFunc:  null,
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			// summary:
			//		The constructor for a columns chart.
			// chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			// kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			// summary:
			//		Calculate the min/max on all attached series in both directions.
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series);
			return this._adjustStats(stats);
		},
		
		_adjustStats: function(stats){
			if(this._hScaler){
				var bar = this.getBarProperties();
				console.log("getSeriesStats::width", bar.width);
				var width = this._hScaler.scaler.getTransformerFromPlot(this._hScaler)(bar.width*bar.clusterSize)
				if(width < stats.hmax){
					stats.hmin -= width/2;
					stats.hmax += width/2;
					return stats;
				}
			}
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},
		
		createRect: function(run, creator, params){
			var rect;
			if(this.opt.enableCache && run._rectFreePool.length > 0){
				rect = run._rectFreePool.pop();
				rect.setShape(params);
				// was cleared, add it back
				creator.add(rect);
			}else{
				rect = creator.createRect(params);
			}
			if(this.opt.enableCache){
				run._rectUsePool.push(rect);
			}
			return rect;
		},

		render: function(dim, offsets){
			// summary:
			//		Run the calculations for any axes for this plot.
			// dim: Object
			//		An object in the form of { width, height }
			// offsets: Object
			//		An object of the form { l, r, t, b}.
			// returns: dojox.charting.plot2d.Columns
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			// TODO do we need to call this? This is not done in Bars.js
			this.getSeriesStats();
			this.resetEvents();
			this.dirty = this.isDirty();
			var s;
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				min = Math.max(0, Math.floor(this._hScaler.bounds.from - 1)),
				events = this.events();
			var bar = this.getBarProperties();
			var length = this.series.length; 
			arr.forEach(this.series, function(serie){if(serie.hide){length--;}}); 
			var z = length; 

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._rectFreePool = (run._rectFreePool?run._rectFreePool:[]).concat(run._rectUsePool?run._rectUsePool:[]);
					run._rectUsePool = [];
				}
				var theme = t.next("column", [this.opt, run])
					eventSeries = new Array(run.data.length);
				
				 if(run.hide){ 
					 run.dyn.fill = theme.series.fill; 
					 continue; 
				} 
				z--; 
				s = run.group;
				var l = this.getDataLength(run);
				var indexed = arr.some(run.data, function(item){
					return typeof item == "number" || (item && !item.hasOwnProperty("x"));
				});
				console.log("width", bar.width);
				console.log("offsets.l", offsets.l);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value != null){
						var val = this.getValue(value, j, i, indexed),
							vv = vt(val.y),
							h = Math.abs(vv - baselineHeight), 
							finalTheme,
							sshape;
						
						if(this.opt.styleFunc || typeof value != "number"){
							var tMixin = typeof value != "number" ? [value] : [];
							if(this.opt.styleFunc){
								tMixin.push(this.opt.styleFunc(value));
							}
							finalTheme = t.addMixin(theme, "column", tMixin, true);
						}else{
							finalTheme = t.post(theme, "column");
						}
						console.log("bar.thickness", bar.thickness);
						if(bar.width >= 1 && h >= 0){
							var rect = {
								//x: offsets.l - (bar.width - bar.gap - ht(0.5))/2 + ht(val.x + 0.5)  + bar.gap/2 + bar.thickness * i ,
								x: offsets.l-1.5 + ht(val.x+1) - (bar.width/2) + (bar.gap/2) - bar.thickness*(length-1)/2  + bar.thickness * z,
								y: dim.height - offsets.b - (val.y > baseline ? vv : baselineHeight),
								width: bar.width - bar.gap/2, 
								height: h
							};
							
							console.log(" ht(val.x + 0.5)", ht(val.x + 0.5));
							console.log(" ht(val.x+1)", ht(val.x +1));
							console.log("bar.gap", bar.gap);
							console.log("rect", rect);
							
							if(finalTheme.series.shadow){
								var srect = lang.clone(rect);
								srect.x += finalTheme.series.shadow.dx;
								srect.y += finalTheme.series.shadow.dy;
								sshape = this.createRect(run, s, srect).setFill(finalTheme.series.shadow.color).setStroke(finalTheme.series.shadow);
								if(this.animate){
									this._animateColumn(sshape, dim.height - offsets.b + baselineHeight, h);
								}
							}
							
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = this.createRect(run, s, rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									shadow:  sshape,
									x:       val.x + 0.5,
									y:       val.y
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Columns
		},
		
		getDataLength: function(run){
			return Math.min(run.data.length, Math.ceil(this._hScaler.bounds.to));
		},
		getValue: function(value, j, seriesIndex, indexed){
			var y,x;
			if(indexed){
				if(typeof value == "number"){
					y = value;
				}else{
					y = value.y;
				}
				x = j;
			}else{
				y = value.y;
				x = value.x - 1;
			}
			return {y:y, x:x};
		},
		
		_getDelta: function(){
			var delta = Number.MAX_VALUE;
			
			for(var i = 0; i < this.series.length; ++i){
				var serie = this.series[i];
				if(serie.hide){
					continue;
				}
				var previousData = null;
				for(var j = 0; j < serie.data.length; ++j){
					var data = serie.data[j];
					if(typeof data == "number"){
						delta = this._hScaler.scaler.getTransformerFromPlot(this._hScaler)(this._hScaler.bounds.scale);
						break;
					}
					if(!previousData){
						previousData = data;
					}else{
						if(data){
							var tdelta = data.x - previousData.x;
							console.log("tdelta", tdelta);
							delta = Math.min(delta, tdelta);
							previousData = data;
						}
					}
				}
			}
			return delta;
		},
		
		getBarProperties: function(){
			console.log("scale", this._hScaler.bounds.scale);
			
			/*
			arr.forEach(this.series, function(serie){
				if(!serie.hide){
					
					arr.forEach(serie.data, function(data){
						if(!previousData){
							previousData = data;
						}else{
							if(data){
								var tdelta = data.x - previousData.x;
								console.log("tdelta", tdelta);
								delta = Math.min(delta, tdelta);
								previousData = data;
							}
						}
					});
				}
			});
			*/
			var delta = this._getDelta();
			console.log("delta", delta);
			//var f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			//var f = dc.calculateBarSize(this._hScaler.scaler.getTransformerFromModel(this._hScaler)(this._hScaler.bounds.to)/this.series[0].data.length, this.opt);
			var f = dc.calculateBarSize(this._hScaler.scaler.getTransformerFromModel(this._hScaler)(delta), this.opt);
			return {gap: f.gap, width: f.size, thickness: 0, clusterSize: 1};
		},
		
		_animateColumn: function(shape, voffset, vsize){
			if(vsize==0){
				vsize = 1;
			}
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
		
	});
});
