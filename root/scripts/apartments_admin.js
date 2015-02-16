/**
 * @fileoverview Make it possible for Sister Arseneau to edit her own forms.
 * @author hilmar.gustafsson@myldsmail.net (Elder Gústafsson)
 * @see '/z Project Visions/Apartment Forms'
 */
 
$(document).ready(function(){
    loadForms();
});
 
 
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

function loadForms(){
    // Load forms from database
    var editForms = $('.editForms'),
        submitForm = document.createElement('form');
        
    // Append form
    editForms.append(submitForm);
    
    getApartmentForms(function(results){
        for(var formID in results)
        {
            //if(formID === 0) continue; /* Skip basic information */
            var form = results[formID],
            // Create Elements
                heading = document.createElement('h2'),
                table = document.createElement('table'),
                headerTableRow = document.createElement('tr'),
                thName = document.createElement('th'),
                nameInput = document.createElement('input');
            // Name
            heading.append(document.createTextNode('Form ' + formID));
            nameInput.setAttribute('value', form['name']);
            nameInput.setAttribute('style', 'width:342px');
            thName.setAttribute('colspan', '2');
            thName.append(nameInput);
            
            
            // Append
            submitForm.append(heading);
            headerTableRow.append(thName);
            table.append(headerTableRow);
            submitForm.append(table);
            
            // Structure
            for(var itemID in form['structure']){
                // Variables
                var item = form['structure'][itemID],
                    tr = document.createElement('tr'),
                    td1 = document.createElement('td'),
                    td2 = document.createElement('td'),
                    inp1 = document.createElement('input'),
                    inp2 = document.createElement('input');
                // Inputs
                td1.append(inp1);
                td2.append(inp2);
                // Text Nodes
                inp1.setAttribute('value', itemID);
                inp2.setAttribute('value', item);
                // Structural
                tr.append(td1);
                tr.append(td2);
                table.append(tr);
            }
            // Adding Elements
            var addField = document.createElement('a'),
                addForm = document.createElement('a');
            // Their attributes
            addField.setAttribute('class', 'addField-' + formID);
            addForm.setAttribute('class', 'addFormAfter-' + formID);
            addField.append(document.createTextNode('Add Field'));
            addForm.append(document.createTextNode('Add Form'));
            // Append
            submitForm.append(addField);
            submitForm.append(addForm);
            
            addEventListener('.addField-' + formID, addField(formID));
            addEventListener('.addFormAfter-' + formID, addForm);
        }// end foreach form
        
        // Submit button
        var submit = document.createElement('input');
        // Attributes
        submit.setAttribute('type', 'button');
        submit.setAttribute('value', 'Update');
        // Yay!
        submitForm.append(submit);
    });
}

function addEventListener(identifier, action){
    $(identifier).click(action);
}

function addForm(e){
    
}

function addField(formID){
    
}