define(["dojo/_base/declare", "./Bars", "./commonStacked"], 
	function(declare, Bars, commonStacked){
	return declare("dojox.charting.plot2d.StackedBars", Bars, {
		// summary:
		//		The plot object representing a stacked bar chart (horizontal bars).
		getSeriesStats: function(){
			// summary:
			//		Calculate the min/max on all attached series in both directions.
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = commonStacked.collectStats(this.series), t;
			this._maxRunLength = stats.hmax;
			stats = this._adjustStats(stats);
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats; // Object
		},
		
		getDataLength: function(run){
			return this._maxRunLength;
		},

		getValue: function(value, index, indexSerie){
			var y,x;
			if(typeof value == "number"){
				x = index;
				y = commonStacked.getIndexValue(this.series, indexSerie, x);
			}else{
				x = value.x ? value.x - 1: index;
				y = commonStacked.getValue(this.series, indexSerie, value.x);

		/*getValue: function(value, index, seriesIndex, indexed){
			var y,x;
			if(indexed){
				x = index;
				y = commonStacked.getIndexValue(this.series, seriesIndex, x);
			}else{
				x = value.x - 1;
				y = commonStacked.getValue(this.series, seriesIndex, value.x);
				*/
				y = y ? y.y: null;
			}
			return {y:y, x:x};
		}
	});
});
