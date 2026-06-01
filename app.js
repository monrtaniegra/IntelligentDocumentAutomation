/* =========================================
   VERIFYINFO AI APP
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    initRoleSelector();

    initLogin();

    initCustomerDashboard();

    initNavigation();

    loadUserDocuments();

});

let uploads = [];

/* =========================================
   ROLE SELECTOR
========================================= */

function initRoleSelector() {
    const roleCards = document.querySelectorAll(".role-card");

    if (!roleCards.length) return;

    roleCards.forEach(card => {
        card.addEventListener("click", () => {
            roleCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            const radio = card.querySelector("input");
            if (radio) radio.checked = true;
        });
    });
}

/* =========================================
   LOGIN
========================================= */

function initLogin() {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", e => {
        e.preventDefault();

        const selectedRole =
            document.querySelector('input[name="role"]:checked')?.value || "customer";

        login();
    });
}

/* =========================================
   CUSTOMER DASHBOARD
========================================= */

function initCustomerDashboard() {
    const uploadBtn = document.getElementById("uploadBtn");
    if (!uploadBtn) return;

    const modal = document.getElementById("uploadModal");
    const closeModal = document.getElementById("closeModal");
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");
    const filePreview = document.getElementById("filePreview");
    const fileNameText = document.getElementById("fileName");
    const submitBtn = document.getElementById("submitUpload");
    const docContainer = document.querySelector(".documents-panel");

    let selectedFile = null;

    uploadBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    closeModal.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", e => {
        handleFile(e.target.files[0]);
    });

    dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.style.background = "#eef2ff";
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.style.background = "";
    });

    dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.style.background = "";
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file) return;

        selectedFile = file;
        filePreview.classList.remove("hidden");
        fileNameText.textContent = file.name;
    }

    submitBtn.addEventListener("click", async () => {
        const currentUser =
            getCurrentUser();
        if (!selectedFile) {
            alert("Please choose a file.");
            return;
        }

        submitBtn.textContent = "Uploading...";
        submitBtn.disabled = true;

        try {
            const fileB64 = await toBase64(selectedFile);

            const payload = {
                file_name: selectedFile.name,
                file_b64: fileB64,
                userEmail: currentUser?.email || "",
                content_type: selectedFile.type || "application/pdf"
            };

            const res = await fetch(CONFIG.uploadUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            modal.classList.add("hidden");

            addProcessingDoc(selectedFile.name, data.documentId);

            selectedFile = null;
            filePreview.classList.add("hidden");

        } catch (err) {
            console.error(err);
            alert(err.message);
        }

        submitBtn.textContent = "Upload & Verify";
        submitBtn.disabled = false;
    });

    async function addProcessingDoc(name, documentId) {
         await loadUserDocuments();
        // const doc = document.createElement("div");
        // doc.className = "doc-item processing";
        // doc.dataset.documentId = documentId;

        // doc.innerHTML = `
        //     <div>
        //         <h4>${name}</h4>
        //         <p>Processing...</p>
        //     </div>
        //     <span>Processing</span>
        // `;

        // docContainer.prepend(doc);
        // // uploads.unshift({
        // //     documentId,
        // //     name,
        // //     status: "ONGOING",
        // //     notes: "Processing..."
        // // });

        // doc.addEventListener("click", () => {
        //     loadStatus(documentId);
        // });
        // if (doc.status === "ONGOING") {

        // pollStatus(doc, documentId);
        // }
        
    }
}

/* =========================================
   STATUS POLLING
========================================= */

function pollStatus(docElement, documentId) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(
                `${CONFIG.statusUrl}?documentId=${documentId}`
            );

            const data = await res.json();

            if (!res.ok) return;
            if (data.status === "ONGOING") return;

            clearInterval(interval);

            await loadUserDocuments();
            

            docElement.onclick = () => {
                data.documentId = documentId;
                populateDetails(data);
            };
            return;
        } catch (err) {
            console.error(err);
        }
    }, 3000);
}

async function loadStatus(documentId) {
    try {
        const res = await fetch(
            `${CONFIG.statusUrl}?documentId=${documentId}`
        );

        const data = await res.json();

        if (res.ok) {
            data.documentId = documentId;
            populateDetails(data);
        }
    } catch (err) {
        console.error(err);
    }
}

/* =========================================
   DETAILS PANEL
========================================= */

async function populateDetails(data) {

    const detailRows = document.querySelectorAll(".detail-row");


    // safer direct targeting
    const fields =
        data.correctedFields ||
        data.extractedFields ||
        data;

    renderCustomerFields(fields);

    const statusEl =
        document.getElementById("customerStatus");

    const notesEl =
        document.getElementById("customerNotes");


    notesEl.textContent =
        data.adminNotes ||
        data.fraudReason ||
        "No notes yet";

    if (data.status === "VERIFIED") {

        statusEl.textContent =
            "VALIDATED";

        statusEl.style.color =
            "#10b981";
    }
    else if (
        data.status === "REVIEW"
    ) {

        statusEl.textContent =
            "NEEDS VALIDATION";

        statusEl.style.color =
            "#ca8a04";
    }
    else if (
        data.status === "FRAUD"
    ) {

        statusEl.textContent =
            "REJECTED";

        statusEl.style.color =
            "#ef4444";
    }
    else {

        statusEl.textContent =
            "PROCESSING";

        statusEl.style.color =
            "#64748b";
    }

    // preview
    if (data.documentId) {
        try {

            const res = await fetch(
                `${CONFIG.previewUrl}?documentId=${data.documentId}`
            );

            const preview = await res.json();

            if (res.ok && preview.url) {
                renderPreview(preview.url, preview.fileName);
            }

        } catch (err) {
            console.error(err);
        }
    }
}

/* =========================================
   PREVIEW
========================================= */

function renderPreview(url, fileName) {
    const previewBox = document.getElementById("previewBox");
    if (!previewBox) return;

    const ext = fileName.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
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
                    style="
                        object-fit:contain;
                        border-radius:20px;
                    "
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
        <a href="${url}" target="_blank">Open document</a>
    `;
}

/* =========================================
   HELPERS
========================================= */

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });


}

/* =========================================
   CUSTOMER NAVIGATION
========================================= */

function initNavigation() {

    const links =
        document.querySelectorAll(".nav-link");

    links.forEach(link => {

        link.addEventListener("click", () => {

            // active state
            links.forEach(l =>
                l.classList.remove("active")
            );

            link.classList.add("active");

            // switch page
            switchView(
                link.dataset.view
            );

        });

    });
}

function switchView(view) {

    const dashboardView =
        document.getElementById(
            "dashboardView"
        );

    const historyView =
        document.getElementById(
            "historyView"
        );

    const profileView =
        document.getElementById(
            "profileView"
        );

    // hide all
    dashboardView.style.display = "none";
    historyView.style.display = "none";
    profileView.style.display = "none";

    // dashboard
    if (
        view === "dashboard" ||
        view === "documents"
    ) {

        dashboardView.style.display =
            "block";

    }

    // history
    else if (view === "history") {

        historyView.style.display =
            "block";

        renderHistory();

    }

    // profile
    else if (view === "profile") {

        profileView.style.display =
            "block";

        updateProfileStats();

    }
}

function renderHistory() {

    const container =
        document.getElementById(
            "historyDocuments"
        );

    if (!container) return;

    container.innerHTML = "";

    const completed =
        uploads.filter(doc =>
            doc.status === "VERIFIED" ||
            doc.status === "FRAUD" ||
            doc.status === "REVIEW"
        );

    if (completed.length === 0) {

        container.innerHTML = `
            <p>No completed verifications yet.</p>
        `;

        return;
    }

    completed.forEach(doc => {

        const div =
            document.createElement("div");

        div.className =
            "document-item";

        div.innerHTML = `
            <div>
                <h4>${doc.name}</h4>

                <p>
                    ${doc.notes || ""}
                </p>
            </div>

            <span class="
                status-badge
                ${doc.status.toLowerCase()}
            ">
                ${doc.status}
            </span>
        `;

        container.appendChild(div);

    });
}

function updateProfileStats() {

    const el =
        document.getElementById(
            "profileUploads"
        );

    if (el) {

        el.textContent =
            uploads.length;

    }
}

async function loadUserDocuments() {

    try {

        const currentUser =
            getCurrentUser();

        if (!currentUser) return;

        const response =
            await fetch(

                `${CONFIG.GET_MY_DOCUMENTS_API}?userEmail=${encodeURIComponent(
                    currentUser.email
                )}`

            );

        const documents =
            await response.json();

        uploads = documents;

        renderDocuments(
            uploads
        );

        updateStats();

    } catch (err) {

        console.error(err);
    }
}

function renderDocuments(documents) {

    const container =
        document.querySelector(
            ".documents-panel"
        );

    if (!container) return;

    container.innerHTML =
        `<h3>Recent Uploads</h3>`;

    documents.sort((a, b) =>
        new Date(
            b.uploadedAt || b.createdAt || 0
        ) -
        new Date(
            a.uploadedAt || a.createdAt || 0
        )
    );


    documents.forEach(doc => {

        const div =
            document.createElement("div");

        let statusClass =
            "processing";

        let statusLabel =
            "Processing";

        if (doc.status === "VERIFIED") {

            statusClass = "verified";
            statusLabel = "Validated";

        } else if (doc.status === "REVIEW") {

            statusClass = "review";
            statusLabel = "Needs validation";

        } else if (doc.status === "FRAUD") {

            statusClass = "fraud";
            statusLabel = "Rejected";
        }

        div.className =
            `doc-item ${statusClass}`;

        div.innerHTML = `
            <div>
                <h4>
                    ${doc.fileName || "Document"}
                </h4>

                <p>
                    ${doc.fraudReason || ""}
                </p>
            </div>

            <span>
                ${statusLabel}
            </span>
        `;

        div.addEventListener(
            "click",
            () => {

                loadStatus(
                    doc.documentId
                );
            }
        );

        container.appendChild(div);
        if (doc.status === "ONGOING") {

            pollStatus(
                div,
                doc.documentId
            );
        }
    });
}

function updateStats() {

    document.getElementById(
        "statTotal"
    ).textContent =
        uploads.length;

    document.getElementById(
        "statVerified"
    ).textContent =
        uploads.filter(
            d => d.status === "VERIFIED"
        ).length;

    document.getElementById(
        "statProcessing"
    ).textContent =
        uploads.filter(
            d => d.status === "ONGOING"
        ).length;

    document.getElementById(
        "statFlagged"
    ).textContent =
        uploads.filter(
            d =>
                d.status === "REVIEW" ||
                d.status === "FRAUD"
        ).length;
}

function initPreviewZoom() {
    const content = document.getElementById("previewPanContent");
    const wrapper = document.getElementById("previewPanWrapper");

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

    document.getElementById("zoomInBtn")?.addEventListener("click", () => {
        scale = Math.min(scale + 0.25, 4);
        updateTransform();
    });

    document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
        scale = Math.max(scale - 0.25, 1);
        if (scale === 1) {
            posX = 0;
            posY = 0;
        }
        updateTransform();
    });

    document.getElementById("zoomResetBtn")?.addEventListener("click", () => {
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
        } else {
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

function renderCustomerFields(fields) {
    const container =
        document.getElementById("customerDynamicFields");

    if (!container) return;

    container.innerHTML =
        Object.entries(fields)
            .filter(([key]) =>
                key.toLowerCase() !== "confidence"
            )
            .sort(([a], [b]) => {
                const priorityA = getFieldPriority(a);
                const priorityB = getFieldPriority(b);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                return a.localeCompare(b);
            })
            .map(([key, value]) => `
                <div class="detail-row">
                    <label>${formatFieldLabel(key)}</label>
                    <span>${value || "-"}</span>
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
        membername: "Member Name",
        memberid: "Member ID",
        policynumber: "Policy Number",
        referencenumber: "Reference Number"
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