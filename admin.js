/* =========================================
   VERIFYINFO AI - ADMIN DASHBOARD
========================================= */

let allDocuments = [];
let selectedDocument = null;
let currentView =
    localStorage.getItem(
        "adminCurrentView"
    ) || "active";

const FIELD_CONFIGS = {
    "US-passports": [
        ["documentType", "Document Type"],
        ["fullName", "Full Name"],
        ["documentNumber", "Document Number"],
        ["dateOfBirth", "Date of Birth"],
        ["expirationDate", "Expiration Date"]
    ],

    "Pre-Authorization Denial Notice": [
        ["Insurance_Provider", "Insurance Provider"],
        ["Member_Name", "Member Name"],
        ["Member_ID", "Member ID"],
        ["Policy_Number", "Policy Number"],
        ["Reference_Number", "Reference Number"],
        ["Notice_Date", "Notice Date"],
        ["Denial_Status", "Denial Status"],
        ["Denial_Reason", "Denial Reason"],
        ["Requested_Service", "Requested Service"],
        ["Requested_Service_Date", "Requested Service Date"],
        ["Requesting_Provider", "Requesting Provider"],
        ["Appeal_Window_Days", "Appeal Window Days"],
        ["CPT_Code", "CPT Code"]
    ]
};


document.addEventListener("DOMContentLoaded", () => {

    loadDocuments();
    clearReviewDetails();
    loadAnalytics();
    initFilters();
    initActions();
    initNavigation();
    // auto refresh queues
    setInterval(() => {

        loadDocuments();

        if (
            currentView === "analytics"
        ) {

            loadAnalytics();
        }

    }, 10000);

    document
        .getElementById("searchInput")
        ?.addEventListener(
            "input",
            applyFilters
        );

    document
        .getElementById("statusFilter")
        ?.addEventListener(
            "change",
            applyFilters
        );

});

/* =========================================
   LOAD DOCUMENTS
========================================= */

async function loadDocuments() {

    try {

        const res = await fetch(
            `${CONFIG.apiBaseUrl}/admin/documents`
        );

        const data = await res.json();

        allDocuments = data.documents || [];

        // restore correct sidebar state
        document
            .querySelectorAll(".nav-link")
            .forEach(link => {

                link.classList.remove("active");

                if (
                    link.dataset.view === currentView
                ) {

                    link.classList.add("active");
                }
            });

        // render correct queue
        refreshCurrentView();

        updateStats(allDocuments);
    } catch (err) {

        console.error(err);
    }
}

/* =========================================
   ANALYTICS
========================================= */

async function loadAnalytics() {

    try {

        const res = await fetch(
            `${CONFIG.apiBaseUrl}/admin/analytics`
        );

        const data = await res.json();

        if (!res.ok) return;

        // values
        document.getElementById(
            "fraudRateValue"
        ).textContent =
            `${data.fraudRate}%`;

        document.getElementById(
            "verificationRateValue"
        ).textContent =
            `${data.verificationRate}%`;

        document.getElementById(
            "avgFraudScore"
        ).textContent =
            data.averageFraudScore;

        // bars
        document.getElementById(
            "fraudRateBar"
        ).style.width =
            `${data.fraudRate}%`;

        document.getElementById(
            "verificationRateBar"
        ).style.width =
            `${data.verificationRate}%`;

        document.getElementById(
            "avgFraudBar"
        ).style.width =
            `${data.averageFraudScore}%`;

        // document types
        const typeList =
            document.getElementById(
                "documentTypeList"
            );

        typeList.innerHTML = "";

        Object.entries(data.documentTypes)
            .forEach(([type, count]) => {

                const row =
                    document.createElement("div");

                row.className = "type-row";

                row.innerHTML = `
                    <span>${type}</span>
                    <strong>${count}</strong>
                `;

                typeList.appendChild(row);

            });

    } catch (err) {

        console.error(err);

    }
}

/* =========================================
   RENDER DOCUMENTS
========================================= */

function renderDocuments(documents) {

    const container =
        document.getElementById("adminDocuments");

    container.innerHTML = "";

    documents.forEach(doc => {


        const div = document.createElement("div");

        let statusClass = "processing";
        let riskBadge = "";

        if (doc.fraudScore >= 60) {

            riskBadge = `
                <span style="
                    background:#fee2e2;
                    color:#b91c1c;
                    padding:4px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:700;
                    margin-left:6px;
                ">
                    HIGH
                </span>
            `;
        }
        else if (doc.fraudScore >= 30) {

            riskBadge = `
                <span style="
                    background:#fef3c7;
                    color:#92400e;
                    padding:4px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:700;
                    margin-left:6px;
                ">
                    MEDIUM
                </span>
            `;
        }
        else {

            riskBadge = `
                <span style="
                    background:#dcfce7;
                    color:#166534;
                    padding:4px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:700;
                    margin-left:6px;
                ">
                    LOW
                </span>
            `;
        }
        const isCompleted =
            doc.reviewState ===
            "COMPLETED";

        if (doc.status === "VERIFIED") {
            statusClass = "verified";
        }
        else if (doc.status === "REVIEW") {
            statusClass = "review";
        }
        else if (doc.status === "FRAUD") {
            statusClass = "fraud";
        }

        div.className = `doc-item ${statusClass}`;

        div.innerHTML = `
            <div>
                <h4>
                    ${doc.fileName || "Unknown File"}
                </h4>

                <p>
                    ${
                        doc.fraudReason ||
                        "No issues detected"
                    }
                </p>

                <small style="
                    color:#64748b;
                    display:block;
                    margin-top:6px;
                ">
                    ${
                        doc.assignedTo
                            ? `Assigned to: ${doc.assignedTo}`
                            : "Unassigned"
                    }
                </small>
                <div style="
                    margin-top:8px;
                ">

                    ${
                        doc.reviewState === "IN_REVIEW"

                        ? `
                            <span style="
                                background:#dbeafe;
                                color:#1d4ed8;
                                padding:4px 10px;
                                border-radius:999px;
                                font-size:12px;
                                font-weight:600;
                            ">
                                In Review
                            </span>
                        `

                        : ""
                    }

                    ${
                        doc.reviewState === "COMPLETED"

                        ? `
                            <span style="
                                background:#dcfce7;
                                color:#166534;
                                padding:4px 10px;
                                border-radius:999px;
                                font-size:12px;
                                font-weight:600;
                            ">
                                Completed
                            </span>
                        `

                        : ""
                    }

                    ${
                        (
                            doc.status === "VERIFIED"
                            ||
                            doc.status === "FRAUD"
                        )
                        &&
                        doc.reviewState !== "COMPLETED"

                        ? `
                            <span style="
                                background:#e0edff;
                                color:#2563eb;
                                padding:4px 10px;
                                border-radius:999px;
                                font-size:12px;
                                font-weight:600;
                                margin-left:6px;
                            ">
                                Auto Completed
                            </span>
                        `

                        : ""
                    }

                </div>

            </div>

            <span>
                ${getDisplayStatus(doc.status)}
                ${riskBadge}
            </span>
                            

        `;

        div.addEventListener("click", () => {
            selectedDocument = doc;
            populateDetails(doc);
        });

        container.appendChild(div);
    });
}

/* =========================================
   FILTERS
========================================= */

function applyFilters() {

    const search =
        document
            .getElementById("searchInput")
            ?.value
            .toLowerCase() || "";

    const status =
        document
            .getElementById("statusFilter")
            ?.value || "";

    let filtered = allDocuments;

    // SEARCH
    if (search) {

        filtered = filtered.filter(doc =>

            (doc.fileName || "")
                .toLowerCase()
                .includes(search)

            ||

            (doc.documentId || "")
                .toLowerCase()
                .includes(search)
        );
    }

    // STATUS FILTER
    if (status) {

        filtered = filtered.filter(doc =>
            doc.status === status
        );
    }

    renderDocuments(filtered);
}


/* =========================================
   UPDATE STATS
========================================= */

function updateStats(documents) {

    document.getElementById("adminTotal").textContent =
        documents.length;

    document.getElementById("adminVerified").textContent =
        documents.filter(d => d.status === "VERIFIED").length;

    document.getElementById("adminReview").textContent =
        documents.filter(d => d.status === "REVIEW").length;

    document.getElementById("adminFraud").textContent =
        documents.filter(d => d.status === "FRAUD").length;
}

/* =========================================
   FILTERS
========================================= */

function initFilters() {

    const buttons =
        document.querySelectorAll(".filter-btn");

    buttons.forEach(btn => {

        btn.addEventListener("click", () => {

            buttons.forEach(b =>
                b.classList.remove("active")
            );

            btn.classList.add("active");

            const filter =
                btn.dataset.filter;

            let docs =
                allDocuments;

            // ACTIVE VIEW
            if (currentView === "active") {

                docs =
                    docs.filter(
                        d =>
                            d.reviewState !== "IN_REVIEW"
                            &&
                            d.reviewState !== "COMPLETED"
                    );
            }

            // COMPLETED VIEW
            else if (
                currentView === "completed"
            ) {

                docs =
                    docs.filter(
                        d =>
                            d.reviewState ===
                            "COMPLETED"
                    );
            }

            // REVIEW VIEW
            else if (
                currentView === "review"
            ) {

                docs =
                    docs.filter(
                        d =>
                            d.reviewState ===
                            "IN_REVIEW"
                    );
            }

            // STATUS FILTER
            if (filter !== "ALL") {

                docs =
                    docs.filter(
                        d =>
                            d.status === filter
                    );
            }

            renderDocuments(docs);

        });

    });
}

/* =========================================
   NAVIGATION
========================================= */

function initNavigation() {

    const links =
        document.querySelectorAll(".nav-link");

    links.forEach(link => {

        link.addEventListener("click", () => {

            links.forEach(l =>
                l.classList.remove("active")
            );

            link.classList.add("active");

            const view =
                link.dataset.view;

            switchView(view);

        });

    });
}

function switchView(view) {
    currentView = view;

    localStorage.setItem(
        "adminCurrentView",
        view
    );
    const topFilters =
    document.getElementById(
        "topFilters"
    );

    const dashboardView =
        document.getElementById(
            "dashboardView"
        );

    const analyticsView =
        document.getElementById(
            "analyticsView"
        );

    dashboardView.style.display = "block";
    analyticsView.style.display = "none";

    // ACTIVE QUEUE
    if (
        view === "active"
    ) {
        topFilters.style.display =
            "flex";

        showAllFilters();
        const activeDocs =
            allDocuments.filter(
                d =>

                    d.status === "REVIEW"

                    &&

                    !d.assignedTo

                    &&

                    d.reviewState !==
                    "COMPLETED"
            );
        renderDocuments(activeDocs);
    }

    // ASSIGNED TO ME
    else if (
        view === "assigned"
    ) {

        topFilters.style.display =
            "none";

        const currentUser =
            getCurrentUser();

        const assignedDocs =
            allDocuments.filter(
                d =>

                    d.assignedTo ===
                    currentUser.email

                    &&

                    d.reviewState !==
                    "COMPLETED"
            );

        renderDocuments(assignedDocs);
    }

    // COMPLETED
    else if (
        view === "completed"
    ) {
       topFilters.style.display =
            "flex";

        showCompletedFilters(); 
        const completedDocs =
            allDocuments.filter(
                d =>

                    d.reviewState === "COMPLETED"

                    ||

                    d.status === "VERIFIED"

                    ||

                    d.status === "FRAUD"
            );

        renderDocuments(completedDocs);
    }

    // ANALYTICS
    else if (
        view === "analytics"
    ) {

        dashboardView.style.display =
            "none";

        analyticsView.style.display =
            "block";
    }
}

/* =========================================
   DETAILS PANEL
========================================= */

async function populateDetails(data) {

    const panel =
        document.getElementById(
            "reviewPanel"
        );

    if (panel) {
        panel.style.display = "block";
    }


    document.getElementById(
        "adminNotes"
    ).style.display = "block";
    [
        "assignBtn",
        "validateBtn"
    ].forEach(id => {

        const btn =
            document.getElementById(id);

        if (btn) {
            btn.style.display = "inline-flex";
        }
    });


    const rows =
        document.querySelectorAll(".detail-row");


    const fields =

        data.correctedFields &&
        Object.keys(data.correctedFields).length > 0

            ? data.correctedFields

            : data.extractedFields || {};

        renderDynamicFields(fields);


    document.getElementById(
            "adminNotes"
        ).value =
            data.adminNotes || "";

    // document
    // .getElementById("validateBtn")
    // .addEventListener("click", completeValidation);



    // preview
    try {

        const res = await fetch(
            `${CONFIG.previewUrl}?documentId=${data.documentId}`
        );

        const preview = await res.json();

        if (res.ok && preview.url) {
            renderPreview(
                preview.url,
                preview.fileName
            );
        }

    } catch (err) {
        console.error(err);
    }
    updateActionPermissions(data);

    renderTimeline(data.history || []);

}

function renderTimeline(history) {

    const timeline =
        document.getElementById(
            "timelineList"
        );

    if (!history.length) {

        timeline.innerHTML = `
            <p style="
                color:#64748b;
            ">
                No activity yet.
            </p>
        `;

        return;
    }

    timeline.innerHTML =
        history
            .slice()
            .reverse()
            .map(item => `

                <div style="
                    padding:10px 0;
                    border-bottom:
                        1px solid #e5e7eb;
                ">

                    <div style="
                        font-size:13px;
                        font-weight:600;
                        color:#111827;
                    ">
                        ${item.action}
                    </div>

                    <div style="
                        font-size:12px;
                        color:#64748b;
                        margin-top:4px;
                    ">
                        ${
                            new Date(
                                item.time
                            ).toLocaleString()
                        }
                    </div>

                </div>

            `)
            .join("");
}


/* =========================================
   ACTIONS
========================================= */

function initActions() {

    const assignBtn =
        document.getElementById(
            "assignBtn"
        );

    assignBtn?.addEventListener(
        "click",
        () => {

            if (!selectedDocument) {

                showToast(
                    "Select a document first."
                );

                return;
            }

            assignToMe(
                selectedDocument.documentId
            );
        }
    );

    const validateBtn =
        document.getElementById(
            "validateBtn"
        );

    validateBtn?.addEventListener(
        "click",
        completeValidation
    );

    const rejectBtn =
    document.getElementById(
        "rejectBtn"
    );

    rejectBtn?.addEventListener(
        "click",
        rejectDocument
    );
}

/* =========================================
   UPDATE STATUS
========================================= */



/* =========================================
   PREVIEW
========================================= */

function renderPreview(url, fileName) {

    const previewBox =
        document.getElementById("previewBox");

    if (!previewBox) return;

    const ext =
        fileName.split(".").pop().toLowerCase();

    if (
        ["jpg", "jpeg", "png", "gif", "webp"]
        .includes(ext)
    ) {

        previewBox.innerHTML = `
            <div class="preview-toolbar">
                <button id="zoomOutBtn">−</button>
                <button id="zoomResetBtn">Reset</button>
                <button id="zoomInBtn">+</button>
            </div>

            <div class="preview-pan-wrapper" id="previewPanWrapper">
                <img
                    id="previewPanContent"
                    class="preview-pan-content"
                    src="${url}"
                />
            </div>
        `;

        initPreviewZoom();

        return;
    }

    if (ext === "pdf") {

        previewBox.innerHTML = `
            <embed
                src="${url}#toolbar=1&navpanes=0&scrollbar=1"
                type="application/pdf"
                style="
                    width:100%;
                    height:100%;
                    border:none;
                    border-radius:20px;
                    background:white;
                "
            />
        `;

        return;
    }

    previewBox.innerHTML = `
        <a href="${url}" target="_blank">
            Open document
        </a>
    `;
}

/* =========================================
   ASSIGNMENT
========================================= */

async function assignToMe(documentId) {

    try {

        const currentUser =
            getCurrentUser();
        
        if (
            selectedDocument.assignedTo &&
            selectedDocument.assignedTo !== currentUser.email
        ) {

            showToast(
                `Already assigned to ${selectedDocument.assignedTo}`
            );

            return;
        }

        const response =
            await fetch(
                `${CONFIG.apiBaseUrl}/admin/update`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        documentId,

                        assignedTo:
                            currentUser.email,

                        reviewState:
                            "IN_REVIEW"
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error
            );
        }

        showToast(
            "Document assigned successfully."
        );
        const doc =
            allDocuments.find(
                d => d.documentId === documentId
            );

        if (doc) {

            doc.assignedTo =
                currentUser.email;

            doc.reviewState =
                "IN_REVIEW";
}

        // instantly refresh UI
        refreshCurrentView();
        clearReviewDetails();
        selectedDocument = null;
        //populateDetails(selectedDocument);




    } catch (err) {

        console.error(err);

        showToast(err.message);
    }
}

/* =========================================
   CUSTOM MODAL
========================================= */

function showConfirmModal(message) {

    return new Promise(resolve => {

        const modal =
            document.getElementById(
                "customModal"
            );

        const messageEl =
            document.getElementById(
                "modalMessage"
            );

        const confirmBtn =
            document.getElementById(
                "modalConfirm"
            );

        const cancelBtn =
            document.getElementById(
                "modalCancel"
            );

        messageEl.textContent =
            message;

        modal.classList.remove(
            "hidden"
        );

        confirmBtn.onclick = () => {

            modal.classList.add(
                "hidden"
            );

            resolve(true);
        };

        cancelBtn.onclick = () => {

            modal.classList.add(
                "hidden"
            );

            resolve(false);
        };
    });
}

/* =========================================
   TOAST
========================================= */

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

function showAllFilters() {

    document.querySelector(
        '[data-filter="ALL"]'
    ).style.display = "inline-flex";

    document.querySelector(
        '[data-filter="VERIFIED"]'
    ).style.display = "none";

    document.querySelector(
        '[data-filter="FRAUD"]'
    ).style.display = "none";

    document.querySelector(
        '[data-filter="ONGOING"]'
    ).style.display = "none";
}

function showCompletedFilters() {

    document.querySelector(
        '[data-filter="ALL"]'
    ).style.display = "inline-flex";

    document.querySelector(
        '[data-filter="VERIFIED"]'
    ).style.display = "inline-flex";

    document.querySelector(
        '[data-filter="FRAUD"]'
    ).style.display = "inline-flex";

    document.querySelector(
        '[data-filter="ONGOING"]'
    ).style.display = "none";
}

function refreshCurrentView() {

    switchView(currentView);
}

function updateActionPermissions(doc) {

    const rejectBtn =
    document.getElementById(
        "rejectBtn"
    );

    const completedInfo =
        document.getElementById(
            "completedInfo"
        );

    const fieldInputs =
        document.querySelectorAll(
            ".field-editor input"
        );
    
    const currentUser =
        getCurrentUser();

    const assignBtn =
        document.getElementById(
            "assignBtn"
        );

    const validateBtn =
        document.getElementById(
            "validateBtn"
        );

    const notes =
        document.getElementById(
            "adminNotes"
        );

    const isCompleted =

    doc.reviewState === "COMPLETED"

    ||

    doc.status === "VERIFIED"

    ||

    doc.status === "FRAUD";

    const assignedToOther =
        doc.assignedTo
        &&
        doc.assignedTo !==
        currentUser.email;

    // COMPLETED
    if (isCompleted) {

        rejectBtn.style.display = "none";

        assignBtn.style.display =
            "none";

        validateBtn.style.display =
            "none";

        notes.disabled = true;

        // lock fields
        fieldInputs.forEach(input => {

            input.disabled = true;
        });

        // show completed info
        completedInfo.style.display =
            "block";

        completedInfo.innerHTML = `
            <div style="
                margin-top:20px;
                padding:16px;
                background:#f8fafc;
                border:1px solid #e2e8f0;
                border-radius:16px;
            ">

                <div style="
                    font-size:13px;
                    color:#64748b;
                    margin-bottom:8px;
                ">
                    Validation completed by
                </div>

                <div style="
                    font-weight:600;
                    color:#111827;
                    margin-bottom:14px;
                ">
                    ${
                        doc.assignedTo ||
                        "System Auto Validation"
                    }
                </div>

                <div style="
                    font-size:13px;
                    color:#64748b;
                    margin-bottom:8px;
                ">
                    Completed
                </div>

                <div style="
                    font-weight:600;
                    color:#111827;
                ">
                    ${
                        doc.reviewedAt
                        ? new Date(
                            doc.reviewedAt
                        ).toLocaleString()
                        : "N/A"
                    }
                </div>

            </div>
        `;

        return;
    }

    // editable during review
    fieldInputs.forEach(input => {

        input.disabled = false;
    });

    // hide completed info
    completedInfo.style.display =
        "none";

    // ASSIGNED TO OTHER ADMIN
    if (assignedToOther) {

        
        rejectBtn.style.display = "inline-flex";
        assignBtn.style.display =
            "none";

        validateBtn.style.display =
            "none";

        notes.disabled = true;

        return;
    }

    // UNASSIGNED / ACTIVE QUEUE
    if (!doc.assignedTo) {

        rejectBtn.style.display = "none";
        assignBtn.style.display =
            "inline-flex";

        validateBtn.style.display =
            "none";

        notes.disabled = true;

        fieldInputs.forEach(input => {
            input.disabled = true;
        });

        return;
    }

    // ASSIGNED TO CURRENT USER
    assignBtn.style.display =
        "none";
    
    

    validateBtn.style.display =
        "inline-flex";

    rejectBtn.style.display = "inline-flex";

    notes.disabled = false;
}

/* =========================================
   CLEAR EMPTY STATE
========================================= */

function clearReviewDetails() {

    const panel =
        document.getElementById(
            "reviewPanel"
        );

    if (panel) {
        panel.style.display = "none";
    }

    const previewBox =
        document.getElementById(
            "previewBox"
        );

    if (previewBox) {
        previewBox.innerHTML = `
            <p style="
                color:#64748b;
                text-align:center;
                margin-top:40px;
            ">
                Select a document to review
            </p>
        `;
    }

    document
        .querySelectorAll(".detail-row span")
        .forEach(span => {

            span.textContent = "";
        });

    const notes =
        document.getElementById(
            "adminNotes"
        );

    notes.value = "";

    notes.style.display = "none";

    // hide buttons
    [
        "assignBtn",
        "validateBtn"
    ].forEach(id => {

        const btn =
            document.getElementById(id);

        if (btn) {

            btn.style.display =
                "none";
        }
    });
}


async function completeValidation() {

    if (!selectedDocument) {
        showToast("Select a document first.");
        return;
    }

    const currentUser = getCurrentUser();

    if (!selectedDocument.assignedTo) {
        showToast("Assign this document to yourself first.");
        return;
    }

    if (selectedDocument.assignedTo !== currentUser.email) {
        showToast(`Assigned to ${selectedDocument.assignedTo}`);
        return;
    }

        const correctedFields = {};

        document
            .querySelectorAll("#dynamicFields input")
            .forEach(input => {
                correctedFields[input.dataset.fieldKey] =
                    input.value.trim();
            });

        const confirmed =
            await showConfirmModal(
                "Complete validation for this document?\n\nThis will move it to the completed queue."
            );

        if (!confirmed) return;

        const res = await fetch(
        `${CONFIG.apiBaseUrl}/admin/update`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                documentId: selectedDocument.documentId,
                status: "VERIFIED",
                reviewState: "COMPLETED",
                correctedFields,
                adminNotes:
                    document.getElementById("adminNotes").value
            })
        }
    );

    const data = await res.json();

    if (!res.ok) {
        showToast(data.error || "Validation failed");
        return;
    }

    showToast("Validation completed.");

    selectedDocument.status = "VERIFIED";
    selectedDocument.reviewState = "COMPLETED";
    selectedDocument.correctedFields = correctedFields;

    refreshCurrentView();
    clearReviewDetails();
    selectedDocument = null;
}

async function rejectDocument() {

    if (!selectedDocument) {
        showToast("Select a document first.");
        return;
    }

    const currentUser = getCurrentUser();

    if (!selectedDocument.assignedTo) {
        showToast("Assign this document to yourself first.");
        return;
    }

    if (selectedDocument.assignedTo !== currentUser.email) {
        showToast(`Assigned to ${selectedDocument.assignedTo}`);
        return;
    }

    const reason =
        document.getElementById("adminNotes").value.trim();

    if (!reason) {
        showToast("Please add rejection reason in admin notes.");
        return;
    }

    const confirmed =
        await showConfirmModal(
            "Reject this document?\n\nThis will mark the document as invalid."
        );

    if (!confirmed) return;

    const res = await fetch(
        `${CONFIG.apiBaseUrl}/admin/update`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                documentId: selectedDocument.documentId,
                status: "FRAUD",
                reviewState: "COMPLETED",
                adminNotes: reason
            })
        }
    );

    const data = await res.json();

    if (!res.ok) {
        showToast(data.error || "Reject failed");
        return;
    }

    showToast("Document rejected.");

    selectedDocument.status = "FRAUD";
    selectedDocument.reviewState = "COMPLETED";
    selectedDocument.adminNotes = reason;

    refreshCurrentView();
    clearReviewDetails();
    selectedDocument = null;
}

function initPreviewZoom() {

    const content =
        document.getElementById("previewPanContent");

    const wrapper =
        document.getElementById("previewPanWrapper");

    if (!content || !wrapper) return;

    let scale = 1;
    let posX = 0;
    let posY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    function updateTransform() {
        content.style.transform =
            `translate(${posX}px, ${posY}px) scale(${scale})`;
    }

    document
        .getElementById("zoomInBtn")
        ?.addEventListener("click", () => {
            scale = Math.min(scale + 0.25, 4);
            updateTransform();
        });

    document
        .getElementById("zoomOutBtn")
        ?.addEventListener("click", () => {
            scale = Math.max(scale - 0.25, 1);

            if (scale === 1) {
                posX = 0;
                posY = 0;
            }

            updateTransform();
        });

    document
        .getElementById("zoomResetBtn")
        ?.addEventListener("click", () => {
            scale = 1;
            posX = 0;
            posY = 0;
            updateTransform();
        });

    wrapper.addEventListener("mousedown", e => {

        if (scale <= 1) return;

        isDragging = true;
        startX = e.clientX - posX;
        startY = e.clientY - posY;
    });

    window.addEventListener("mousemove", e => {

        if (!isDragging) return;

        posX = e.clientX - startX;
        posY = e.clientY - startY;

        updateTransform();
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    wrapper.addEventListener("wheel", e => {

        e.preventDefault();

        if (e.deltaY < 0) {
            scale = Math.min(scale + 0.15, 4);
        }
        else {
            scale = Math.max(scale - 0.15, 1);

            if (scale === 1) {
                posX = 0;
                posY = 0;
            }
        }

        updateTransform();
    });
}

function normalizeFieldKey(key) {
    return key
        .toLowerCase()
        .replace(/_/g, "")
        .replace(/-/g, "")
        .replace(/\s/g, "");
}

function getFieldPriority(key) {

    const normalized =
        normalizeFieldKey(key);

    if (normalized === "documenttype") return 1;

    if ([
        "fullname",
        "name",
        "membername",
        "patientname"
    ].includes(normalized)) return 2;

    if ([
        "memberid",
        "dateofbirth",
        "dob"
    ].includes(normalized)) return 3;

    if ([
        "policynumber",
        "documentnumber",
        "passportnumber",
        "licensenumber"
    ].includes(normalized)) return 4;

    if ([
        "referencenumber",
        "expirationdate",
        "expirydate"
    ].includes(normalized)) return 5;

    return 99;
}

function renderDynamicFields(fields) {
    const container =
        document.getElementById("dynamicFields");

    if (!container) return;

    const config =
        Object.keys(fields)
            .filter(key =>
                key.toLowerCase() !== "confidence"
            )
            .sort((a, b) => {

                const priorityA =
                    getFieldPriority(a);

                const priorityB =
                    getFieldPriority(b);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                return a.localeCompare(b);
            })
            .map(key => [
                key,
                formatFieldLabel(key)
            ]);

    container.innerHTML = config
        .map(([key, label]) => `
            <div class="field-editor">
                <label>${label}</label>
                <input
                    data-field-key="${key}"
                    type="text"
                    value="${fields[key] || ""}"
                >
            </div>
        `)
        .join("");
}

function formatFieldLabel(key) {

    const customLabels = {
        documenttype: "Document Type",
        documentnumber: "Document Number",
        dateofbirth: "Date Of Birth",
        expirationdate: "Expiration Date",
        dateofissue: "Date Of Issue",
        placeofbirth: "Place Of Birth",
        fullname: "Full Name",
        memberid: "Member ID",
        policynumber: "Policy Number"
    };

    const normalized =
        key.toLowerCase().replace(/_/g, "");

    if (customLabels[normalized]) {
        return customLabels[normalized];
    }

    return key
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function getDisplayStatus(status) {

    if (status === "VERIFIED") {
        return "VERIFIED";
    }

    if (status === "REVIEW") {
        return "REVIEW";
    }

    if (status === "FRAUD") {
        return "REJECTED";
    }

    return status || "PROCESSING";
}