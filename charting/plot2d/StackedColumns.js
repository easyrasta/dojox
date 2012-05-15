define(["dojo/_base/declare", "./Columns", "./commonStacked"], 
	function( declare, Columns, commonStacked){

/*=====
var Columns = dojox.charting.plot2d.Columns;
=====*/
	return declare("dojox.charting.plot2d.StackedColumns", Columns, {
		//	summary:
		//		The plot object representing a stacked column chart (vertical bars).
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = commonStacked.collectStats(this.series);
			this._maxRunLength = stats.hmax;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
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
				y = y ? y.y: null;
			}
			return {y:y, x:x};
		}
	});
});
