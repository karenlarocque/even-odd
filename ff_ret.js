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

// ## Preloading functions

// Function called after each image is loaded

var numLoadedImages = 0;

function onLoadedOne() {
  numLoadedImages++;
  $("#num-loaded").text(numLoadedImages);
}

// Function called once all images have been successfully loaded
function onLoadedAll() {
  showSlide("instructions");
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

myTrialOrder = ["accordion","altoid","apple","backpack"];

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
    
    // Show the finish slide.
    showSlide("finished");
    
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(allData) }, 1500);
    
  },
  
  // The work horse of the sequence - what to do on every trial.
  next: function() {
    
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
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