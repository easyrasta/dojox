define(["dojo/_base/declare", "dojo/_base/array", "./Bars", "./common"], 
	function(declare, array, Bars, dc){
	return declare("dojox.charting.plot2d.ClusteredBars", Bars, {
		// summary:
		//		A plot representing grouped or clustered bars (horizontal bars)
		getBarProperties: function(){
			var length = this.series.length;
			array.forEach(this.series, function(serie){if(serie.hide){length--;}});
			
			var delta = this._getDelta();
			//var f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt, length);
			//console.log("bar", f);
			
			var f = dc.calculateBarSize(this._vScaler.scaler.getTransformerFromModel(this._vScaler)(delta), this.opt, length);
			//console.log("scaler.bounds.from", );
		  
			return {gap: f.gap, height: f.size, thickness: f.size, clusterSize: length};
		}
		
	});
});
