define(["dojo/_base/declare", "./Columns", "./commonStacked"], 
	function( declare, Columns, commonStacked){
	return declare("dojox.charting.plot2d.StackedColumns", Columns, {
		// summary:
		//		The plot object representing a stacked column chart (vertical bars).
		getSeriesStats: function(){
			// summary:
			//		Calculate the min/max on all attached series in both directions.
			// returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = commonStacked.collectStats(this.series);
			this._maxRunLength = stats.hmax;
			return this._adjustStats(stats); // Object
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
				x = value.x !==null ? value.x - 1: index;
				y = commonStacked.getValue(this.series, indexSerie, value.x);
/*
		getValue: function(value, index, seriesIndex, indexed){
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
