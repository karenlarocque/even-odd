// ## High-level overview
// Things happen in this order:
// 
// 1. Set up the experiment sequence object.
// 2. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 3. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 4. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, and sets up a listener for a key press.
// 5. The mouse click listener, when it detects a click, constructs a data object, which includes the presented stimulus, which version was selected, and RT (current time - start time). This entire object gets pushed into the <code>experiment.data</code> array. Then we show a blank screen and wait 500 milliseconds before calling <code>experiment.next()</code> again.



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

// Disable buttons if in preview mode
if (turk.previewMode) {
  $("button")[0].disabled = true;
}

// ## Show codescreen slide
// and only allow users with Chrome
if (fingerprint.browser.search("Chrome") < 0 && fingerprint.browser.search("chrome") < 0) {
  showSlide("chrome");
} else {
  showSlide("codescreen");
}

// ## Preloading

// function called once all images have been successfully loaded
function onLoadedAll() {
  experiment.next();
}

// preload images
function preload_wrap() {
  showSlide("preload");
  $("#num-total").text(preload_imgs.length);
  preload(preload_imgs,
        onLoadedOne,
        onLoadedAll);
}


// ## Code validation
var code = "";
$("form#getcode").submit( function (){
                 
  $("#validated").text("");
  $("#validated").attr("style", "color:red");
  code = $("#getcode")[0].elements["code"].value; //global scope, try to fix later
  
  // screen for invalid format
  if (!(code.length == 33 &&
      code.slice(0,4) == "8302" &&
      (code.slice(-5) == "2153s" || code.slice(-5) == "2153l") &&
      !isNaN(code.slice(0,-1)))) {
                 
                 $("#validated").text("Invalid code. Please enter a valid code.");
                 return;
                 
  }
  
  // convert to date
  var startDate = codeToDate(code.slice(4,16))
  var endDate = codeToDate(code.slice(16,28))
  var curDate = new Date();
                 
  // screen for invalid dates
  if (!startDate || !endDate || startDate > endDate){
                 $("#validated").text("Invalid code. Please enter a valid code.");
                 return;
  }
                 
  // check time
      
  // too soon
  if (startDate > curDate){
                 
                 $("#validated").text("This code is only valid for use between " + dateToString(startDate) + " and " + dateToString(endDate) + ". Please come back soon!");
                 
  // too late
  } else if (endDate < curDate) {
                 
                 $("#validated").text("This code expired on " + dateToString(endDate));
                 
  // just right!
  } else {
                 
                 if (turk.previewMode) {
                 
                   $("#validated").text("This code is valid but cannot submit while in preview mode.");
                   $("#validated").attr("style", "color:green");
                   return;
                 
                 }
                 
                 showSlide("instructions");
                 
  }

})
                 



// ## Prep data storage
var allData = {
  
  fingerprintData: fingerprint,
  trialData: [] // populated each trial
  
}



// ## Run experiment
var experiment = {
  
  // Trials
  // deep copy since we are using .shift() but want to retain record of trial order
  trials: $.extend(true, [], trialOrder),
  
  // The function that gets called when the sequence is finished.
  end: function() {
    
    showSlide("comments");
    
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

// ## Submit comments
$("form#commentform").submit( function (){
                 
                 var comments = $("#commentform")[0].elements["comments"].value;
                 allData.comments = comments;
                 wrap_up();
                 
                 })

// ## Wrap up function for end of experiment
function wrap_up() {
  
  allData.submitTime = new Date();
  allData.entrycode = code;
  
  // display appropriate finish slide
  if (allData.delayGroup == "long"){
    
    $("#finish-yescheckin").hide();
    allData.exitcode = "none";
    
    // Show the finish slide.
    showSlide("finished");
    
    // user clicks button to submit
    
  } else {
    
    $("#finish-nocheckin").hide();
    $("#timeframe").text(" between 60 hours and 84 hours from now ");
    
    // careful with the order here
    // or change to copy by value
    
    var curDate = new Date();
    var startret = curDate;
    startret.setHours(startret.getHours() + 60)
    $("#checkstart").text(dateToString(startret));
    var startcode = dateToCode(startret);
    
    var endret = startret;
    endret.setHours(endret.getHours() + 24);
    $("#checkend").text(dateToString(endret));
    var endcode = dateToCode(endret);
    
    $("#checkcode").text("0176" + startcode + endcode + "0198");
    allData.exitcode = "0176" + startcode + endcode + "0198";
    
    showSlide("finished");
    // user clicks button to submit
    
  }
  
}