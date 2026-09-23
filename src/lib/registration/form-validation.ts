type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// Keep the HTML constraints as the source of truth, but show persistent errors
// on the page instead of relying on a browser's short-lived validation bubble.
export function registrationValidation(form: HTMLFormElement, summary: HTMLElement) {
  const errors = new Map<Control, HTMLElement>();
  let nextId = 0;
  form.noValidate = true;

  function clear(control: Control) {
    const error = errors.get(control);
    if (!error) return;
    const describedBy = (control.getAttribute("aria-describedby") ?? "")
      .split(/\s+/).filter(id => id && id !== error.id).join(" ");
    if (describedBy) control.setAttribute("aria-describedby", describedBy);
    else control.removeAttribute("aria-describedby");
    control.removeAttribute("aria-invalid");
    error.remove();
    errors.delete(control);
  }

  function message(control: Control) {
    if (control.validity.valueMissing) {
      if (control.type === "file") return "Add a profile photo for this child before signing.";
      if (control.type === "checkbox") return "Tick this box to continue.";
      if (control.type === "radio") return control.name === "plan" ? "Choose club membership, the Cup, or both." : "Choose yes or no for photos and video.";
      if (control instanceof HTMLSelectElement) return "Choose a training rhythm.";
      return "Please fill in this field.";
    }
    if (control.validity.typeMismatch && control.type === "email") return "Enter a valid email address, for example name@example.com.";
    if (control.validity.rangeOverflow && control.type === "date") return "Date of birth cannot be in the future.";
    return control.validationMessage;
  }

  function show(control: Control) {
    let error = errors.get(control);
    if (!error) {
      error = document.createElement("p");
      error.id = `registration-field-error-${nextId++}`;
      error.className = "mt-2 text-sm font-bold text-alert";
      (control.closest("label") ?? control).insertAdjacentElement("afterend", error);
      errors.set(control, error);
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("aria-describedby", [control.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
    }
    error.textContent = message(control);
  }

  function refresh() {
    for (const control of errors.keys()) {
      if (!form.contains(control) || !control.willValidate || control.validity.valid) clear(control);
      else show(control);
    }
    if (!errors.size) summary.textContent = "";
  }
  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  // Removing an optional guardian or sibling can also resolve its errors.
  form.addEventListener("click", refresh);

  return {
    reset() {
      for (const control of errors.keys()) clear(control);
      summary.textContent = "";
    },
    validate() {
      refresh();
      const invalid = Array.from(form.querySelectorAll<Control>("input,select,textarea"))
        .filter(control => control.willValidate && !control.validity.valid);
      invalid.forEach(show);
      const first = invalid[0];
      if (!first) return true;
      summary.textContent = "Please check the highlighted fields. We've taken you to the first one.";
      first.focus({ preventScroll: true });
      (first.closest("label") ?? first).scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      });
      return false;
    },
  };
}
