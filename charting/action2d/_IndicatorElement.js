define(["dojo/_base/lang", 
        "dojo/_base/declare",
        "dojo/_base/array", 
        "../plot2d/Base", 
        "../plot2d/common",
        "../axis2d/common",
        "dojox/gfx",
        "dijit/Tooltip"
], function(lang, declare, array, Base, dcpc, dcac, gfx, Tooltip){

	// all the code below should be removed when http://trac.dojotoolkit.org/ticket/11299 will be available
	var getBoundingBox = function(shape){
		return getTextBBox(shape, shape.getShape().text);
	};
	var getTextBBox = function(s, t){
		var c = s.declaredClass;
		var w, h;
		if (c.indexOf("svg")!=-1){
			// try/catch the FF native getBBox error. cheaper than walking up in the DOM
			// hierarchy to check the conditions (bench show /10 )
			try {
				return lang.mixin({}, s.rawNode.getBBox());
			}catch (e){
				return null;
			}
		}else if(c.indexOf("vml")!=-1){
			var rawNode = s.rawNode, _display = rawNode.style.display;
			rawNode.style.display = "inline";
			w = gfx.pt2px(parseFloat(rawNode.currentStyle.width));
			h = gfx.pt2px(parseFloat(rawNode.currentStyle.height));
			var sz = {x: 0, y: 0, width: w, height: h};
			// in VML, the width/height we get are in view coordinates
			// in our case we don't zoom the view so that is ok
			// It's impossible to get the x/y from the currentStyle.left/top,
			// because all negative coordinates are 'clipped' to 0.
			// (x:0 + translate(-100) -> x=0
			computeLocation(s, sz);
			rawNode.style.display = _display;
			return sz;
		}else if(c.indexOf("silverlight")!=-1){
			var bb = {width: s.rawNode.actualWidth, height: s.rawNode.actualHeight};
			return computeLocation(s, bb, 0.75);
		}else if(s.getTextWidth){
			// canvas
			w = s.getTextWidth();
			var font = s.getFont();
			var fz = font ? font.size : gfx.defaultFont.size;
			h = gfx.normalizedLength(fz);
			sz = {width: w, height: h};
			computeLocation(s, sz, 0.75);
			return sz;
		}
		return null;
	};
	var computeLocation =  function(s, sz, coef){
		var width = sz.width, height = sz.height, sh = s.getShape(), align = sh.align;
		switch (align) {
		case "end":
			sz.x = sh.x - width;
			break;
		case "middle":
			sz.x = sh.x - width / 2;
			break;
		case "start":
		default:
			sz.x = sh.x;
		break;
		}
		coef = coef || 1;
		sz.y = sh.y - height*coef; // rough approximation of the ascent!...
		return sz;
	};

	return declare(Base, {
		// summary:
		//		Internal element used by indicator actions.
		// tags:
		//		private
		constructor: function(chart, kwArgs){
			if(!kwArgs){ kwArgs = {}; }
			this.inter = kwArgs.inter;
		},
		_updateVisibility: function(cp, limit, attr){
			var axis = attr == "x" ? this.inter.plot._hAxis: this.inter.plot._vAxis;
			var scale = axis.getWindowScale();
			this.chart.setAxisWindow(axis.name, scale, axis.getWindowOffset() + (cp[attr] - limit[attr]) / scale);
			this._noDirty = true;
			this.chart.render();
			this._noDirty = false;
			if(!this._tracker){
				this.initTrack();
			}
		},
		_trackMove: function(){
			// let's update the selector
			this._updateIndicator(this.pageCoord);
			// if we reached that point once, then we don't stop until mouse up
			if(this._initTrackPhase){
				this._initTrackPhase = false;
				this._tracker = setInterval(lang.hitch(this, this._trackMove), 100);
			}
		},
		initTrack: function(){
			this._initTrackPhase = true;
			this._tracker = setTimeout(lang.hitch(this, this._trackMove), 500);
		},
		stopTrack: function(){
			if(this._tracker){
				if(this._initTrackPhase){
					clearTimeout(this._tracker);
				}else{
					clearInterval(this._tracker);
				}
				this._tracker = null;
			}
		},
		render: function(){
			if(!this.isDirty()){
				return;
			}
			console.log("Indicator:render");
			this.cleanGroup();

			if (!this.pageCoord){
				return;
			}
			
			this._updateIndicator(this.pageCoord, this.secondCoord);
		},
		_updateIndicator: function(cp1, cp2){
			var inter = this.inter, 
				plot = inter.plot, 
				isVertical = inter.opt.vertical;
			var hAxis = this.chart.getAxis(plot.hAxis), 
				vAxis = this.chart.getAxis(plot.vAxis);
			var hName = hAxis.name, 
				vName = vAxis.name, 
				hBounds = hAxis.getScaler().bounds, 
				vBounds = vAxis.getScaler().bounds;
			var attr = isVertical ?"x": "y", 
				name = isVertical ? hName: vName, 
				bounds = isVertical ? hBounds: vBounds;
			
			// sort data point
			if(cp2){
				var tmp;
				if(isVertical){
					if(cp1.x > cp2.x){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}
				}else{
					if(cp1.y > cp2.y){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}
				}
			}

			var cd1 = plot.toData(cp1), cd2;
			if(cp2){
				cd2 = plot.toData(cp2);
			}
			
			var o = {};
			o[hName] = hBounds.from;
			o[vName] = vBounds.from;
			var min = plot.toPage(o);
			o[hName] = hBounds.to;
			o[vName] = vBounds.to;
			var max = plot.toPage(o);
			
			if(cd1[name] < bounds.from){
				// do not autoscroll if dual indicator
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, min, attr);
					return;
				}else{
					cp1[attr] = min[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}else if(cd1[name] > bounds.to){
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, max, attr);
					return;
				}else{
					cp1[attr] = max[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}	
			
			var data1 = this._getData(cd1, attr, isVertical), data2;
			if(!array.some(data1, function(item){ return item.y != null})){
				// we have no data for that point let's just return
				return;
			}
			
			if(cp2){
				if(cd2[name] < bounds.from){
					cp2[attr] = min[attr];
					cd2 = plot.toData(cp2);
				}else if(cd2[name] > bounds.to){
					cp2[attr] = max[attr];
					cd2 = plot.toData(cp2);	
				}
				data2 = this._getData(cd2, attr, isVertical);
				if(!array.some(data1, function(item){ return item.y != null})){
					// we have no data for that point let's pretend we have a single touch point
					cp2 = null;
				}
			}
			var coord1, coord2, t1, t2, texts = [], texts2 = [];
			array.forEach(data1, function(c1, z1){
				coord1 = this._coordToPage(c1, hName, vName);
				if(z1 == 0){
					t1 = this._renderLine(coord1, min, max);
				}
				if(!inter.opt.tooltip){
					texts.push(inter.opt.labelFunc ? 
							inter.opt.labelFunc(c1, null, inter.opt.fixed, inter.opt.precision): 
							dcpc.getLabel(isVertical? c1.y: c1.x, inter.opt.fixed, inter.opt.precision)
					);
				}
				this._renderMarker(coord1);
				
				if(cp2){
					var c2 = data2[z1];
					coord2 = this._coordToPage(c2, hName, vName);
					if(z1 == 0){
						t2 = this._renderLine(coord2, min, max);
					}
					if(!inter.opt.tooltip){
						var delta = isVertical? c2.y-c1.y: c2.x-c1.y;
						
						texts2.push(inter.opt.labelFunc ? inter.opt.labelFunc(c1, c2, inter.opt.fixed, inter.opt.precision):
							(dcpc.getLabel(delta, inter.opt.fixed, inter.opt.precision)+" ("+dcpc.getLabel(100*delta/(isVertical? c1.y: c1.x), true, 2)+"%)"));
					}
					this._renderMarker(coord2);
				}
			}, this);
			if(!inter.opt.tooltip){
				this._renderText(texts, inter, this.chart.theme, t1.x, t1.y, t1);
				if(cp2){this._renderText(texts2, inter, this.chart.theme, t2.x, t2.y, t1, t2);}
			}else{
				this.aroundRect = {type: "rect"};
				//TODO: use round coord calculate by _IndicatorElement.
				this.aroundRect.w = this.aroundRect.h = 1;
				
				var mark = {};
				mark[hName] = data1[0].x;
				mark[vName] = data1[0].y;
				mark = this.inter.plot.toPage(mark);
				
				this.aroundRect.x = mark.x;
				this.aroundRect.y = cp1.y ;
				var text = this.inter.opt.text(data1);
				// TODO: add position and correct span ltr<->rtl -> see action2d/Tooltip
				Tooltip.show("<span dir = 'ltr'>"+text+"</span>", this.aroundRect);
			}
			
			
		},
		
		_coordToPage:  function(coord, hName, vName){
			var mark = {}, 
				c = this.chart.getCoords();
			mark[hName] = coord.x;
			mark[vName] = coord.y;
			mark = this.inter.plot.toPage(mark);
	
			var cx = mark.x - c.x, 
				cy = mark.y - c.y;
			
			return {x: cx, y: cy};
		},
		
		_renderLine: function(coord, min, max){
			//Render line
			var t = this.chart.theme, 
				c = this.chart.getCoords(), 
				inter = this.inter, 
				isVertical = inter.opt.vertical,
				cx = coord.x, 
				cy = coord.y;
			
			var x1 = isVertical? cx: min.x - c.x,
				y1 = isVertical? min.y - c.y: cy,
				x2 = isVertical? x1: max.x - c.x,
				y2 = isVertical? max.y - c.y: y1;
			
			var sh = inter.opt.lineShadow? inter.opt.lineShadow: t.indicator.lineShadow,
				ls = inter.opt.lineStroke? inter.opt.lineStroke: t.indicator.lineStroke,
				ol = inter.opt.lineOutline? inter.opt.lineOutline: t.indicator.lineOutline;

			if(sh){
				this.group.createLine({x1: x1 + sh.dx, y1: y1 + sh.dy, x2: x2 + sh.dx, y2: y2 + sh.dy}).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ol);
			}
			this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ls);
			
			return isVertical? {x: x1, y: y2+5}: {x: x2+5, y: y1};
		},
		
		_renderMarker: function(coord){
			var t = this.chart.theme,
				inter = this.inter,
				cx = coord.x, 
				cy = coord.y;
			
			// Render marker
			var ms = inter.opt.markerSymbol? inter.opt.markerSymbol: t.indicator.markerSymbol,
					path = "M" + cx + " " + cy + " " + ms;
			var sh = inter.opt.markerShadow? inter.opt.markerShadow: t.indicator.markerShadow,
				ls = inter.opt.markerStroke? inter.opt.markerStroke: t.indicator.markerStroke,	
				ol = inter.opt.markerOutline? inter.opt.markerOutline: t.indicator.markerOutline;
			if(sh){
				var sp = "M" + (cx + sh.dx) + " " + (cy + sh.dy) + " " + ms;
				this.group.createPath(sp).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createPath(path).setStroke(ol);
			}
	
			var shape = this.group.createPath(path);
			var sf = this._shapeFill(inter.opt.markerFill?inter.opt.markerFill:t.indicator.markerFill, shape.getBoundingBox());
			shape.setFill(sf).setStroke(ls);
		},
		
		_renderText: function(texts, inter, t, x, y, c1, c2){
			var rect, labels = [];
			array.forEach(texts, function(text, index){
				var label = dcac.createText.gfx(
						this.chart,
						this.group,
						x, 
						rect ? y+rect.height:y,
						"middle",
						text, inter.opt.font? inter.opt.font: t.indicator.font, inter.opt.fontColor? inter.opt.fontColor: t.indicator.fontColor);
				var b = getBoundingBox(label);
				labels.push(label);
				b.x-=2; 
				b.y-=1; 
				b.width+=4; 
				b.height+=2; 
				if(index == 0){
					rect = b;
				}else{
					rect = {x: Math.min(rect.x, b.x),
							y: Math.min(rect.y, b.y),
							width: Math.max(rect.width, b.width),
							height: rect.height + b.height
					};
				}
			}, this);
			
			
			rect.r = inter.opt.radius? inter.opt.radius: t.indicator.radius;
			
			sh = inter.opt.shadow? inter.opt.shadow: t.indicator.shadow;
			ls = inter.opt.stroke? inter.opt.stroke: t.indicator.stroke;
			ol = inter.opt.outline? inter.opt.outline: t.indicator.outline;

			if(sh){
				this.group.createRect(rect).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createRect(rect).setStroke(ol);
			}
			var f = inter.opt.fillFunc? inter.opt.fillFunc(c1, c2): (inter.opt.fill? inter.opt.fill: t.indicator.fill);
			this.group.createRect(rect).setFill(this._shapeFill(f, rect)).setStroke(ls);
			array.forEach(labels, function(label){
				//console.log("label to front", label);
				label.moveToFront();
			});
		},
		_getDataPoint: function(run, seriesIndex, indexed, cd, attr, isVertical){
			// we need to find which actual data point is "close" to the data value
			var data = run.data;
			// let's consider data are sorted because anyway rendering will be "weird" with unsorted data
			// i is an index in the array, which is different from a x-axis value even for index based data
			var i, r, l = data.length;
			for (i = 0; i < l; ++i){
				r = this.inter.plot.getValue(data[i], i, seriesIndex, indexed);
				//r = data[i];
				if(r == null){
					// move to next item
				}else if(typeof r == "number"){
					if(i + 1 > cd[attr]){
						break;
					}
				}else if(r[attr] > cd[attr]){
					break;
				}
			}
			var x, y, px, py;
			if(typeof r == "number"){
				x = i+1;
				y = r;
				if(i>0){
					px = i;
					py = this.inter.plot.getValue(data[i-1], i-1, seriesIndex, indexed);
				}
			}else{
				x = r.x;
				y = r.y;
				if(i>0){
					var value = this.inter.plot.getValue(data[i-1], i-1, seriesIndex, indexed);
					px = value.x;
					py = value.y;
				}
			}
			if(i>0){
				var m = isVertical?(x+px)/2:(y+py)/2;
				if(cd[attr]<=m){
					x = px;
					y = py;
				}
			}
			return {x: x, y: y};
		},
		_getData: function(cd, attr, isVertical){
			var datas = [];
			/*
			if(this.inter.opt.series){
				var run = this.chart.getSeries(this.inter.opt.series);
				
				//To keep backward compat in case there is more than one series
				datas.push(this._getDataPoint(run, indexed, cd, attr, isVertical));
			}else{
				*/
				
				for(var j = 0 ; j < this.inter.plot.series.length; j++){
					var run = this.inter.plot.series[j];
					if(run.hide || (this.inter.opt.series && run.name != this.inter.opt.series)){
						continue;
					}
					
					var indexed = array.some(run.data, function(item){
						return typeof item == "number" || (item && !item.hasOwnProperty("x"));
					});
					
					
					datas.push(this._getDataPoint(run, j, indexed, cd, attr, isVertical));
				}
			//}
			return datas;
		},
		cleanGroup: function(creator){
			// summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			// creator: dojox/gfx/Surface?
			//		An optional surface to work with.
			// returns: dojox/charting/Element
			//		A reference to this object for functional chaining.
			this.inherited(arguments);
			// we always want to be above regular plots and not clipped
			this.group.moveToFront();
			return this;	//	dojox/charting/Element
		},
		getSeriesStats: function(){
			// summary:
			//		Returns default stats (irrelevant for this type of plot).
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(dcpc.defaultStats);
		},
		isDirty: function(){
			// summary:
			//		Return whether or not this plot needs to be redrawn.
			// returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return !this._noDirty && (this.dirty || this.inter.plot.isDirty());
		}
	});
});
