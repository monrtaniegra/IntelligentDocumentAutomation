/* =========================================
   VERIFYINFO AI AUTH
========================================= */
const AmazonCognitoIdentity =
    window.AmazonCognitoIdentity;

const poolData = {

    UserPoolId:
        "us-east-1_oa6EXZtdZ",

    ClientId:
        "2v92nd5jhm6d96lir008pvgmi9"
};

const userPool =
    new AmazonCognitoIdentity
        .CognitoUserPool(poolData);

/* =========================================
   LOGIN
========================================= */

function loginUser(email, password, role) {

    const authenticationDetails =
        new AmazonCognitoIdentity.AuthenticationDetails({
            Username: email,
            Password: password
        });

    const userData = {
        Username: email,
        Pool: userPool
    };

    const cognitoUser =
        new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {

        onSuccess: function (result) {

            console.log("LOGIN SUCCESS");

            localStorage.setItem(
                "verifyinfo_token",
                result.getIdToken().getJwtToken()
            );

            localStorage.setItem(
                "verifyinfo_role",
                role
            );

            const payload =
                result.getIdToken().decodePayload();

            const groups =
                payload["cognito:groups"] || [];

            const isManager =
                groups.includes("Managers");

            const isAgent =
                groups.includes("Agents") ||
                groups.includes("Admins");

            if (role === "admin") {

                if (!isManager && !isAgent) {

                    showToast(
                        "You are not authorized for Admin Portal"
                    );

                    return;
                }

                window.location.href =
                    "admin.html";
            } else {

                window.location.href = "customer.html";
            }
        },

        onFailure: function (err) {
            showToast(err.message || JSON.stringify(err));
        },

        newPasswordRequired: function (
            userAttributes,
            requiredAttributes
        ) {

            const modal =
                document.getElementById("passwordModal");

            const submitBtn =
                document.getElementById("submitNewPassword");

            const passwordInput =
                document.getElementById("newPasswordInput");

            modal.classList.remove("hidden");

            submitBtn.onclick = function () {

                const newPassword = passwordInput.value;

                if (!newPassword || newPassword.length < 8) {
                    showToast("Password must be at least 8 characters");
                    return;
                }

                submitBtn.innerText = "Saving...";

                cognitoUser.completeNewPasswordChallenge(
                    newPassword,
                    {},
                    {

                        onSuccess: function () {

                            modal.classList.add("hidden");

                            showToast(
                                "Password updated successfully. Please login again."
                            );

                            window.location.reload();
                        },

                        onFailure: function (err) {

                            submitBtn.innerText =
                                "Save Password";

                            showToast(
                                err.message || JSON.stringify(err)
                            );
                        }
                    }
                );
            };
        }
    });
}

/* =========================================
   SIGN UP
========================================= */

function signupUser(email, password) {

    const attributeList = [];

    const dataEmail = {

        Name: "email",
        Value: email
    };

    const attributeEmail =
        new AmazonCognitoIdentity
            .CognitoUserAttribute(
                dataEmail
            );

    attributeList.push(
        attributeEmail
    );

    userPool.signUp(
        email,
        password,
        attributeList,
        null,

        (err, result) => {

            if (err) {

                showToast(err.message);

                return;
            }

            showToast(
                "Signup successful. Check your email for verification code."
            );
        }
    );
}

/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.clear();

    window.location.href =
        "login.html";
}

/* =========================================
   CHECK AUTH
========================================= */

function isAuthenticated() {

    return !!localStorage.getItem(
        "verifyinfo_token"
    );
}

function requireAuth() {

    const protectedPages = [
        "customer.html",
        "admin.html"
    ];

    const currentPage =
        window.location.pathname
            .split("/")
            .pop();

    if (
        protectedPages.includes(
            currentPage
        ) &&
        !isAuthenticated()
    ) {

        window.location.href =
            "login.html";
    }
}

/* =========================================
   INIT
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        requireAuth();

        // login form
        const loginBtn =
            document.getElementById(
                "loginBtn"
            );

        if (loginBtn) {

            loginBtn.addEventListener(
                "click",
                () => {

                    const email =
                        document.getElementById(
                            "email"
                        ).value;

                    const password =
                        document.getElementById(
                            "password"
                        ).value;

                    const role =
                        document.querySelector(
                            'input[name="role"]:checked'
                        ).value;

                    console.log("Selected role:", role);

                    loginUser(
                        email,
                        password,
                        role
                    );
                }
            );
        }

        // logout buttons
        document
            .querySelectorAll(
                '[href="index.html"]'
            )
            .forEach(btn => {

                btn.addEventListener(
                    "click",
                    e => {

                        e.preventDefault();

                        logout();

                    }
                );
            });
    }


);

const roleCards =
    document.querySelectorAll(".role-card");

roleCards.forEach(card => {

    card.addEventListener("click", () => {

        roleCards.forEach(c =>
            c.classList.remove("active")
        );

        card.classList.add("active");

        const radio =
            card.querySelector("input");

        radio.checked = true;
    });
});

/* =========================================
   CURRENT USER
========================================= */

function getCurrentUser() {

    const token =
        localStorage.getItem(
            "verifyinfo_token"
        );

    if (!token) {
        console.log("NO TOKEN");
        return null;
    }

    try {

        const payload =
            JSON.parse(
                atob(
                    token.split(".")[1]
                )
            );

        console.log(
            "FULL TOKEN PAYLOAD:",
            payload
        );

        const email =

            payload.email ||

            payload["cognito:username"] ||

            payload.username ||

            "";

        console.log(
            "RESOLVED EMAIL:",
            email
        );

        return {

            email,

            groups:
                payload["cognito:groups"] || []
        };

    } catch (err) {

        console.error(
            "TOKEN PARSE ERROR:",
            err
        );

        return null;
    }
}

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.remove(
        "hidden"
    );

    setTimeout(() => {

        toast.classList.add(
            "hidden"
        );

    }, 2500);
}

function isManager() {

    const user = getCurrentUser();

    return user &&
        user.groups &&
        user.groups.includes("Managers");
}

function isAgent() {

    const user = getCurrentUser();

    return user &&
        user.groups &&
        (
            user.groups.includes("Agents") ||
            user.groups.includes("Admins")
        );
}