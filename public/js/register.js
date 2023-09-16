'use strict'

document.getElementById('inputLanguage').value = navigator.language || navigator.userLanguage;

var forms = document.querySelectorAll('.needs-validation');

const showRegistrationModal = (title = "", message = "") => {
    const registrationTitle = $("#registrationTitle");
    const registrationMessage = $("#registrationMessage");

    registrationTitle.html(title);
    registrationMessage.html(message);

    $("#registrationModal").modal('show');
}

// Loop over them and prevent submission
Array.prototype.slice.call(forms).forEach(function (form) {
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        
        $("#loading_Symbol").show();

        if (!form.checkValidity()) {
            event.stopPropagation();
        } else {

            let birth_date = $("#inputBirthDate").val();
            birth_date = +new Date(birth_date);

            const confirmPassword = $("#inputConfirmPassword").val();


            const form_fields = {
                username: $("#inputUsername").val(),
                email: $("#inputEmail").val(),
                first_name: $("#inputFirstName").val(),
                last_name: $("#inputLastName").val(),
                birth_date: birth_date,
                language_code: $("#inputLanguage").val(),
                password: $("#inputPassword").val()
            }

            if (form_fields.password === confirmPassword) {
                $.ajax({
                    type: "POST",
                    url: "/api/account/create",
                    data: JSON.stringify(form_fields),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: (data) => {
                        if(data.result){
                            showRegistrationModal("Success!", "Your account has been created! Check your email to validate your account.");
                        }else{
                            showRegistrationModal("Registration", data.reason);
                        }
                    },
                    error: (errMsg) => {
                        showRegistrationModal("Registration", "An error happened. Try again later");
                    }
                });
            }else{
                showRegistrationModal("Password", "Your pasword is not the same has the confirmation");
            }

        }

        $("#loading_Symbol").hide();
        form.classList.add('was-validated')
    }, false)
})