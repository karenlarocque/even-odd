// ## High-level overview
// This check-in is to equate the short and long delay groups in "propensity to come back after a three day delay." The only requirement is to hit the start button.

// ## Prep data
var allData = {
  
  fingerprintData: fingerprint
  
};

showSlide("codescreen");

// ## Code validation
var code = "";
$("form").submit( function (){
                 
                 $("#validated").text("")
                 code = $("#getcode")[0].elements["code"].value; //global scope, try to fix later
                 
                 // screen for invalid format
                 if (!(code.length == 32 &&
                       code.slice(0,4) == "0176" &&
                       code.slice(-4) == "0198" &&
                       !isNaN(code))) {
                 
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
                 
                 allData.entrycode = code;
                 showSlide("instructions");
                 
                 
                 }
                 
                 })


// ## Finish slide
function end() {
  
    // Show the finish slide.
    showSlide("finished");
    
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { turk.submit(allData) }, 1500);
    
}
  
