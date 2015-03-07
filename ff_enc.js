// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (which keys to press for even/odd and trial order), fill in the template {}} slots that indicate which keys to press for even/odd, and show the instructions slide.
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it calls experiment.next()
// 4. experiment.next() checks if there are any trials left to do. If there aren't, it pulls up the demographics slide.
// 5. If there are more trials left, experiment.next() shows the next trial, records the current time for computing reaction time, constructs a data object (stimulus, RT, & key press), and sets up a listener for a key press.
// 6. The key press listener records the first P or Q response that is pressed. Regardless of the input, the stimulus is displayed on the screen for 200 ms followed by a blank screen for 1800 ms. Before the next trial advances, the trial data object gets pushed into the allData array.
// 7. Demographic information is collected.
// 8. We show the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk. If the subject's accuracy is high enough, a code for the second part is provided on this finish slide.



// ## Configuration settings

// Randomly select key mapping
var allKeyBindings = [
       {"p": "smaller", "q": "bigger"},
       {"p": "bigger", "q": "smaller"} ],
    myKeyBindings = randomElement(allKeyBindings),
    pSmaller = (myKeyBindings["p"] == "smaller");

// Fill in the instructions template using jQuery's <code>html()</code> method. In particular,
// let the subject know which keys correspond to bigger/smaller
$(".smaller-key").text(pSmaller ? "P" : "Q");
$(".bigger-key").text(pSmaller ? "Q" : "P");

// Randomly select delay group
var delayGroup = (randomInteger(1) ? "short" : "long")

// Initialize stimuli parameters
var stimdir = "stim/";
var stim = JSON.parse(stimuli);
var counterbalance = randomInteger(4);

// Assign stimuli to conditions based on counterbalance
var S1 = stim[(0 + counterbalance) % 4],
    S2 = stim[(1 + counterbalance) % 4],
    S3 = stim[(2 + counterbalance) % 4],
    S4 = stim[(3 + counterbalance) % 4];

// Construct full stimulus names
var trialOrder = [];
for (var i = 0; i < S1.length; i++){
  trialOrder.push(stimdir + S1[i] + "/e1_s1.jpg");
}
for (var i = 0; i < S2.length; i++){
  trialOrder.push(stimdir + S2[i] + "/e1_s2.jpg");
}
for (var i = 0; i < S3.length; i++){
  trialOrder.push(stimdir + S3[i] + "/e2_s1.jpg");
}
for (var i = 0; i < S4.length; i++){
  trialOrder.push(stimdir + S4[i] + "/e2_s2.jpg");
}

// Shuffle
fisherYates(trialOrder);

// Keep track of correct / incorrect answers for a subset of stimuli
var set_bigger = JSON.parse(bigger);
var set_smaller = JSON.parse(smaller);
var correct_bigger = 0;
var correct_smaller = 0;



// #### Start the experiment

// Hide our filler image
$(".centered").hide();


// ## Preload images

// function called once all images have been successfully loaded
function onLoadedAll() {
  showSlide("instructions");
}

// preload images
showSlide("preload");
$("#num-total").text(trialOrder.length);
preload(trialOrder,
        onLoadedOne,
        onLoadedAll);
console.log('here');



// ## Prep data storage
var allData = {
  
  keyBindings: myKeyBindings,
  fingerprintData: fingerprint,
  counterbalance: counterbalance,
  delaygroup: delayGroup,
  trialData: [], // populated each trial
  
}



// ## Run experiment
var experiment = {
  
  // Trials
  // deep copy since we are using .shift() but want to retain record of trial order
  trials: $.extend(true, [], trialOrder),
  
  // The function that gets called for the first trial (1500 ms padding)
  leadin: function() {
    showSlide("leadin");
    setTimeout(function(){
               $("p").hide();
               setTimeout(function(){
                          experiment.next();
                          }, 1000)
               }, 1500);
  },
  
  // The function that gets called when the sequence is finished.
  end: function() {
    
    // Show the demographics slide.
    showSlide("demo");
    
  },
  
  // The work horse of the sequence - what to do on every trial
  next: function() {
    
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      
      experiment.end();
      return;
      
    }
    
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it
    var trial_img = experiment.trials.shift();
    
    // Initialize data structure for the trial
    var trial = {
      stimulus: trial_img,
      rt: -1,
      resp: 'noresponse'
    };
    
    // Display the image stimulus
    showSlide("stage");
    $(".centered").attr("src", trial_img);
    $(".centered").show();
    
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
        
        // Check if it's a stimulus that we want to assess for accuracy
        // and if yes, assume for now that response will be incorrect
        var answerSmaller = ((key == "p" && pSmaller) || (key == "q" && !pSmaller))

        if (jQuery.inArray(trial_img.split("/")[1], set_smaller) > -1 && answerSmaller) {
          correct_smaller += 1;
        } else if (jQuery.inArray(trial_img.split("/")[1], set_bigger) > -1 && !answerSmaller) {
          correct_bigger += 1;
        }
        
      }
    };
    
    // Bind the key press handler
    $(document).one("keydown", keyPressHandler);
    
    // Show stimulus for 200 ms, then clear & impose 1800 ms ISI
    setTimeout(function(){
                  $(".centered").hide();
                  setTimeout(function(){
                          $(document).off("keydown", keyPressHandler);
                          allData.trialData.push(trial);
                          experiment.next();
                          }, 1800);
               }, 200);

  }
}



// ## Submit demographic submission
$("form").submit( function (){
                 var age = $("#demographics")[0].elements["age"].value;
                 var gender = $("#demographics")[0].elements["gender"].value;
                 
                 if (age == "" || gender == "") {
                 $("#validated").text("Please fill out all fields before submitting.")
                 } else {
                 allData.age = age;
                 allData.gender = gender;
                 wrap_up();
                 }})



// ## Wrap up function for end of experiment
function wrap_up(){
  
  // calculate accuracy
  allData.acc_smaller = correct_smaller / set_smaller.length;
  allData.acc_bigger = correct_bigger / set_bigger.length;
  
  // record current time
  var curdate = new Date();
  
  // display appropriate finish slide
  if (allData.acc_smaller < .8 || allData.acc_bigger < .8){
    
    $("#finish-yesret").hide();
    
  } else if (delayGroup == "short"){
    
    $("#finish-noret").hide();
    $("#timeframe").text(" within the next 10 minutes ");
    
    // careful with the order here
    // or change to copy by value
    var startret = curdate;
    $("#retstart").text(dateToString(startret));
    var startcode = dateToCode(startret);
    
    var endret = startret;
    endret.setMinutes(endret.getMinutes() + 10);
    $("#retend").text(dateToString(endret));
    var endcode = dateToCode(endret);
    
    $("#retcode").text("8302" + startcode + endcode + "2153s");
    
    
  } else {
    
    $("#finish-noret").hide();
    $("#timeframe").text(" between 48 hours and 72 hours from now ");
    
    // careful with the order here
    // or change to copy by value
    var startret = curdate;
    startret.setDate(startret.getDate() + 2)
    $("#retstart").text(dateToString(startret));
    var startcode = dateToCode(startret);
    
    var endret = startret;
    endret.setDate(endret.getDate() + 1);
    $("#retend").text(dateToString(endret));
    var endcode = dateToCode(endret);
    
    $("#retcode").text("8302" + startcode + endcode + "2153l");
    
  }
  
  showSlide("finished");
  // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
  setTimeout(function() { turk.submit(allData) }, 1500);
  
}


