// ## Randomization functions

// Get a random integer less than n
// courtesy of L Ouyang
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization
// courtesy of L Ouyang
function randomElement(array) {
  return array[randomInteger(array.length)];
}

// Do "deterministic randomization" based on the last character of the worker id
// courtesy of L Ouyang
turkRandom = function(array, id) {
  var allTails = ["4","9","F","Z","H","1","U","A","8","P","Q","C","S","M","L","E","3","N","V","O","B","7","D","2","K","W","J","X","R","I","5","0","T","G","6","Y"]; //shuffled
  
  if (typeof id === "undefined" || id.length == 0) {
    id = allTails[Math.round(Math.random() * allTails.length)]
  }
  
  var n = array.length,
  tail = id.split("")[id.length - 1], // split() appeases IE
  dict = {}; // maps a tail onto an array index
  
  for(var i = 0 ; i < allTails.length; i++) {
    var t = allTails[i];
    dict[t] = i % n;
  }
  
  return array[dict[tail]];
}

// Fisher Yates algorithm for random shuffling
// source: http://sedition.com/perl/javascript-fy.html
function fisherYates ( myArray ) {
  var i = myArray.length;
  if ( i == 0 ) return false;
  while ( --i ) {
    var j = Math.floor( Math.random() * ( i + 1 ) );
    var tempi = myArray[i];
    var tempj = myArray[j];
    myArray[i] = tempj;
    myArray[j] = tempi;
  }
}


    
// ## Date functions for managing delay codes
    
// Convert a date object into a string for retrieval code
function dateToCode( theDate ) {
  
  var year = theDate.getFullYear();
  var month = String('00' + theDate.getMonth()).slice(-2);
  var date = String('00' + theDate.getDate()).slice(-2);
  var hour = String('00' + theDate.getHours()).slice(-2);
  var minute = String('00' + theDate.getMinutes()).slice(-2);
      
  var dateCode = minute + hour + date + month + year;
  return dateCode;
      
}
    
// Convert a date object into a string for display
function dateToString( theDate ) {
      
  var year = theDate.getFullYear();
  var month = String('00' + (theDate.getMonth()+1)).slice(-2);
  var date = String('00' + theDate.getDate()).slice(-2);
  var hour = String('00' + theDate.getHours()).slice(-2);
  var minute = String('00' + theDate.getMinutes()).slice(-2);
      
  var dateString = month + '/' + date + '/' + year + ' at ' + hour + ':' + minute;
  return dateString;
      
}

// Convert code to date object
// assuming input already correct (e.g., validated in ("form").submit())
function codeToDate( theCode ) {
  
  var minute = theCode.slice(0,2);
  var hour = theCode.slice(2,4);
  var date = theCode.slice(4,6);
  var month = theCode.slice(6,8);
  var year = theCode.slice(-4);
  
  if (year != 2015 || month > 11 || date > 31 || hour > 24 || minute > 60) { return 0; }
  
  var theDate = new Date(year, month, date, hour, minute);
  return theDate;
  
}
    
// ## Experiment functions

// Shows slides
// courtesy of L Ouyang
function showSlide(id) {
  // Hide all slides
  $(".slide").hide();
  // Show just the slide we want to show
  $("#"+id).show();
}

// Preload function

// function called after each image is loaded
var numLoadedImages = 0;
function onLoadedOne() {
  numLoadedImages++;
  $("#num-loaded").text(numLoadedImages);
}

function preload(images, onLoadedOne, onLoadedAll) {
  
  var remainingImages = images.slice();
  var finished = false;
  
  // How long to wait in between loading images
  var loadDelayInterval = 0;
  
  var worker = function() {
    
    if (remainingImages.length == 0) {
      if (!finished) {
        finished = true;
        setTimeout(onLoadedAll, loadDelayInterval);
      }
    } else {
      
      var src = remainingImages.shift();
      
      var image = new Image();
      image.onload = function() {
        onLoadedOne();
        setTimeout(worker, loadDelayInterval);
      };
      image.src = src;
    }
    
  };
  
  // Load images 6 at a time
  var concurrent = 6;
  for(var i = 0; i < concurrent; i++) {
    setTimeout(worker, 20 - i);
  };
  
}