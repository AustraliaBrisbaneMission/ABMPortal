/**
 * @fileoverview Online version of Sister Arseneau's apartment forms.
 * @author hilmar.gustafsson@myldsmail.net (Elder Gústafsson)
 * @see '/z Project Visions/Apartment Forms'
 */

/*============================================= PAGE SETUP =============================================*/

/**
 *  A function that runs as soon as the page loads. Sets up the accordion functionality. Sets up the forms from database.
 */

$(document).ready(function()
{
    /* Load forms into the accordion using db.apartmentForms. Using JQuery to create the structure. */
    refreshList();
    getApartmentForms(printApartmentForms);
});

/**
 * Closes everything in the accordion.
 *  Used just to keep a clean look.
 */
 
function addAccordionListeners()
{
    $('.accordion-section-title').click(function(e) {
        // Grab current anchor value
        var currentAttrValue = $(this).attr('href');
 
        if($(e.target).is('.active')) {
            closeAccordionSection();
        }else {
            closeAccordionSection();
 
            // Add active class to section title
            $(this).addClass('active');
            // Open up the hidden content panel
            $('.accordion ' + currentAttrValue).slideDown(300).addClass('open'); 
        }
        e.preventDefault();
    });
}

function closeAccordionSection()
{
    // Close accordion
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(300).removeClass('open');
}


/* Switches the focus of the accordion to the basic apartment information. */
 
function updateAccordion( id )
{
    // Open accordion section based off of id
    this.id = id || 2;
        closeAccordionSection();
        // Add active class to section title
        $('.accordion-section-title[href$="#accordion-' + this.id + '"]').addClass('active');
        // Open up the hidden content panel
        $('.accordion #accordion-' + this.id).slideDown(300).addClass('open'); 
}

/* ============================================= Parsing Operations ============================================= */

/**
 * Parses through apartmentForms results & writes to HTML DOM
 */
function printApartmentForms( forms )
{
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
            input.setAttribute('id', inputName.replace(/ /g,''));
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

/**
 * Calls MONGODB collection apartmentForms.
 * @returns results
 *  Array of all the forms in the database.
 * TODO: Add more options to this later as needed
 */
function getApartmentForms(callback)
{
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

/* Fetches information from database on a specific apartment by its ID. */

function fetchApartment(id, name)
{
    // Load up information on apartment by ID
    $.post("/apartment_information/db", { action: "flatID", flatID: id }, function(myForms)
    {
        getApartmentForms(function(forms){
            for(var index in forms){
                // Local Constants
                var form = forms[index],
                    structure = form['structure'],
                    formName = form['name'];
                
                // Put information in inputs
                for(var input in structure){
                    // Variables
                    var fieldName = structure[input],
                        inputID = '#' + fieldName.replace(/ /g,'') + '-' + index,
                        formIndex = null;
                    // Insert into input
                    $(inputID).val(myForms[0][formName][fieldName]);
                }
                
                // Event listeners
                $('#Form-' + index).unbind('click');
                $('#Form-' + index).click(function(e){
                    
                    // Construct JSON object
                    var jsonData = {};
                        jsonData[formName] = {};
                    for(var input in structure){
                        // Variables
                        var fieldName = structure[input],
                            inputID = '#' + fieldName + '-' + index,
                            fieldValue = $(inputID.replace(/ /g,'')).val();
                        // Insert values into json object
                        jsonData[formName][fieldName] = fieldValue;
                    }
                    update(id, 'apartments', jsonData);
                });
            }
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

function deleteApartment(id, name)
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

/**
 *  This function sends an update request to the server.js file which in turn updates the database.
 * NOTES:
 *  1. Confirm success? Find some way to not refresh the table until success has been confirmed.
 ***/

function update(id, database, data)
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

/**
 *  Adds an apartment to the database.
 * NOTES:
 *  1. Very basic. Doesn't allow to add Zone, District or Area.
 * TODOS:
 *  1. Might want to add options for more information.
 ***/

function addApartment()
{
    // Open up form for adding apartment
    var aptName = prompt('What is the name of the apartment?');
    if(aptName)
    {
        $.post("/apartment_information/db", { action: "createApt", 'House Name': aptName }, function(result){
            refreshList();
        });
    }
}


/***
 *  Queries database for all information on apartments. Sorts alphabetically into table.
 * NOTES:
 *  1. Might want to give the option of ordering information some other way. 
 *     Would probably be easiest to make it dynamic and just change the database query.
 ***/
 
function refreshList()
{
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
        h1Func.setAttribute('onclick', 'addApartment()');
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
            var aptID = apartments[object]['_id'],
                bscINFO = apartments[object]['Basic Information'];
                
            var onClickDelete = "deleteApartment('" + aptID + "','" + bscINFO['House Name'] + "')";
            var onClickFetch = "fetchApartment('" + aptID + "','" + bscINFO['House Name'] + "')";
            
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
                td_2Text = document.createTextNode(bscINFO['House Name']),
                td_3Text = document.createTextNode(bscINFO['Proselyting Area']),
                td_4Text = document.createTextNode(bscINFO['District']),
                td_5Text = document.createTextNode(bscINFO['Zone']);
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