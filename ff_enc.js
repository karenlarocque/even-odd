// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (which keys to press for even/odd and trial order), fill in the template <code>{{}}</code> slots that indicate which keys to press for even/odd, and show the instructions slide.
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 4. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 5. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, constructs a data object (stimulus, RT, & key press), and sets up a listener for a key press.
// 6. The key press listener records the first P or Q response that is pressed. Regardless of the input, the stimulus is displayed on the screen for 200 ms followed by a blank screen for 1800 ms. Before the next trial advances, the data object gets pushed into the <code>experiment.data</code> array.

// ## Helper functions

// Shows slides
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
}

// Get a random integer less than n
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization
function randomElement(array) {
  return array[randomInteger(array.length)];
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
  var loadDelayInterval = 250;
  
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
  
  // Load images 3 at a time
  var concurrent = 3;
  for(var i = 0; i < concurrent; i++) {
    setTimeout(worker, 20 - i);
  };
}

// ## Configuration settings

var stimdir = "stim/";

var allKeyBindings = [
      {"p": "smaller", "q": "bigger"},
      {"p": "bigger", "q": "smaller"} ],
    allTrialOrders = [
      ["accordion","altoid","apple","backpack"],
      ["backpack","apple","altoid","accordion"] ],
    myKeyBindings = randomElement(allKeyBindings),
    myTrialOrder = randomElement(allTrialOrders),
    pSmaller = (myKeyBindings["p"] == "smaller");
    
// Fill in the instructions template using jQuery's <code>html()</code> method. In particular,
// let the subject know which keys correspond to even/odd. Here, I'm using the so-called **ternary operator**, which is a shorthand for <code>if (...) { ... } else { ... }</code>

$("#smaller-key").text(pSmaller ? "P" : "Q");
$("#bigger-key").text(pSmaller ? "Q" : "P");


// ## Start the experiment

// Add path and exemplar information to images
var imgs = [];
for ( var i = 0; i < myTrialOrder.length; i++ ) {
  imgs.push(stimdir + myTrialOrder[i] + "/e1_s1.jpg");
}

// Show preload slide and load
showSlide("preload");
$("#num-total").text(imgs.length);
preload(imgs,
        onLoadedOne,
        onLoadedAll);
console.log('here');


// ## The main event

// I implement the sequence as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular sequence and not any other) and allows you to **compose** sequences to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate sequences and dynamically setting the <code>end()</code> function for each sequence so that it points to the next. **More practically, you should stick everything in an object and submit that whole object so that you don't lose data (e.g. randomization parameters, what condition the subject is in, etc). Don't worry about the fact that some of the object properties are functions -- mmturkey (the Turk submission library) will strip these out.**

var allData = {
  
  trials: myTrialOrder,
  keyBindings: myKeyBindings,
  fingerprintData: fingerprint,
  trialData: [] // populated each trial
  
}

var experiment = {
  
  // Parameters for this sequence.
  trials: myTrialOrder,
  
  // The function that gets called for the first trial (1500 ms padding of blank screen)
  leadin: function() {
    showSlide("leadin");
    setTimeout(function(){experiment.next()}, 1500);
  },
  
  // The function that gets called when the sequence is finished.
  end: function() {
    
    // Show the finish slide.
    showSlide("finished");
    
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(allData) }, 1500);
    
  },
  
  // The work horse of the sequence - what to do on every trial
  next: function() {
    
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      
      experiment.end();
      return;
      
    }
    
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it
    var trial_img = stimdir + experiment.trials.shift() + "/e1_s1.jpg";
    
    // Initialize data structure for the trial
    var trial = {
      stimulus: trial_img,
      rt: -1,
      resp: 'noresponse'
    };
    
    // Display the image stimulus
    showSlide("stage");
    $(".centered").attr({src: trial_img,
                         style: "display:initial"});
    
    // Get the current time so we can compute reaction time later
    var startTime = (new Date()).getTime();
    
    // Function for keyboard input
    var keyPressHandler = function(event) {
      
      var keyCode = event.which;
      
      if (keyCode != 81 && keyCode != 80) {
        
        // If a key that we don't care about is pressed, re-attach the handler (see the end of this script for more info)
        $(document).one("keydown", keyPressHandler);
        
      } else {
        
        // If a valid key is pressed (code 80 is p, 81 is q),
        // record the reaction time (current time minus start time) and which key was pressed
        var endTime = (new Date()).getTime(),
            key = (keyCode == 80) ? "p" : "q";
            trial.rt = endTime - startTime;
            trial.resp = key;
      }
    };
    
    // Bind the key press handler
    $(document).one("keydown", keyPressHandler);
    
    // Show stimulus for 200 ms, then clear & impose 1800 ms ISI
    setTimeout(function(){
                  $(".centered").attr("style","display:none");
               }, 200);
    setTimeout(function(){
                $(document).off("keydown", keyPressHandler)
                allData.trialData.push(trial);
                experiment.next();
               }, 1800);    
  }
}