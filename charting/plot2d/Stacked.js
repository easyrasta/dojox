define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "./Default", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/functional/sequence"], 
	function(lang, declare, arr, Default, dc, df, dfr, dfs){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.Stacked", Default, {
		//	summary:
		//		Like the default plot, Stacked sets up lines, areas and markers
		//		in a stacked fashion (values on the y axis added to each other)
		//		as opposed to a direct one.
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series);
			this._maxRunLength = stats.hmax;
			return stats;
		},
		
		buildSegments: function(i, indexed){
			var run = this.series[i],
				min = indexed?Math.max(0, Math.floor(this._hScaler.bounds.from - 1)):0, 
				max = indexed?Math.min(run.data.length, Math.ceil(this._hScaler.bounds.to)):Math.ceil(this._hScaler.bounds.to),
				rseg = null, segments = [];

			// split the run data into dense segments (each containing no nulls)
			// except if interpolates is false in which case ignore null between valid data
			for(var j = min; j <= max; j++){
				var value = indexed ? this.getCumulIndexValue(i, j) : this.getCumulValue(i, j);
				if(value != null && (indexed || value.y != null)){
					if(!rseg){
						rseg = [];
						segments.push({index: j, rseg: rseg});
					}
					rseg.push(value);
				}else{
					if(!this.opt.interpolate || indexed){
						// we break the line only if not interpolating or if we have indexed data
						rseg = null;
					}
				}
			}
			return segments;
		},
		
		getCumulIndexValue: function(i, index){
			var value = 0, v, j;
			for(j = 0; j <= i; ++j){
				v = this.series[j].data[index];
				if(v !== null){
					if(isNaN(v)){ v = 0; }
					value += v;
				}
			}
			return value;
		},
		
		getCumulValue: function(i, x){
			var value = null, j, z;
			for(j = 0; j <= i; ++j){
				for(z = 0; z < this.series[j].data.length; z++){
					v = this.series[j].data[z];
					if(v !== null)
						if(v.x == x){
							if(!value)value = {x: x};
							if(v.y !=null){
								if(value.y == null)value.y = 0;
								value.y += v.y;
							}
							break;
						}else if(v.x > x)break;
				}
			}
			return value;
		}
	});
});
