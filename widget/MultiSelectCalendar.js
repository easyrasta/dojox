define("dojox/widget/MultiSelectCalendar", [
    "dojo/main", "dijit", 
    "dojo/text!./MultiSelectCalendar/MultiSelectCalendar.html", 
    "dojo/cldr/supplemental", 
    "dojo/date", 
    "dojo/date/locale", 
    "dijit/Calendar", "dijit/_Templated", "dijit/_CssStateMixin", "dijit/form/DropDownButton", "dijit/typematic"],
    function(dojo, dijit, template) {

dojo.experimental("dojox.widget.MultiSelectCalendar");

dojo.declare(
	"dojox.widget.MultiSelectCalendar",
	[dijit.Calendar],
	{
		// summary:
		//		A simple GUI for choosing several dates in the context of a monthly calendar.
		//
		// description:
		//		A simple GUI for choosing several dates in the context of a monthly calendar.
		//		This widget serialises its selected dates to ISO dates or ISO ranges of dates, 
		//		depending on developer selection
		//		Note that it accepts an Array of ISO dates as its input
		//
		// example:
		//	|	var calendar = new dojox.widget.MultiSelectCalendar({value: ['2011-05-07,'2011-05-08',2011-05-09','2011-05-23']}, dojo.byId("calendarNode"));
		//
		// example:
		//	|	<div dojoType="dojox.widget.MultiSelectCalendar"></div>

			// value: Date
		//		The currently selected Dates, initially set to an empty object to indicate no selection.
		value: {},
	
		_areValidDates: function(/*Date*/ value){
			// summary:
			//		Runs various tests on each selected date, checking that they're a valid date, rather
			//		than blank or NaN.
			// tags:
			//		private
			for (var selDate in this.value){
				valid = (selDate && !isNaN(selDate) && typeof value == "object" && selDate.toString() != this.constructor.prototype.value.toString());
				if(!valid){ return false; }
			}
			return true;
		},

		_getValueAttr: function(){
			// summary: this method returns the list of selected dates in an array structure
			return this.value;
			
			if(this.returnIsoRanges){
				datesWithRanges = this._returnDatesWithIsoRanges(this._sort());
				return datesWithRanges;
			}else{
				return this._sort();
			}
		},
		
		_parseAndValid: function(value){
			// Could be override in case we want to manage other thing than single Date
			var values = new Array();
			if(dojo.isArray(value)) {
				dojo.forEach(value,function(element, i){
					//Each element of the array could be a date or a date range
					var slashPosition = element.indexOf("/");
					if(slashPosition == -1){
						values.push(this._patchDate(element));
					}else{
						
						//We have a slash somewhere in the string so this is an ISO date range
						var dateA=new dojo.date.stamp.fromISOString(element.substr(0,10));
						var dateB=new dojo.date.stamp.fromISOString(element.substr(11,10));
						function parseRange(begin, end, values){
							var difference = Math.abs(dojo.date.difference(begin, end, "day"));
							for(var i = 1; i <= difference; i++){
								var dd = dojo.date.add(begin, 'day', i);
								console.log("dd"+ this._patchDate(dd));
								
								values.push(this._patchDate(dd));
							}
						}
						
						if((dateA - dateB) > 0){
							dojo.hitch(this, function(){ parseRange(dateB, dateA, values)});
						}else{
							dojo.hitch(this, function(){parseRange(dateA, dateB, values)});
						}
					}
				},this);
			
			}else{
				if(typeof value == "string"){
					value = stamp.fromISOString(value);
				}
				console.log("dd"+ this._patchDate(value));
				values.push(this._patchDate(value));
			}
			var update = false,
				focus = null,
				vals =  new Array();
			
			dojo.forEach(values, function(value){
				if(this._isValidDate(value)){
					// Try to avoid re-rendering when new value is the same as old value, but be careful
					// during initialization when this.value == value even though the grid hasn't been rendered yet.
						if(!this.isDisabledDate(value, this.lang)){
							update = true;
							focus = value;
							vals.push(value);
						}
					
				}else{
					update = true;
					focus = null;
				}
			}, this);
			
			
			
			return {value: vals, update: update, focus: focus};
		},
	
//TODO: use typematic
		handleKey: function(/*Event*/ evt){
			// summary:
			//		Provides keyboard navigation of calendar.
			// description:
			//		Called from _onKeyPress() to handle keypress on a stand alone Calendar,
			//		and also from `dijit.form._DateTimeTextBox` to pass a keypress event 
			//		from the `dijit.form.DateTextBox` to be handled in this widget
			// returns:
			//		False if the key was recognized as a navigation key,
			//		to indicate that the event was handled by Calendar and shouldn't be propogated
			// tags:
			//		protected
			var dk = dojo.keys,
				increment = -1,
				interval,
				newValue = this.currentFocus;
			switch(evt.keyCode){
				case dk.RIGHT_ARROW:
					increment = 1;
					//fallthrough...
				case dk.LEFT_ARROW:
					interval = "day";
					if(!this.isLeftToRight()){ increment *= -1; }
					break;
				case dk.DOWN_ARROW:
					increment = 1;
					//fallthrough...
				case dk.UP_ARROW:
					interval = "week";
					break;
				case dk.PAGE_DOWN:
					increment = 1;
					//fallthrough...
				case dk.PAGE_UP:
					interval = evt.ctrlKey || evt.altKey ? "year" : "month";
					break;
				case dk.END:
					// go to the next month
					newValue = this.dateFuncObj.add(newValue, "month", 1);
					// subtract a day from the result when we're done
					interval = "day";
					//fallthrough...
				case dk.HOME:
					newValue = new this.dateClassObj(newValue);
					newValue.setDate(1);
					break;
				case dk.ENTER:
				case dk.SPACE:
					if(evt.shiftKey && this.previouslySelectedDay){
						this.selectingRange = true;
						this.set('endRange', newValue);
						this._selectRange();
					}else{
						this.selectingRange = false;				
						this.toggleDate(newValue,[],[]);
						//We record the selected date as the previous one 
						//In case we are selecting the first date of a range
						this.previouslySelectedDay = newValue;
						this.previousRangeStart = null;
						this.previousRangeEnd = null;
						this.onValueSelected([dojo.date.stamp.toISOString(newValue).substring(0,10)]);
						
					}
					break;
				default:
					return true;
			}

			if(interval){
				newValue = this.dateFuncObj.add(newValue, interval, increment);
			}

			this.set("currentFocus", newValue);

			return false;
		},

		_selectRange : function(){
			//This method will toggle the dates in the selected range.
			var selectedDates = []; //Will gather the list of ISO dates that are selected
			var unselectedDates = []; //Will gather the list of ISO dates that are unselected
			var beginning = this.previouslySelectedDay;
			var end = this.get('endRange');
			
			if(!this.previousRangeStart && !this.previousRangeEnd){
				removingFromRange = false;
			}else{
				if((dojo.date.compare(end, this.previousRangeStart, 'date') < 0) || (dojo.date.compare(end, this.previousRangeEnd, 'date') > 0)){
				//We are adding to range
					removingFromRange = false;
				}else{// Otherwise we are removing from the range
					removingFromRange = true;
				}
			}
			if(removingFromRange == true){
				if(dojo.date.compare(end, beginning, 'date') < 0){
					//We are removing from the range, starting from the end (Right to left)
					this._removeFromRangeRTL(beginning, end, selectedDates, unselectedDates);
				}else{
				//The end of the range is later in time than the beginning: We go from left to right
					this._removeFromRangeLTR(beginning, end, selectedDates, unselectedDates);
				}
			}else{
				//We are adding to the range
				if(dojo.date.compare(end, beginning, 'date') < 0){
					this._addToRangeRTL(beginning, end, selectedDates, unselectedDates);
				}else{
					this._addToRangeLTR(beginning, end, selectedDates, unselectedDates);
				}
			}
			//We call the extension point with the changed dates
			if(selectedDates.length > 0){
				this.onValueSelected(selectedDates);
			}
			if(unselectedDates.length > 0){
				this.onValueUnselected(unselectedDates);
			}
			this.rangeJustSelected = true; //Indicates that we just selected a range.
		},

		_isSelectedDate: function(/*Date*/ dateObject, /*String?*/ locale){
			// summary:
			//		Returns true if the passed date is part of the selected dates of the calendar
			var contains = false;
			dojo.forEach(this.get("value"), function(item){
				console.log("item "+item);
				console.log("item "+dateObject);
				console.log("comp", !dojo.date.compare(item, dateObject, "date"));
				if(!dojo.date.compare(item, dateObject, "date"))return true;
			});
			return false;
		},

		_sort : function(){
			//This function returns a sorted version of the value array that represents the selected dates.
			if(this.value == {}){return [];}
			//We create an array of date objects with the dates that were selected by the user.
			var selectedDates = [];
			for (var selDate in this.value){
				selectedDates.push(selDate);
			}
			//Actual sorting
			selectedDates.sort(function(a, b){
				var dateA=new Date(a), dateB=new Date(b);
				return dateA-dateB;
			});
			return selectedDates;
		},
		_returnDatesWithIsoRanges : function(selectedDates /*Array of sorted ISO dates*/){
		//this method receives a sorted array of dates and returns an array of dates and date ranges where
		//such range exist. For instance when passed with selectedDates = ['2010-06-14', '2010-06-15', '2010-12-25']
		//it would return [2010-06-14/2010-06-15,  '2010-12-25']
		var returnDates = [];
		if(selectedDates.length > 1){
			//initialisation
			var weHaveRange = false,
				rangeCount = 0,
				startRange = null,
				lastDayRange = null,
				previousDate = dojo.date.stamp.fromISOString(selectedDates[0]);
			
			for(var i = 1; i < selectedDates.length+1; i++){
				currentDate = dojo.date.stamp.fromISOString(selectedDates[i]);
				if(weHaveRange){
				//We are in the middle of a range				
					difference = Math.abs(dojo.date.difference(previousDate, currentDate, "day"));
					if(difference == 1){
						//we continue with the range
						lastDayRange = currentDate;
					}else{
						//end of the range, reset variables for maybe the next range..
						range = dojo.date.stamp.toISOString(startRange).substring(0,10)
								+ "/" + dojo.date.stamp.toISOString(lastDayRange).substring(0,10);
						returnDates.push(range);
						weHaveRange = false;
					}
				}else{
					//We are not in a range to begin with
					difference = Math.abs(dojo.date.difference(previousDate, currentDate, "day"));
					if(difference == 1){
						//These are two consecutive dates: This is a range!
						weHaveRange = true;
						startRange = previousDate;
						lastDayRange = currentDate;
					}else{
						//this is a standalone date
						returnDates.push(dojo.date.stamp.toISOString(previousDate).substring(0,10));
					}
				}
				previousDate = currentDate;
			}
			return returnDates;
		}else{
			//If there's only one selected date we return only it
				return selectedDates;
			}
		}
	}	
);


return dojox.widget.MultiSelectCalendar;
});
