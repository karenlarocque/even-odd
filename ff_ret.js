// ## High-level overview
// Things happen in this order:
// 
// 1. Set up the experiment sequence object.
// 2. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 3. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 4. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, and sets up a listener for a key press.
// 5. The mouse click listener, when it detects a click, constructs a data object, which includes the presented stimulus, which version was selected, and RT (current time - start time). This entire object gets pushed into the <code>experiment.data</code> array. Then we show a blank screen and wait 500 milliseconds before calling <code>experiment.next()</code> again.

// ## Helper functions

// Shows slides
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
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

// Convert code to date object
// assuming input already correct (validated in ("form").submit())
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

// Convert a date object into a string for checkin code
function dateToCode( theDate ) {
  
  var year = theDate.getFullYear();
  var month = String('00' + theDate.getMonth()).slice(-2);
  var date = String('00' + theDate.getDate()).slice(-2);
  var hour = String('00' + theDate.getHours()).slice(-2);
  var minute = String('00' + theDate.getMinutes()).slice(-2);
  
  var dateCode = minute + hour + date + month + year;
  return dateCode;
  
}

var code = "";
// ## Code validation
$("form").submit( function (){
                 
                 $("#validated").text("")
                 code = $("#getcode")[0].elements["code"].value; //global scope, try to fix later
                 
                 // is the format valid
                 if (code.length == 33 &&
                     code.slice(0,4) == "8302" &&
                     (code.slice(-5) == "2153s" || code.slice(-5) == "2153l") &&
                     !isNaN(code.slice(0,-1))){
                 

                   var startDate = codeToDate(code.slice(4,16))
                   var endDate = codeToDate(code.slice(16,28))
                   var curDate = new Date();
                 
                   // does the format contain two valid dates
                   if (startDate && endDate && startDate < endDate) {
                 
                     // too soon
                     if (startDate > curDate){
                 
                       $("#validated").text("This code is only valid for use between " + dateToString(startDate) + " and " + dateToString(endDate) + ". Please come back soon!");
                 
                     // too late
                     } else if (endDate < curDate) {
                 
                       $("#validated").text("This code expired on " + dateToString(endDate));
                 
                     // just right!
                     } else {
                 
                       showSlide("instructions");
                 
                     }
                 
                   } else {
                 
                     $("#validated").text("Invalid code. Please enter a valid code.")
                 
                   }
                 
                 } else {
                   $("#validated").text("Invalid code. Please enter a valid code.")
                 }

})

// ## Preloading functions

// Function called after each image is loaded

var numLoadedImages = 0;

function onLoadedOne() {
  numLoadedImages++;
  $("#num-loaded").text(numLoadedImages);
}

// Function called once all images have been successfully loaded
function onLoadedAll() {
  showSlide("codescreen");
}

// Preload function

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


// ## Configuration settings

// Initialize stimuli parameters
var stimdir = "stim/";
var stim = JSON.parse(stimuli);

var preload_imgs = [];
var trialOrder = [];

// For preloading push all versions
// but for trialOrder only push stim name
for (var i = 0; i < stim.length; i++){
  
  var sbst = stim[i];
  
  for (var j = 0; j < sbst.length; j++){
    
    preload_imgs.push(stimdir + sbst[j] + '/e1_s1.jpg');
    preload_imgs.push(stimdir + sbst[j] + '/e1_s2.jpg');
    preload_imgs.push(stimdir + sbst[j] + '/e2_s1.jpg');
    preload_imgs.push(stimdir + sbst[j] + '/e2_s2.jpg');
    
    trialOrder.push(stimdir + sbst[j]);
    
  }
  
}

// Shuffle
fisherYates(trialOrder);

// ## Start the experiment

// Hide our filler images
$(".upperleft, .upperright, .lowerleft, .lowerright").hide();

// Show preload slide and load
showSlide("preload");
$("#num-total").text(preload_imgs.length);
preload(preload_imgs,
        onLoadedOne,
        onLoadedAll);
console.log('here');


// ## The main event

// Prep data storage
var allData = {
  
  fingerprintData: fingerprint,
  trialData: [] // populated each trial
  
}

// Run experiment
var experiment = {
  
  // Trials
  // deep copy since we are using .shift() but my want to retain this list
  trials: trialOrder,
  
  // The function that gets called when the sequence is finished.
  end: function() {
    
    // display appropriate finish slide
    if (allData.delayGroup == "long"){
      
      $("#finish-yescheckin").hide();
      
    } else {
      
      $("#finish-nocheckin").hide();
      $("#timeframe").text(" between 48 hours and 72 hours from now ");
      
      // careful with the order here
      // or change to copy by value
      var curdate = new Date();
      
      var startret = curdate;
      startret.setDate(startret.getDate() + 2)
      $("#checkstart").text(dateToString(startret));
      var startcode = dateToCode(startret);
      
      var endret = startret;
      endret.setDate(endret.getDate() + 1);
      $("#checkend").text(dateToString(endret));
      var endcode = dateToCode(endret);
      
      $("#checkcode").text("0176" + startcode + endcode + "0198");

    }
    
    // Show the finish slide.
    showSlide("finished");
    
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(allData) }, 1500);
    
  },
  
  // The work horse of the sequence - what to do on every trial.
  next: function() {
    
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      allData.delayGroup = (code.slice(-1) == "s" ? "short" : "long");
      experiment.end();
      return;
      
    }
    
    // Get the current trial
    var trial_img = experiment.trials.shift();
    
    var trial_img_ul = trial_img + "/e1_s1.jpg";
    var trial_img_ur = trial_img + "/e1_s2.jpg";
    var trial_img_ll = trial_img + "/e2_s1.jpg";
    var trial_img_lr = trial_img + "/e2_s2.jpg";
    
    
    // Display the image stimulus.
    showSlide("stage");
    $(".upperleft").attr("src", trial_img_ul);
    $(".upperright").attr("src", trial_img_ur);
    $(".lowerleft").attr("src", trial_img_ll);
    $(".lowerright").attr("src", trial_img_lr);
    $(".upperleft, .upperright, .lowerleft, .lowerright").show();
    
    // Get the current time so we can compute reaction time later.
    var startTime = (new Date()).getTime();
    
    // Define click handler
    var clickHandler = function(event){
      
      $("img").off("click"); // Binding with 'one' is not preventing multiple click events

      // Record the reaction time (current time minus start time) and which image was selected
      var endTime = (new Date()).getTime(),
          trial = {
            resp: $(this).attr("src"),
            rt: endTime - startTime,
            stimulus: trial_img
          };
                   
      allData.trialData.push(trial);
                   
      // Temporarily clear the display
      $("img").hide();
      
      // Wait 500 milliseconds before starting the next trial.
      setTimeout(experiment.next, 500);
      
    };
    
    // Bind the handler
    $("img").one("click", clickHandler); //'one' is not working as intended
    
  }
}