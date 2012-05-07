define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", 
		"./CartesianBase", "./_PlotEvents", "./common", "dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"],
	function(lang, declare, arr, CartesianBase, _PlotEvents, dc, df, dfr, du, fx){

	/*=====
	dojo.declare("dojox.charting.plot2d.__DefaultCtorArgs", dojox.charting.plot2d.__PlotCtorArgs, {
		//	summary:
		//		The arguments used for any/most plots.
	
		//	hAxis: String?
		//		The horizontal axis name.
		hAxis: "x",
	
		//	vAxis: String?
		//		The vertical axis name
		vAxis: "y",
	
		//	lines: Boolean?
		//		Whether or not to draw lines on this plot.  Defaults to true.
		lines:   true,
	
		//	areas: Boolean?
		//		Whether or not to draw areas on this plot. Defaults to false.
		areas:   false,
	
		//	markers: Boolean?
		//		Whether or not to draw markers at data points on this plot. Default is false.
		markers: false,
	
		//	tension: Number|String?
		//		Whether or not to apply 'tensioning' to the lines on this chart.
		//		Options include a number, "X", "x", or "S"; if a number is used, the
		//		simpler bezier curve calculations are used to draw the lines.  If X, x or S
		//		is used, the more accurate smoothing algorithm is used.
		tension: "",
	
		//	animate: Boolean?
		//		Whether or not to animate the chart to place.
		animate: false,
	
		//	stroke: dojox.gfx.Stroke?
		//		An optional stroke to use for any series on the plot.
		stroke:		{},
	
		//	outline: dojox.gfx.Stroke?
		//		An optional stroke used to outline any series on the plot.
		outline:	{},
	
		//	shadow: dojox.gfx.Stroke?
		//		An optional stroke to use to draw any shadows for a series on a plot.
		shadow:		{},
	
		//	fill: dojox.gfx.Fill?
		//		Any fill to be used for elements on the plot (such as areas).
		fill:		{},

		//	styleFunc: Function?
		//		A function that returns a styling object for the a given data item.
		styleFunc:	null,
	
		//	font: String?
		//		A font definition to be used for labels and other text-based elements on the plot.
		font:		"",
	
		//	fontColor: String|dojo.Color?
		//		The color to be used for any text-based elements on the plot.
		fontColor:	"",
	
		//	markerStroke: dojo.gfx.Stroke?
		//		An optional stroke to use for any markers on the plot.
		markerStroke:		{},
	
		//	markerOutline: dojo.gfx.Stroke?
		//		An optional outline to use for any markers on the plot.
		markerOutline:		{},
	
		//	markerShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for any markers on the plot.
		markerShadow:		{},
	
		//	markerFill: dojo.gfx.Fill?
		//		An optional fill to use for any markers on the plot.
		markerFill:			{},
	
		//	markerFont: String?
		//		An optional font definition to use for any markers on the plot.
		markerFont:			"",
	
		//	markerFontColor: String|dojo.Color?
		//		An optional color to use for any marker text on the plot.
		markerFontColor:	"",
		
		//	enableCache: Boolean?
		//		Whether the markers are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering.  Default false.
		enableCache: false

		//	interpolate: Boolean?
		//		Whether when there is a null data point in the data the plot interpolates it or if the lines is split at that
		//		point.	Default false.
		interpolate: false
	});
	
	var CartesianBase = dojox.charting.plot2d.CartesianBase;
	var _PlotEvents = dojox.charting.plot2d._PlotEvents;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	var DEFAULT_ANIMATION_LENGTH = 1200;	// in ms

	return declare("dojox.charting.plot2d.Default", [CartesianBase, _PlotEvents], {
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			lines:   true,	// draw lines
			areas:   false,	// draw areas
			markers: false,	// draw markers
			tension: "",	// draw curved lines (tension is "X", "x", or "S")
			animate: false, // animate chart to place
			enableCache: false,
			interpolate: false
		},
		optionalParams: {
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			styleFunc: null,
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerFont:			"",
			markerFontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Return a new plot.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		An optional arguments object to help define this plot.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;

			// animation properties
			this.animate = this.opt.animate;
		},

		createPath: function(run, creator, params){
			var path;
			if(this.opt.enableCache && run._pathFreePool.length > 0){
				path = run._pathFreePool.pop();
				path.setShape(params);
				// was cleared, add it back
				creator.add(path);
			}else{
				path = creator.createPath(params);
			}
			if(this.opt.enableCache){
				run._pathUsePool.push(path);
			}
			return path;
		},

		render: function(dim, offsets){
			//	summary:
			//		Render/draw everything on this plot.
			//	dim: Object
			//		An object of the form { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b }
			//	returns: dojox.charting.plot2d.Default
			//		A reference to this plot for functional chaining.

			// make sure all the series is not modified
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}

			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				this.group.setTransform(null);
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, events = this.events();

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				console.log("render Serie "+i, run);
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._pathFreePool = (run._pathFreePool?run._pathFreePool:[]).concat(run._pathUsePool?run._pathUsePool:[]);
					run._pathUsePool = [];
				}
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				var theme = t.next(this.opt.areas ? "area" : "line", [this.opt, run], true),
					lpoly, height = dim.height - offsets.b,
					ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
					vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler);
				this._eventSeries[run.name] = new Array(run.data.length);
				
				// optim works only for index based case
				var indexed = arr.some(run.data, function(item){
					return typeof item == "number";
				});
				
				var segments = this.buildSegments(i, indexed);
				for(var seg = 0; seg < segments.length; seg++){
					lpoly = this.buildPoly(segments[seg], ht, vt, height, offsets);
					if(indexed){
						seg = this.interpolatePoly(lpoly, segments, seg, ht, vt, height, offsets);
					}
					var lpath = this.opt.tension ? dc.curve(lpoly, this.opt.tension) : "";

					this.renderArea(theme, run, lpoly, lpath, height);
					this.renderLines(theme, run, lpoly, lpath);
					this.renderMarkers(theme, lpoly, events, run, segments[seg]);
				}
				run.dirty = false;
			}
			
			this.animateRenderer(dim.height - offsets.b);
			
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Default
		},
		
		buildSegments: function(i, indexed){
			var run = this.series[i],
				min = indexed?Math.max(0, Math.floor(this._hScaler.bounds.from - 1)):0, 
				max = indexed?Math.min(run.data.length, Math.ceil(this._hScaler.bounds.to)):run.data.length,
				rseg = null, segments = [];

			// split the run data into dense segments (each containing no nulls)
			// except if interpolates is false in which case ignore null between valid data
			for(var j = min; j < max; j++){
				if(run.data[j] != null && (indexed || run.data[j].y != null)){
					if(!rseg){
						rseg = [];
						segments.push({index: j, rseg: rseg});
					}
					rseg.push(this.getSeriesValue(i, j, indexed));
				}else{
					if(!this.opt.interpolate || indexed){
						// we break the line only if not interpolating or if we have indexed data
						rseg = null;
					}
				}
			}
			return segments;
		},
		
		getSeriesValue: function(i, index, indexed){
			return this.series[i].data[index];
		},
		
		interpolatePoly: function(lpoly, segments, seg, ht, vt, height, offsets){
			// if we are indexed & we interpolate we need to put all the segments as a single one now
			if(this.opt.interpolate){
				while(seg < segments.length) {
					seg++;
					lpoly = lpoly.concat(arr.map(segments[seg].rseg, function(v, i){
						return {
							x: ht(i + segments[seg].index + 1) + offsets.l,
							y: height - vt(v),
							data: v
						};
					}, this));
				}
			}
			return seg;
		},
		
		buildPoly: function(segment, ht, vt, height, offsets){
			var lpoly;
			if(typeof segment.rseg[0] == "number"){
				lpoly = arr.map(segment.rseg, function(v, i){
					return {
						x: ht(i + segment.index + 1) + offsets.l,
						y: height - vt(v),
						data: v
					};
				}, this);
			}else{
				lpoly = arr.map(segment.rseg, function(v){
					return {
						x: ht(v.x) + offsets.l,
						y: height - vt(v.y),
						data: v
					};
				}, this);
			}
			return lpoly;
		},
		
		renderArea: function(theme, run, lpoly, lpath, height){
			if(this.opt.areas && lpoly.length > 1){
				var fill = theme.series.fill;
				var apoly = lang.clone(lpoly);
				if(this.opt.tension){
					var apath = "L" + apoly[apoly.length-1].x + "," + height +
						" L" + apoly[0].x + "," + height +
						" L" + apoly[0].x + "," + apoly[0].y;
					run.dyn.fill = run.group.createPath(lpath + " " + apath).setFill(fill).getFill();
				} else {
					apoly.push({x: lpoly[lpoly.length - 1].x, y: height});
					apoly.push({x: lpoly[0].x, y: height});
					apoly.push(lpoly[0]);
					run.dyn.fill = run.group.createPolyline(apoly).setFill(fill).getFill();
				}
			}
		},
		
		renderLines: function(theme, run, lpoly, lpath){
			if(this.opt.lines){
				// need a stroke
				var stroke = theme.series.stroke,
				s = run.group,
				outline = null;
				if(theme.series.outline){
					outline = run.dyn.outline = dc.makeStroke(theme.series.outline);
					outline.width = 2 * outline.width + stroke.width;
				}
				if(lpoly.length > 1){
					if(theme.series.shadow){
						var shadow = theme.series.shadow,
						spoly = arr.map(lpoly, function(c){
							return {x: c.x + shadow.dx, y: c.y + shadow.dy};
						});
						if(this.opt.tension){
							run.dyn.shadow = s.createPath(dc.curve(spoly, this.opt.tension)).setStroke(shadow).getStroke();
						} else {
							run.dyn.shadow = s.createPolyline(spoly).setStroke(shadow).getStroke();
						}
					}
				
					if(outline){
						if(this.opt.tension){
							run.dyn.outline = s.createPath(lpath).setStroke(outline).getStroke();
						} else {
							run.dyn.outline = s.createPolyline(lpoly).setStroke(outline).getStroke();
						}
					}
					if(this.opt.tension){
						run.dyn.stroke = s.createPath(lpath).setStroke(stroke).getStroke();
					} else {
						run.dyn.stroke = s.createPolyline(lpoly).setStroke(stroke).getStroke();
					}
				}
			}
		},
		
		renderMarkers: function(theme, lpoly, events, run, segments){
			var markerTheme = theme;
			if(this.opt.markers){
				var frontMarkers = new Array(lpoly.length),
				outlineMarkers = new Array(lpoly.length),
				outline = null;
				run.dyn.marker = theme.symbol;
				
				var shadowMarkers = null;
				if(theme.series.stroke && lpoly.length > 1 && theme.marker.shadow){
					var spoly = arr.map(lpoly, function(c){
						return {x: c.x + theme.series.shadow.dx, y: c.y + theme.series.shadow.dy};
					});
					shadowMarkers = arr.map(spoly, function(c){
						return this.createPath(run, run.group, "M" + c.x + " " + c.y + " " + theme.symbol).
							setStroke(theme.marker.shadow).setFill(theme.marker.shadow.color);
					}, this);
				}
				
				if(markerTheme.marker.outline){
					outline = dc.makeStroke(markerTheme.marker.outline);
					outline.width = 2 * outline.width + (markerTheme.marker.stroke ? markerTheme.marker.stroke.width : 0);
				}
				
				arr.forEach(lpoly, function(c, i){
					if(this.opt.styleFunc || typeof c.data != "number"){
						var tMixin = typeof c.data != "number" ? [c.data] : [];
						if(this.opt.styleFunc){
							tMixin.push(this.opt.styleFunc(c.data));
						}
						markerTheme = this.chart.theme.addMixin(theme, "marker", tMixin, true);
					}else{
						markerTheme = this.chart.theme.post(theme, "marker");
					}
					var path = "M" + c.x + " " + c.y + " " + markerTheme.symbol;
					if(outline){
						outlineMarkers[i] = this.createPath(run, run.group, path).setStroke(outline);
					}
					frontMarkers[i] = this.createPath(run, run.group, path).setStroke(markerTheme.marker.stroke).setFill(markerTheme.marker.fill);
				}, this);
				
				run.dyn.markerFill = markerTheme.marker.fill;
				run.dyn.markerStroke = markerTheme.marker.stroke;
				if(events){
					arr.forEach(frontMarkers, function(s, i){
						var o = {
							element: "marker",
							index:   i + segments.index,
							run:     run,
							shape:   s,
							outline: outlineMarkers[i] || null,
							shadow:  shadowMarkers && shadowMarkers[i] || null,
							cx:      lpoly[i].x,
							cy:      lpoly[i].y
						};
						if(typeof segments.rseg[0] == "number"){
							o.x = i + segments.index + 1;
							o.y = segments.rseg[i];
						}else{
							o.x = segments.rseg[i].x;
							o.y = segments.rseg[i].y;
						}
						this._connectEvents(o);
						this._eventSeries[run.name][i + segments.index] = o;
					}, this);
				}else{
					delete this._eventSeries[run.name];
				}
			}
		},
		
		animateRenderer: function(height){
			if(this.animate){
				// grow from the bottom
				var plotGroup = this.group;
				fx.animateTransform(lang.delegate({
					shape: plotGroup,
					duration: DEFAULT_ANIMATION_LENGTH,
					transform:[
						{name:"translate", start: [0, height], end: [0, 0]},
						{name:"scale", start: [1, 0], end:[1, 1]},
						{name:"original"}
					]
				}, this.animate)).play();
			}
		}
	});
});
