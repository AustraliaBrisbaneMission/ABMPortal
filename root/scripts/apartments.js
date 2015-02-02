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
    refreshList();
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


/* Switches the focus of the accordion to the basic apartment information. */
 
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
    var accordion = document.getElementById('accordion-section');
    for(var i = 0; i < forms.length; i++)
    {
        // Create Elements
        var formTitle = document.createElement('a'),
            formDiv = document.createElement('div'),
            form = document.createElement('form'),
            formTitleText = document.createTextNode(forms[i]['name']);
        // Create Attributes
        formTitle.setAttribute('class', 'accordion-section-title');
        formTitle.setAttribute('href', '#accordion-' + (i + 2));
        formDiv.setAttribute('id', 'accordion-' + (i + 2));
        formDiv.setAttribute('class', 'accordion-section-content');
        // Append
        accordion.append(formTitle);
        accordion.append(formDiv);
        formTitle.append(formTitleText);
        
        // Populate form
        var structure = forms[i]['structure'];
        for(var j in structure){
            // Local constants
            var name = structure[j],
                inputName = name + '-' + i;
            // Create Elements
            var div = document.createElement('div'),
                label = document.createElement('label'),
                input = document.createElement('input'),
                labelValue = document.createTextNode(name);
            // Create attributes
            label.setAttribute('for', inputName);
            input.setAttribute('type', 'text');
            input.setAttribute('id', inputName);
            // Append
            formDiv.append(div);
            div.append(label);
            div.append(input);
            label.append(labelValue);
        }
        
        // Update button
        var submit = document.createElement('input');
        submit.setAttribute('type', 'button');
        submit.setAttribute('value', 'Update');
        submit.setAttribute('id', 'Form-' + i);
        formDiv.append(submit);
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
        alert('Updating was a success!');
        refreshList();
    });
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
 *  Queries database for all information on apartments. Sorts alphabetically into table.
 * NOTES:
 *  1. Generates HTML on the go. This is to accomodate a more dynamic style. (Might not be the most practical?)
 * TODOS:
 *  1. Might want to give the option of ordering information some other way. 
 *     Would probably be easiest to make it dynamic and just change the database query.
 ***/
 
function refreshList(){
    // Fetch table information from database
    $.post("/apartment_information/db", {action: "get"} , function(apartments) {
        // Clear HTML
        $('#accordion-1').html('');
        
        // Create Elements
        var accordionDiv = document.getElementById('accordion-1'),
            table = document.createElement('table'),
            headerRow = document.createElement('tr'),
            addButton = document.createElement('img'),
            h1Func = document.createElement('a'),
            header1 = document.createElement('th'),
            header2 = document.createElement('th'),
            header3 = document.createElement('th'),
            header4 = document.createElement('th'),
            header5 = document.createElement('th'),
            h2Text = document.createTextNode('House Name'),
            h3Text = document.createTextNode('Proselyting Area'),
            h4Text = document.createTextNode('District'),
            h5Text = document.createTextNode('Zone');
        // Create Attributes
        addButton.setAttribute('src', '/stylesheets/images/addButton.png');
        header1.setAttribute('id', 'delete');
        h1Func.setAttribute('onclick', 'AddApartment()');
        // Append
        accordionDiv.append(table);
        table.append(headerRow);
        headerRow.append(header1);
        header1.append(h1Func);
        h1Func.append(addButton);
        headerRow.append(header2);
        headerRow.append(header3);
        headerRow.append(header4);
        headerRow.append(header5);
        header2.append(h2Text);
        header3.append(h3Text);
        header4.append(h4Text);
        header5.append(h5Text);
        
        // For every object in the database result, iterate through fields and post to table.
        for(var object in apartments)
        {
            var i = apartments[object];
            var onClickDelete = "Delete('" + i['_id'] + "','" + i['houseName'] + "')";
            var onClickFetch = "FetchApartment('" + i['_id'] + "','" + i['houseName'] + "')";
            
            // Create Elements
            var subRow = document.createElement('tr'),
                onDel = document.createElement('a'),
                onFetch = document.createElement('a'),
                delBtn = document.createElement('img'),
                td_1 = document.createElement('td'),
                td_2 = document.createElement('td'),
                td_3 = document.createElement('td'),
                td_4 = document.createElement('td'),
                td_5 = document.createElement('td'),
                td_2Text = document.createTextNode(i['houseName']),
                td_3Text = document.createTextNode(i['proselyingArea']),
                td_4Text = document.createTextNode(i['district']),
                td_5Text = document.createTextNode(i['zone']);
            // Create Attributes
            onDel.setAttribute('onclick', onClickDelete);
            onFetch.setAttribute('onclick', onClickFetch);
            delBtn.setAttribute('src', '/stylesheets/images/deleteButton.png')
            // Append
            table.append(subRow);
            subRow.append(td_1);
            subRow.append(td_2);
            subRow.append(td_3);
            subRow.append(td_4);
            subRow.append(td_5);
            td_1.append(onDel);
            td_2.append(onFetch);
            td_3.append(td_3Text);
            td_4.append(td_4Text);
            td_5.append(td_5Text);
            onDel.append(delBtn);
            onFetch.append(td_2Text);
        }
    });
}