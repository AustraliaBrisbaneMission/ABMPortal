/**
 * @fileoverview Online version of Sister Arseneau's apartment forms.
 * @author hilmar.gustafsson@myldsmail.net (Elder Gústafsson)
 */

/*============================================= ACCORDION =============================================*/

/**
 *  A function that runs as soon as the page loads. Sets up the accordion functionality. Loads HTML from root/apartments/editForm.html
 * NOTES:
 *  1. Having a separate HTML page that I just load onto the page might not be the most effective method.
 *  2. The accordion looks cool.
 * TODOS:
 *  1. editForm isn't very practical. Find a better way. (Maybe just write it out in jade in views/apartments.jade)
 ***/

$(document).ready(function()
{

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
    
    // Load the table
    refreshList();
    
    /* === Load the forms onto the accordion divs === */
    
    // Simple Info
    $('#accordion-2').load("/apartments/editForm.html #editFormDiv-1");
    
    // Apartment Info
    $('#accordion-3').load("apartments/editForm.html #editFormDiv-2");
    
    // Landlord Info
    $('#accordion-4').load("apartments/editForm.html #editFormDiv-3");
    
    // Utilities
    $('#accordion-5').load("apartments/editForm.html #editFormDiv-4");
});

/***
 * SUMMARY:
 *  Closes everything in the accordion.
 * NOTES:
 * TODOS:
 ***/

function close_accordion_section() {
    // Close accordion
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(300).removeClass('open');
}


/***
 * SUMMARY:
 *  Switches the focus of the accordion to the basic apartment information.
 * NOTES:
 * TODOS:
 *  1. Possibly make it more dynamic somehow? - It can be annoying to always open up that one when selecting a new item.
 ***/
 
function updateAccordion(){
    // Open accordion-2
        close_accordion_section();
        // Add active class to section title
        $('.accordion-section-title[href$="#accordion-2"]').addClass('active');
        // Open up the hidden content panel
        $('.accordion #accordion-1').slideDown(300).addClass('open'); 
}

/*============================================= CRUD OPERATIONS =============================================*/

/***
 * SUMMARY:
 *  Fetches information from database on a specific apartment by its ID.
 * NOTES:
 *  1. Event listeners are reset for the update buttons in this function.
 * TODOS:
 *  1. Tidy up.
 *  2. Make faster.
 ***/

function FetchApartment(id, name){
    // Load up information on apartment by ID
    $.post("/apartment_information/db", {action: "flatID", flatID: id }, function(result)
    {
        // Declare variables
        var houseInfo = result[0] || null;
        var houseForms = result[1] || {};
        var Apt_Utils = result[2] || {};
        var Apt_Info = {}, Payee_Info = {};
        
        if(houseForms.length >= 1)
        {
            for (var i = 0; i < houseForms.length; i++) 
            {
                switch(houseForms[i]['formType'])
                {
                    case 'Apartment Information':
                        Apt_Info = houseForms[i];
                        break;
                    case 'Payee (Landlord) Information':
                        Payee_Info = houseForms[i];
                        break;
                }
            }
        }
        
        // House Basic Info
        $('#houseName').val(houseInfo['houseName']);
        $('#proselytingArea').val(houseInfo['proselytingArea']);
        $('#district').val(houseInfo['district']);
        $('#zone').val(houseInfo['zone']);
        
        // Apartment Info Form
        $('#apartmentAddress').val(Apt_Info['address']);
        $('#apartmentPhoneNumber').val(Apt_Info['phoneNumber']);
        $('#apartmentRentAmount').val(Apt_Info['rentAmount']);
        $('#apartmentDateOpened').val(Apt_Info['dateOpened']);
        $('#apartmentLengthOfLease').val(Apt_Info['lengthOfLease']);
        $('#apartmentDateExpires').val(Apt_Info['dateExpires']);
        $('#apartmentRefundableDepositAmount').val(Apt_Info['refundableDepositAmount']);
        $('#apartmentBondNumber').val(Apt_Info['bondNumber']);
        $('#apartmentDateClosed').val(Apt_Info['dateClosed']);
        $('#apartmentDepositAmountReturned').val(Apt_Info['depositAmountReturned']);
        $('#apartmentMoveInInspection').val(Apt_Info['moveInInspection']);
        $('#apartmentMoveInInspectionDate').val(Apt_Info['moveInInspectionDate']);
        $('#apartmentMoveOutInspection').val(Apt_Info['moveOutInspection']);
        $('#apartmentMoveOutInspectionDate').val(Apt_Info['moveOutInspectionDate']);
        $('#apartmentAdvanceNoticeRequired').val(Apt_Info['advanceNoticeRequired']);
        $('#apartmentHowManyDays').val(Apt_Info['howManyDays']);

        $('#payeeName').val(Payee_Info['payeeName']);
        $('#payeePhoneNumber').val(Payee_Info['phoneNumber']);
        $('#payeeMailingAddress').val(Payee_Info['mailingAddress']);
        $('#payeeContactName').val(Payee_Info['contactName']);
        $('#payeeContactPhone').val(Payee_Info['contactPhone']);
        $('#payeeEmailAddress').val(Payee_Info['address']);
        $('#payeeVendorNumber').val(Payee_Info['vendorNumber']);
        
        // Utilities
        var waterArray =    Apt_Utils[0] || {};
        var elecArray =     Apt_Utils[1] || {};
        var gasArray =      Apt_Utils[2] || {};
        
        $('#waterCompanyName').val(waterArray['companyName']);
        $('#waterPhoneNumber').val(waterArray['phoneNumber']);
        $('#waterAddress').val(waterArray['address']);
        $('#waterContactPersonAndComments').val(waterArray['contactPersonAndComments']);
        $('#elecCompanyName').val(elecArray['companyName']);
        $('#elecPhoneNumber').val(elecArray['phoneNumber']);
        $('#elecAddress').val(elecArray['address']);
        $('#elecResponsibleParty').val(elecArray['responsibleParty']);
        $('#elecSetupDate').val(elecArray['setupDate']);
        $('#elecClosingDate').val(elecArray['closingDate']);
        $('#elecAccountNumber').val(elecArray['accountNumber']);
        $('#elecRefundableDeposit').val(elecArray['refundableDeposit']);
        $('#elecContactPersonAndComments').val(elecArray['contactPersonAndComments']);
        $('#gasCompanyName').val(gasArray['companyName']);
        $('#gasPhoneNumber').val(gasArray['phoneNumber']);
        $('#gasAddress').val(gasArray['address']);
        $('#gasResponsibleParty').val(gasArray['responsibleParty']);
        $('#gasSetupDate').val(gasArray['setupDate']);
        $('#gasClosingDate').val(gasArray['closingDate']);
        $('#gasAccountNumber').val(gasArray['accountNumber']);
        $('#gasRefundableDeposit').val(gasArray['refundableDeposit']);
        $('#gasContactPersonAndComments').val(gasArray['contactPersonAndComments']);
        
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