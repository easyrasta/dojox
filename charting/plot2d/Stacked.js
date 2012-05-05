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
		
		getSeriesValue: function(i, index){
			var value = 0, v, j;
			for(j = 0; j <= i; ++j){
				v = this.series[j].data[index];
				if(v !== null){
					value += v;
				}
			}
			
			return value;
		}
	});
});
