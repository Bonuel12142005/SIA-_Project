document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
  const passwordInput = toggle.parentElement?.querySelector("[data-password-input]");
  if (!passwordInput) {
    throw new Error("A password visibility button is missing its password input.");
  }

  toggle.addEventListener("click", () => {
    const shouldShowPassword = passwordInput.type === "password";
    passwordInput.type = shouldShowPassword ? "text" : "password";
    toggle.setAttribute("aria-label", shouldShowPassword ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(shouldShowPassword));
  });
});

document.querySelectorAll('.equipment-form input[name="photo"]').forEach((equipmentPhotoInput) => {
  const equipmentForm = equipmentPhotoInput.closest(".equipment-form");
  const equipmentPhotoPreview = equipmentForm?.querySelector("[data-photo-preview]");
  const equipmentPhotoPlaceholder = equipmentForm?.querySelector("[data-photo-placeholder]");
  if (!equipmentPhotoPreview || !equipmentPhotoPlaceholder) {
    throw new Error("An equipment photo input is missing its preview elements.");
  }

  let previewUrl = "";
  const choosePhotoButton = equipmentForm.querySelector("[data-choose-equipment-photo]");

  choosePhotoButton?.addEventListener("click", () => equipmentPhotoInput.click());

  equipmentPhotoInput.addEventListener("change", () => {
    const [file] = equipmentPhotoInput.files || [];
    if (!file) return;

    const supportedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!supportedTypes.includes(file.type)) {
      equipmentPhotoInput.setCustomValidity("Choose a PNG, JPG, or GIF image.");
      equipmentPhotoInput.reportValidity();
      equipmentPhotoInput.setCustomValidity("");
      equipmentPhotoInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      equipmentPhotoInput.setCustomValidity("Choose an image that is 5 MB or smaller.");
      equipmentPhotoInput.reportValidity();
      equipmentPhotoInput.setCustomValidity("");
      equipmentPhotoInput.value = "";
      return;
    }

    equipmentPhotoInput.setCustomValidity("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    equipmentPhotoPreview.src = previewUrl;
    equipmentPhotoPreview.hidden = false;
    equipmentPhotoPlaceholder.hidden = true;
  });

  window.addEventListener("pagehide", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, { once: true });
});

const addEquipmentDialog = document.querySelector("#add-equipment-dialog");
const openAddEquipmentButtons = document.querySelectorAll("[data-open-add-equipment]");

function openAddEquipmentModal() {
  if (!addEquipmentDialog || addEquipmentDialog.open) return;
  addEquipmentDialog.showModal();
}

if (addEquipmentDialog && openAddEquipmentButtons.length) {
  const closeAddEquipmentButtons = addEquipmentDialog.querySelectorAll("[data-close-add-equipment]");

  openAddEquipmentButtons.forEach((button) => {
    button.addEventListener("click", openAddEquipmentModal);
  });

  closeAddEquipmentButtons.forEach((button) => {
    button.addEventListener("click", () => addEquipmentDialog.close());
  });

  addEquipmentDialog.addEventListener("click", (event) => {
    if (event.target === addEquipmentDialog) addEquipmentDialog.close();
  });
}

const newBorrowingDialog = document.querySelector("#new-borrowing-dialog");

if (newBorrowingDialog) {
  const openNewBorrowingButtons = document.querySelectorAll("[data-open-new-borrowing]");
  const closeNewBorrowingButtons = newBorrowingDialog.querySelectorAll("[data-close-new-borrowing]");
  const borrowingForm = newBorrowingDialog.querySelector("[data-new-borrowing-form]");
  const equipmentSelect = newBorrowingDialog.querySelector("[data-new-borrowing-equipment]");
  const quantityInput = newBorrowingDialog.querySelector("[data-new-borrowing-quantity]");
  const availabilityText = newBorrowingDialog.querySelector("[data-new-borrowing-availability]");

  if (!borrowingForm) {
    throw new Error("The new borrowing dialog is missing its form.");
  }

  const updateBorrowingEquipment = () => {
    const selectedOption = equipmentSelect?.selectedOptions[0];
    const equipmentId = selectedOption?.value;
    const availableQuantity = Number(selectedOption?.dataset.availableQuantity);

    if (!equipmentId || !Number.isSafeInteger(availableQuantity) || availableQuantity < 1) {
      borrowingForm.removeAttribute("action");
      if (quantityInput) quantityInput.removeAttribute("max");
      if (availabilityText) availabilityText.textContent = "Select an item to see availability.";
      return;
    }

    borrowingForm.action = `/equipment/${encodeURIComponent(equipmentId)}/borrow`;
    if (quantityInput) {
      quantityInput.max = String(availableQuantity);
      if (Number(quantityInput.value) > availableQuantity) quantityInput.value = String(availableQuantity);
    }
    if (availabilityText) availabilityText.textContent = `${availableQuantity} unit(s) available`;
  };

  equipmentSelect?.addEventListener("change", updateBorrowingEquipment);

  openNewBorrowingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      borrowingForm.reset();
      if (equipmentSelect && equipmentSelect.options.length > 1) equipmentSelect.selectedIndex = 1;
      updateBorrowingEquipment();
      newBorrowingDialog.showModal();
    });
  });

  closeNewBorrowingButtons.forEach((button) => {
    button.addEventListener("click", () => newBorrowingDialog.close());
  });

  newBorrowingDialog.addEventListener("click", (event) => {
    if (event.target === newBorrowingDialog) newBorrowingDialog.close();
  });
}

const equipmentDetailsDialog = document.querySelector("#equipment-details-dialog");
const equipmentEditDialog = document.querySelector("#equipment-edit-dialog");

if (equipmentDetailsDialog && equipmentEditDialog) {
  const detailOpeners = document.querySelectorAll("[data-open-equipment-details]");
  const closeDetailsButtons = equipmentDetailsDialog.querySelectorAll("[data-close-equipment-details]");
  const editFromDetailsButton = equipmentDetailsDialog.querySelector("[data-open-edit-from-details]");
  const editForm = equipmentEditDialog.querySelector("[data-edit-equipment-form]");
  let selectedEquipment = null;

  if (!editFromDetailsButton || !editForm) {
    throw new Error("The equipment details modal is missing its edit action.");
  }

  const setDetailsText = (selector, value) => {
    const element = equipmentDetailsDialog.querySelector(selector);
    if (!element) throw new Error(`The equipment details modal is missing ${selector}.`);
    element.textContent = value || "—";
  };

  function openViewEquipmentModal(itemData) {
    selectedEquipment = itemData;
    setDetailsText("[data-details-name]", itemData.equipmentName);
    setDetailsText("[data-details-category]", itemData.equipmentCategory);
    setDetailsText("[data-details-status]", itemData.equipmentStatus);
    const statusBadge = equipmentDetailsDialog.querySelector("[data-details-status]");
    if (!statusBadge) throw new Error("The equipment details modal is missing its availability badge.");
    statusBadge.className = "status-badge equipment-details-status";
    statusBadge.classList.add(
      itemData.equipmentStatus === "Available"
        ? "equipment-details-status-available"
        : itemData.equipmentStatus === "Archived"
          ? "equipment-details-status-archived"
          : "equipment-details-status-unavailable"
    );
    setDetailsText("[data-details-total]", itemData.equipmentTotal);
    setDetailsText("[data-details-available]", itemData.equipmentAvailable);
    setDetailsText("[data-details-borrowed]", itemData.equipmentBorrowed);
    setDetailsText("[data-details-condition]", itemData.equipmentCondition);
    setDetailsText("[data-details-date]", itemData.equipmentDate);
    setDetailsText("[data-details-description]", itemData.equipmentDescription || "No description provided.");

    const photo = equipmentDetailsDialog.querySelector("[data-details-photo]");
    const photoPlaceholder = equipmentDetailsDialog.querySelector("[data-details-photo-placeholder]");
    if (!photo || !photoPlaceholder) {
      throw new Error("The equipment details modal is missing its photo preview.");
    }

    if (itemData.equipmentPhoto) {
      photo.src = itemData.equipmentPhoto;
      photo.alt = `Photo of ${itemData.equipmentName}`;
      photo.hidden = false;
      photoPlaceholder.hidden = true;
    } else {
      photo.removeAttribute("src");
      photo.alt = "";
      photo.hidden = true;
      photoPlaceholder.hidden = false;
    }

    equipmentDetailsDialog.showModal();
  }

  detailOpeners.forEach((button) => {
    button.addEventListener("click", () => {
      const itemRow = button.closest("tr");
      if (!itemRow) throw new Error("The equipment details action is not inside an equipment row.");
      openViewEquipmentModal(itemRow.dataset);
    });
  });

  closeDetailsButtons.forEach((button) => {
    button.addEventListener("click", () => equipmentDetailsDialog.close());
  });

  equipmentDetailsDialog.addEventListener("click", (event) => {
    if (event.target === equipmentDetailsDialog) equipmentDetailsDialog.close();
  });

  editFromDetailsButton.addEventListener("click", () => {
    if (!selectedEquipment?.equipmentId) {
      throw new Error("No equipment item is selected for editing.");
    }

    editForm.reset();
    editForm.action = `/equipment/${encodeURIComponent(selectedEquipment.equipmentId)}`;

    const nameInput = editForm.querySelector("[data-edit-equipment-name]");
    const categoryInput = editForm.querySelector("[data-edit-equipment-category]");
    const totalInput = editForm.querySelector("[data-edit-equipment-total]");
    const borrowedNote = editForm.querySelector("[data-edit-equipment-borrowed]");
    const descriptionInput = editForm.querySelector("[data-edit-equipment-description]");
    const photoPreview = editForm.querySelector("[data-photo-preview]");
    const photoPlaceholder = editForm.querySelector("[data-photo-placeholder]");

    if (!nameInput || !categoryInput || !totalInput || !borrowedNote || !descriptionInput || !photoPreview || !photoPlaceholder) {
      throw new Error("The equipment edit modal is missing required form fields.");
    }

    nameInput.value = selectedEquipment.equipmentName || "";
    categoryInput.value = selectedEquipment.equipmentCategory || "";
    totalInput.value = selectedEquipment.equipmentTotal || "0";
    totalInput.min = selectedEquipment.equipmentMinimum || "0";
    borrowedNote.textContent = `Currently borrowed: ${selectedEquipment.equipmentBorrowed || "0"}.`;
    descriptionInput.value = selectedEquipment.equipmentDescription || "";

    if (selectedEquipment.equipmentPhoto) {
      photoPreview.src = selectedEquipment.equipmentPhoto;
      photoPreview.alt = `Photo of ${selectedEquipment.equipmentName}`;
      photoPreview.hidden = false;
      photoPlaceholder.hidden = true;
    } else {
      photoPreview.removeAttribute("src");
      photoPreview.alt = "Equipment photo preview";
      photoPreview.hidden = true;
      photoPlaceholder.hidden = false;
    }

    equipmentDetailsDialog.close();
    equipmentEditDialog.showModal();
  });

  equipmentEditDialog.querySelectorAll("[data-close-equipment-edit]").forEach((button) => {
    button.addEventListener("click", () => equipmentEditDialog.close());
  });

  equipmentEditDialog.addEventListener("click", (event) => {
    if (event.target === equipmentEditDialog) equipmentEditDialog.close();
  });
}
