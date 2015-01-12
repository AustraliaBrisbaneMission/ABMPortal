// Set up accordion
$(document).ready(function() {

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
    
    // Load the forms onto the accordion divs
    
    // Simple Info
    $('#accordion-2').load("/apartments/editForm.html #editFormDiv-1");
    
    // Apartment Info
    $('#accordion-3').load("apartments/editForm.html #editFormDiv-2");
    
    // Landlord Info
    $('#accordion-4').load("apartments/editForm.html #editFormDiv-3");
    
    // Utilities
    $('#accordion-5').load("apartments/editForm.html #editFormDiv-4");
    
    // Iterate through other forms
});

function close_accordion_section() {
    // Close accordion
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(300).removeClass('open');
}



function updateAccordion(){
    // Open accordion-2
        close_accordion_section();
        // Add active class to section title
        $('.accordion-section-title[href$="#accordion-2"]').addClass('active');
        // Open up the hidden content panel
        $('.accordion #accordion-1').slideDown(300).addClass('open'); 
}

/*============================================= CRUD OPERATIONS =============================================*/

function FetchApartment( id, name ){
    
    // Load up information on apartment by ID
    $.post("/apartment_information/db", { action: "flatID", flatID: id }, function(result)
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
        
        // onClick listeners for submit buttons
        $('#basicInfoSubmit').click(function(e){
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
        
        $('#aptInfoSubmit').click(function(e){
           // Update Apartment Info 
           Update(id, "apartmentForms", 
           {
               formType: 'Apartment Information',
               'id': id,
               address: $('#apartmentAddress').val(),
               phoneNumber: $('#apartmentPhoneNumber').val(),
               rentAmount: $('#apartmentRentAmount').val(),
               dateOpened: $('#apartmentDateOpened').val(),
               lengthofLease: $('#apartmentLengthOfLease').val(),
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
        
        $('#payeeInfoSubmit').click(function(e){
            // Update Payee Info
            Update(id || "", "apartmentForms", 
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
        
        $('#utilSubmit').click(function(e){
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

function Delete(id, name){
    // Confirm deletion
    if(confirm("Are you sure you want to delete " + name + "?")){
        //Delete & forms associated to that flat
        $.post("/apartment_information/db", { action: "delete", _id: id }, function(){
            // TODO: See if deletion was successful
        });
    }
    refreshList();
}

function Update(id, database, data){
    $.post("/apartment_information/db", { action: "update", objectID: id, database: database, data: data }, function(result){
        // Success!
    });
    
    refreshList();
}

function AddApartment(){
    // Open up form for adding apartment
    var aptName = prompt('What is the name of the apartment?');
    $.post("/apartment_information/db", { action: "createApt", houseName: aptName}, function(result){
        refreshList();
    });
}

function refreshList(){
    // Fetch table information from database
    $.post("/apartment_information/db", { action: "get" } , function(result) {
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
        for(var object in result){
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