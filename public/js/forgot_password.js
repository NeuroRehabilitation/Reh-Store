'use strict'

var forms = document.querySelectorAll('.needs-validation');

const showRegistrationModal = (title = "", message = "") => {
    const passwordResetTitle = $("#passwordResetTitle");
    const passwordResetMessage = $("#passwordResetMessage");

    passwordResetTitle.html(title);
    passwordResetMessage.html(message);

    $("#passwordResetModal").modal('show');
}

// Loop over them and prevent submission
Array.prototype.slice.call(forms).forEach(function (form) {
    form.addEventListener('submit', function (event) {
        event.preventDefault();

        $("#loading_Symbol").show();

        if (!form.checkValidity()) {
            event.stopPropagation();
        } else {
            const form_fields = {
                username: $("#inputUsername").val()
            }

            $.ajax({
                type: "POST",
                url: "/api/account/request_password_reset",
                data: JSON.stringify(form_fields),
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: (data) => {
                    if (data.result) {
                        showRegistrationModal("Success!", "If your username is correct, you should receive an email with further instructions.");
                    } else {
                        showRegistrationModal("Something went wrong", data.reason);
                    }
                },
                error: (errMsg) => {
                    showRegistrationModal("Something went wrong", "An error happened. Try again later");
                }
            });

        }

        $("#loading_Symbol").hide();
        form.classList.add('was-validated')
    }, false)
})