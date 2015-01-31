/**
 * @fileoverview Online version of Sister Arseneau's apartment forms.
 * @author hilmar.gustafsson@myldsmail.net (Elder Gústafsson)
 * @see '/z Project Visions/Apartment Forms'
 */

/*============================================= PAGE SETUP =============================================*/

/**
 *  A function that runs as soon as the page loads. Sets up the accordion functionality. Sets up the forms from database.
 */

$(document).ready(function(){
    /* Load forms into the accordion using db.apartmentForms. Using JQuery to create the structure. */
    getApartmentForms(printApartmentForms);
});

/**
 * Closes everything in the accordion.
 *  Used just to keep a clean look.
 */
 
function addAccordionListeners(){
    $('.accordion-section-title').click(function(e) {
        // Grab current anchor value
        var currentAttrValue = $(this).attr('href');
 
        if($(e.target).is('.active')) {
            close_accordion_section();
        }else {
            close_accordion_section();
 
            // Add active class to section title
            $(this).addClass('active');
            // Open up the hidden content panel
            $('.accordion ' + currentAttrValue).slideDown(300).addClass('open'); 
        }
        e.preventDefault();
    });
}

function close_accordion_section() {
    // Close accordion
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(300).removeClass('open');
}


/**
 * Switches the focus of the accordion to the basic apartment information.
 */
 
function updateAccordion(){
    // Open accordion-2
        close_accordion_section();
        // Add active class to section title
        $('.accordion-section-title[href$="#accordion-2"]').addClass('active');
        // Open up the hidden content panel
        $('.accordion #accordion-1').slideDown(300).addClass('open'); 
}

/* ============================================= Parsing Operations ============================================= */

/**
 * Parses through apartmentForms results & writes to HTML DOM
 */
function printApartmentForms( forms ){
    var accordion = $('.accordion-section');
    for(var i = 0; i < forms.length; i++)
    {
        // Create the next section in the accordion
        accordion.append('<a class="accordion-section-title" href="#accordion-' + (i + 2) + '">' + forms[i]['name'] + '</a>');
        
        // Create content for the form
        var formContent = '';
        var structure = forms[i]['structure'];
        for(var j in structure){
            var name = structure[j];
            formContent += '<div>';
            formContent += '<label for="' + name + '-' + j + '">' + name + '</label>';
            // Input
            formContent += '<input type="Text" id="' + name + '-' + j + '/>';
            formContent += '</div> \r\n';
        }
        
        // Create the form
        var myForm = '<form>' + formContent + '<input type="Button" id="' + i + '-submit" value="Update"/>' + '</form>';
            
        // Create DIV
        var myDiv = accordion.append('<div id="accordion-' + (i + 2) + '" class="accordion-section-content">' + myForm + '</div>');
    }
    
    // Enable accordion after loading forms.
    addAccordionListeners();
}

/* ============================================= Database calls ============================================= */

/**
 * Calls MONGODB collection apartmentForms.
 * @returns results
 *  Array of all the forms in the database.
 * TODO: Add more options to this later as needed
 */
function getApartmentForms(callback){
    // Sends a POST request to the server with the action getApartmentForms
    $.post("/apartment_information/db", { action: "getApartmentForms" }, function(results){
        if(results !== undefined){
            callback(results);
        }
        else{
            return false;
        }
    });
}


/**
 * Fetches information from database on a specific apartment by its ID.
 */

function FetchApartment(id, name){
    // Load up information on apartment by ID
    $.post("/apartment_information/db", {action: "flatID", flatID: id }, function(form)
    {
        // Sort into forms
        
        // Foreach fill forms with information already in database
        
        // TODO THIS IS WHERE I WAS WHEN WE LEFT.
        
        // Open accordion-2
        close_accordion_section();
        // Add active class to section title
        $('.accordion-section-title[href$="#accordion-2"]').addClass('active');
        // Open up the hidden content panel
        $('.accordion #accordion-2').slideDown(300).addClass('open'); 
        
        // Event listeners for the submit buttons.
        // (Every time someone selects a new flat, the flat ID & everything has to be changed for these buttons as well.)
        
        $('#basicInfoSubmit').unbind('click');
        $('#basicInfoSubmit').click(function(e)
        {
            // Update basic info
            Update(id, "apartments", 
            {
                houseName: $('#houseName').val(),
                proselytingArea: $('#proselytingArea').val(),
                district: $('#district').val(),
                zone: $('#zone').val()
            });
            updateAccordion();
        });
        
        $('#aptInfoSubmit').unbind('click');
        $('#aptInfoSubmit').click(function(e)
        {
           // Update Apartment Info 
           Update(id, "apartmentForms", 
           {
               formType: 'Apartment Information',
               'id': id,
               address: $('#apartmentAddress').val(),
               phoneNumber: $('#apartmentPhoneNumber').val(),
               rentAmount: $('#apartmentRentAmount').val(),
               dateOpened: $('#apartmentDateOpened').val(),
               lengthOfLease: $('#apartmentLengthOfLease').val(),
               dateExpires: $('#apartmentDateExpires').val(),
               refundableDepositAmount: $('#apartmentRefundableDepositAmount').val(),
               bondNumber: $('#apartmentBondNumber').val(),
               dateClosed: $('#apartmentDateClosed').val(),
               depositAmountReturned: $('#apartmentDepositAmountReturned').val(),
               moveInInspection: $('#apartmentMoveInInspection').val(),
               moveInInspectionDate: $('#apartmentMoveInInspectionDate').val(),
               moveOutInspection: $('#apartmentMoveOutInspection').val(),
               moveOutInspectionDate: $('#apartmentMoveOutInspectionDate').val(),
               advanceNoticeRequired: $('#apartmentAdvanceNoticeRequired').val(),
               howManyDays: $('#apartmentHowManyDays').val()
           });
           updateAccordion();
        });
        
        
        $('#payeeInfoSubmit').unbind('click');
        $('#payeeInfoSubmit').click(function(e)
        {
            // Update Payee Info
            Update(id, "apartmentForms", 
            {
                formType: 'Payee (Landlord) Information',
                'id': id,
                payeeName:      $('#payeeName').val(),
                phoneNumber:    $('#payeePhoneNumber').val(),
                mailingAddress: $('#payeeMailingAddress').val(),
                contactName:    $('#payeeContactName').val(),
                contactPhone:   $('#payeeContactPhone').val(),
                address:        $('#payeeEmailAddress').val(),
                vendorNumber:   $('#payeeVendorNumber').val()
            });
            updateAccordion();
        });
        
        // Submit utilities
        $('#utilSubmit').unbind('click');
        $('#utilSubmit').click(function(e)
        {
            // Water
           Update(id, "apartmentUtils", 
           {
               'id': id,
               utility: 'Water',
               companyName: $('#waterCompanyName').val(),
               phoneNumber: $('#waterPhoneNumber').val(),
               address: $('#waterAddress').val(),
               contactPersonAndComments: $('#waterContactPersonAndComments').val() 
           });
           
           // Electricity
           Update(id, "apartmentUtils", 
           {
               'id': id,
               utility: 'Electricity',
               companyName: $('#elecCompanyName').val(),
               phoneNumber: $('#elecPhoneNumber').val(),
               address: $('#elecAddress').val(),
               responsibleParty: $('elecResponsibleParty').val(),
               setupDate: $('elecSetupDate').val(),
               closingDate: $('elecClosingDate').val(),
               accountNumber: $('elecAccountNumber').val(),
               refundableDeposit: $('elecRefundableDeposit').val(),
               contactPersonAndComments: $('#elecContactPersonAndComments').val() 
           });
           
           // Gas
           Update(id, "apartmentUtils", 
           {
               'id': id,
               utility: 'Gas',
               companyName: $('#gasCompanyName').val(),
               phoneNumber: $('#gasPhoneNumber').val(),
               address: $('#gasAddress').val(),
               responsibleParty: $('gasResponsibleParty').val(),
               setupDate: $('gasSetupDate').val(),
               closingDate: $('gasClosingDate').val(),
               accountNumber: $('gasAccountNumber').val(),
               refundableDeposit: $('gasRefundableDeposit').val(),
               contactPersonAndComments: $('#gasContactPersonAndComments').val() 
           });
           
           updateAccordion();
        });
    });
}

/***
 * SUMMARY:
 *  Deletes a house from the table.
 * NOTES:
 * TODOS:
 *  1. Confirm success - then refresh.
 ***/

function Delete(id, name)
{
    // Confirm deletion
    if(confirm("Are you sure you want to delete " + name + "?"))
    {
        //Delete & forms associated to that flat
        $.post("/apartment_information/db", {action: "delete", _id: id }, function()
        {
            // TODO: See if deletion was successful
        });
    }
    refreshList();
}

/***
 * SUMMARY:
 *  This function sends an update request to the server.js file which in turn updates the database.
 * NOTES:
 *  1. Very dynamic, works with whatever.
 * TODOS:
 *  1. Confirm success? Find some way to not refresh the table until success has been confirmed.
 ***/

function Update(id, database, data)
{
    $.post("/apartment_information/db", 
    {
        action: "update", 
        objectID: id, 
        database: database, 
        data: data 
    }, 
    function(result)
    {
        // Success?
    });
    
    refreshList();
}

/***
 * SUMMARY:
 *  Adds an apartment to the database.
 * NOTES:
 *  1. Very basic. Doesn't allow to add Zone, District or Area.
 * TODOS:
 *  1. Might want to add options for more information.
 ***/

function AddApartment()
{
    // Open up form for adding apartment
    var aptName = prompt('What is the name of the apartment?');
    $.post("/apartment_information/db", {action: "createApt", houseName: aptName}, function(result){
        refreshList();
    });
}


/***
 * SUMMARY:
 *  This function populates the table with all available apartments. Orders alphabetically by names.
 * NOTES:
 *  1. Generates HTML on the go. This is to accomodate a more dynamic style. (Might not be the most practical?)
 * TODOS:
 *  1. Might want to give the option of ordering information some other way. 
 *     Would probably be easiest to make it dynamic and just change the database query.
 ***/
 
function refreshList(){
    // Fetch table information from database
    $.post("/apartment_information/db", {action: "get"} , function(result) {
        var apartments = result;
        // Create the table
        var html = "<table>" +
                        "<tr>" +
                            "<th id='delete'><a onclick='AddApartment()'><img src='/stylesheets/images/addButton.png'></a></th>" +
                            "<th>House Name</th>" +
                            "<th>Proselyting Area</th>" +
                            "<th>District</th>" +
                            "<th>Zone</th>" +
                        "</tr>";
        
        // For every object in the database result, iterate through fields and post to table.
        for(var object in result)
        {
            var i = result[object];
            var onClickDelete = "Delete('" + i['_id'] + "','" + i['houseName'] + "')";
            var onClickFetch = "FetchApartment('" + i['_id'] + "','" + i['houseName'] + "')";
            html += "<tr>" +
                        // Delete apartment by ID
                        "<td><a onclick=\"" + onClickDelete + "\"><img src='/stylesheets/images/deleteButton.png'></a></td>" +
                        // Load up all files on apartment by ID
                        "<td><a onclick=\"" + onClickFetch + "\">" + i['houseName']  + "</a></td>" +
                        "<td>" + i['proselytingArea'] + "</td>" +
                        "<td>" + i['district'] + "</td>" +
                        "<td>" + i['zone'] + "</td>" +
                    "</tr>"
        }
        
        html += "</table>";
        
        $('#accordion-1').html(html);
    });
}