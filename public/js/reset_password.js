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

        let searchParams = new URLSearchParams(window.location.search)
        if (!searchParams.has('code')) {
            showRegistrationModal("Password Reset failed", "The password reset code is invalid. Please request a password reset request again.");
            return;
        }

        $("#loading_Symbol").show();

        if (!form.checkValidity()) {
            event.stopPropagation();
        } else {
            const confirmPassword = $("#inputConfirmPassword").val();


            const form_fields = {
                code: searchParams.get('code'),
                password: $("#inputPassword").val()
            }

            if (form_fields.password === confirmPassword) {
                $.ajax({
                    type: "POST",
                    url: "/api/account/reset_password",
                    data: JSON.stringify(form_fields),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: (data) => {
                        if (data.result) {
                            showRegistrationModal("Success!", "Your account password has been reset.");
                        } else {
                            showRegistrationModal("Password reset", data.reason);
                        }
                    },
                    error: (errMsg) => {
                        showRegistrationModal("Password reset", "An error happened. Try again later");
                    }
                });
            } else {
                showRegistrationModal("Password", "Your pasword is not the same has the confirmation");
            }

        }

        $("#loading_Symbol").hide();
        form.classList.add('was-validated')
    }, false)
})