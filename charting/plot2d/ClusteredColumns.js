define(["dojo/_base/declare", "dojo/_base/array", "./Columns", "./common"], 
	function(declare, array, Columns, dc){
	return declare("dojox.charting.plot2d.ClusteredColumns", Columns, {
		
		getBarProperties: function(){
			var length = this.series.length;
			array.forEach(this.series, function(serie){if(serie.hide){length--;}});
			
			//var f = dc.calculateBarSize(this._hScaler.scaler.getTransformerFromModel(this._hScaler)(this._hScaler.bounds.to)/this.series[0].data.length, this.opt, length);
			
			var f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt, length);

			return {gap: f.gap, width: f.size, thickness: f.size};
		}
	});
});
